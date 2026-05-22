import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema } from "@/schema/login.schema";
import UsersModel from "@/models/users.model";
import SessionModel from "@/models/session.model";
import { connectionDb } from "@/config/db_config";
import { UAParser } from "ua-parser-js";

export async function POST(request) {
	try {
		await connectionDb();

		const reqBody = await request.json();
		const parsedData = loginSchema.parse(reqBody);
		const { password } = parsedData;
		const selectedRole = reqBody.role;
		const email = "email" in parsedData ? parsedData.email : undefined;
		const username = "username" in parsedData ? parsedData.username : undefined;

		const query = email ? { email } : { username };
		const existingUser = await UsersModel.findOne(query);

		if (!existingUser) {
			return NextResponse.json(
				{ message: "User does not exist" },
				{ status: 400 },
			);
		}


		if (selectedRole && existingUser.role !== selectedRole) {
			return NextResponse.json(
				{ message: `Access denied: This account is registered as a ${existingUser.role}, not a ${selectedRole}.` },
				{ status: 403 },
			);
		}


		if (existingUser.role === "admin" && !existingUser.isAdmin) {
			existingUser.isAdmin = true;
			await existingUser.save();
			console.log("Auto-fixed isAdmin status for:", existingUser.email);
		}

		if (!existingUser.isverified) {
			return NextResponse.json(
				{
					message: "Please verify your email before logging in",
					isVerified: false,
				},
				{ status: 403 },
			);
		}

		const validPassword = await bcrypt.compare(password, existingUser.password);

		if (!validPassword) {
			return NextResponse.json({ message: "Wrong password!" }, { status: 400 });
		}


		const tokenData = {
			id: existingUser._id,
			role: existingUser.role,
			isAdmin: existingUser.isAdmin,
		};

		const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, {
			expiresIn: "1d",
		});

		const refreshToken = jwt.sign(tokenData, process.env.TOKEN_SECRET, {
			expiresIn: "5d",
		});


		await UsersModel.findByIdAndUpdate(existingUser._id, {
			refreshToken,
		});





		const ua = new UAParser(request.headers.get("user-agent"));
		const device = ua.getDevice().model || "Desktop";
		const browser = ua.getBrowser().name || "Unknown";

		const ip =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"unknown";


		await SessionModel.updateMany(
			{ userId: existingUser._id },
			{ isCurrent: false },
		);


		const session = await SessionModel.create({
			userId: existingUser._id,
			device,
			browser,
			ip,
			location: "Unknown",
			isCurrent: true,
		});


		const sessions = await SessionModel.find({
			userId: existingUser._id,
		}).sort({ createdAt: -1 });


		if (sessions.length > 5) {
			const sessionsToDelete = sessions.slice(5);

			const ids = sessionsToDelete.map((s) => s._id);

			await SessionModel.deleteMany({
				_id: { $in: ids },
			});
		}





		const response = NextResponse.json({
			message: "Logged In Successfully",
			success: true,
			user: {
				id: existingUser._id,
				username: existingUser.username,
				full_name: existingUser.full_name,
				email: existingUser.email,
				role: existingUser.role,
				isAdmin: existingUser.isAdmin,
				company: existingUser.company,
				joined: existingUser.createdAt,
			},
			sessionId: session._id,
		});

		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV !== "development",
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 24, // 1 day
		});

		response.cookies.set("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV !== "development",
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 24 * 5, // 5 days
		});

		response.cookies.set("sessionId", session._id.toString(), {
			httpOnly: true,
			secure: process.env.NODE_ENV !== "development",
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 24 * 5, // 5 days
		});

		return response;
	} catch (error) {
		console.error("Login error detail:", error);
		return NextResponse.json(
			{ message: error.message || "Internal server error" },
			{ status: 500 },
		);
	}
}
