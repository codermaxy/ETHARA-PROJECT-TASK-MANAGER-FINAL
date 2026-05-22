import { NextResponse } from "next/server";
import { connectionDb } from "@/config/db_config";
import Task from "@/models/task.model";
import Project from "@/models/projects.model";
import User from "@/models/users.model";
import Team from "@/models/teams.model";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

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
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (!user.teamId) {
			return NextResponse.json({
				team: null,
				members: [],
			});
		}

		const team = await Team.findById(user.teamId)
			.populate("createdBy", "full_name email role job_title department company")
			.populate("members", "full_name email role job_title department company");

		if (!team) {
			return NextResponse.json({
				team: null,
				members: [],
			});
		}

		return NextResponse.json({
			team: {
				_id: team._id,
				name: team.name,
				createdBy: team.createdBy,
				createdAt: team.createdAt,
			},
			members: team.members || [],
		});
	} catch (error) {
		console.error("Fetch member team API error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
