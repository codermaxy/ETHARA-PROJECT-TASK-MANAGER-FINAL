import { NextResponse } from "next/server";
import UsersModel from "@/models/users.model";
import logger from "@/logger/logger";
import { connectionDb } from "@/config/db_config";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/schema/register.schema";
import { sendEmail } from "@/utils/mailer";

export async function POST(request, response) {
	try {
		await connectionDb();
		const reqBody = await request.json();
		const parsed_data = registerSchema.safeParse(reqBody);
		if (!parsed_data.success) {
			const error = parsed_data.error.issues[0]?.message;
			return NextResponse.json({ errors: error }, { status: 400 });
		}
		const {
			username,
			name,
			email,
			password,
			role,
			company,
			job_title,
			department,
		} = parsed_data.data;
		const userExists = await UsersModel.findOne({
			$or: [{ email }, { username }],
		});
		if (userExists) {
			return NextResponse.json(
				{
					message: `User already exists with ${username}`,
				},
				{ status: 409 },
			);
		}

		if (role === "admin") {
			const admin_count = await UsersModel.countDocuments({
				company,
				role: "admin",
			});
			if (admin_count >= 2) {
				return NextResponse.json(
					{ errors: "Cannot add more than 2 admins within the same company" },
					{ status: 409 },
				);
			}
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const newUser = new UsersModel({
			username,
			full_name: name,
			email,
			password: hashedPassword,
			role,
			company,
			job_title,
			department,
			isverified: true,
			isAdmin: role === "admin",
		});
		const saved_user = await newUser.save();
		const user_response = await UsersModel.findById(saved_user._id).select(
			"-password",
		);
		logger.info(`User registered successfully: ${saved_user._id}`);
		if (role === "admin") {
			try {
				await sendEmail({
					email,
					emailType: "VERIFY",
					userId: saved_user._id,
					username,
				});
				console.log("Verification email sent to:", email);
			} catch (emailError) {
				logger.error("Failed to send verification email:", emailError);
				console.error("Email sending failed but user was created.");
			}
		}

		return NextResponse.json(
			{
				message: "User created successfully",
				success: true,
				user_response,
			},
			{ status: 201 },
		);
	} catch (error) {
		logger.error("Error in registration:", error);
		return NextResponse.json(
			{
				message: "Internal server error",
				error: error.message,
			},
			{ status: 500 },
		);
	}
}
