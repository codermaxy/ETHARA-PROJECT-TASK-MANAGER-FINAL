import { NextResponse } from "next/server";
import { connectionDb } from "@/config/db_config";
import User from "@/models/users.model";
import Team from "@/models/teams.model";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/schema/register.schema";

// ── Auth helper ──────────────────────────────────────────────────────────────
async function requireAdmin() {
	const cookieStore = await cookies();
	const token = cookieStore.get("token")?.value;
	if (!token) return null;
	const decoded = verify(token, process.env.TOKEN_SECRET);
	const user = await User.findById(decoded.id);
	if (!user || (user.role !== "admin" && !user.isAdmin)) return null;
	return user;
}

// ── GET /api/users  (paginated list) ─────────────────────────────────────────
export async function GET(request) {
	try {
		await connectionDb();
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value;

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const decoded = verify(token, process.env.TOKEN_SECRET);
		const user = await User.findById(decoded.id);

		if (!user) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
		const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
		const search = searchParams.get("search") || "";
		const skip = (page - 1) * limit;

		let query = {};
		if (user.role === "admin" || user.isAdmin) {
			// Admin can see everyone
			query = {}; 
		} else {
			// Members can only see Admins (to chat with support/management)
			query = { role: "admin" };
		}
		if (search) {
			query.$or = [
				{ full_name: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
				{ department: { $regex: search, $options: "i" } },
			];
		}

		const [users, total] = await Promise.all([
			User.find(query)
				.select("-password -refreshToken -forgotpasswordtoken -verifytoken")
				.populate("teamId", "name")
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit),
			User.countDocuments(query),
		]);

		return NextResponse.json(
			{ users, total, page, limit, totalPages: Math.ceil(total / limit) },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Users GET Error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

// ── POST /api/users  (create single or bulk) ─────────────────────────────────
export async function POST(request) {
	try {
		await connectionDb();
		const admin = await requireAdmin();
		if (!admin) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		const body = await request.json();

		// Bulk: array of users
		const isBulk = Array.isArray(body);
		const entries = isBulk ? body : [body];

		const results = { created: [], failed: [] };

		for (const entry of entries) {
			// Validate with zod schema
			const parsed = registerSchema.safeParse({ ...entry, role: "member" });
			if (!parsed.success) {
				results.failed.push({
					entry,
					error: parsed.error.issues[0]?.message || "Validation failed",
				});
				continue;
			}

			const { username, name, email, password, company, job_title, department } = parsed.data;

			const exists = await User.findOne({ $or: [{ email }, { username }] });
			if (exists) {
				results.failed.push({ entry, error: `User already exists: ${email}` });
				continue;
			}

			const hashedPassword = await bcrypt.hash(password, 10);
			const newUser = await User.create({
				username,
				full_name: name,
				email,
				password: hashedPassword,
				role: "member",
				company: company || admin.company,
				job_title,
				department,
				isverified: true, // admin-created users are pre-verified
			});

			const safe = await User.findById(newUser._id).select(
				"-password -refreshToken -forgotpasswordtoken -verifytoken",
			);
			results.created.push(safe);
		}

		const status = results.created.length > 0 ? 201 : 400;
		return NextResponse.json(results, { status });
	} catch (error) {
		console.error("Users POST Error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
