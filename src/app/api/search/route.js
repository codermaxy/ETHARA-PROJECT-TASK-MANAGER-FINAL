import { NextResponse } from "next/server";
import { connectionDb } from "@/config/db_config";
import User from "@/models/users.model";
import Team from "@/models/teams.model";
import Project from "@/models/projects.model";
import Task from "@/models/task.model";
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

		let decoded;
		try {
			decoded = verify(token, process.env.TOKEN_SECRET);
		} catch {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const user = await User.findById(decoded.id);
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const { searchParams } = new URL(request.url);
		const q = searchParams.get("q") || "";

		if (!q.trim()) {
			return NextResponse.json({ tasks: [], projects: [] });
		}

		const queryRegex = new RegExp(q, "i");

		if (user.role === "admin" || user.isAdmin) {
			// Admin can search all tasks and projects
			const projects = await Project.find({ name: queryRegex })
				.populate("teamId", "name")
				.limit(10);

			const tasks = await Task.find({ title: queryRegex })
				.populate("projectId", "name")
				.populate("assignedTo", "full_name email")
				.limit(10);

			return NextResponse.json({ tasks, projects });
		} else {
			// Member can search tasks assigned to them
			const tasks = await Task.find({
				assignedTo: user._id,
				title: queryRegex
			})
				.populate("projectId", "name")
				.limit(10);

			// Find projects related to the user's tasks that match the query name
			// 1. Get all project IDs from the user's assigned tasks
			const userTasks = await Task.find({ assignedTo: user._id }).select("projectId");
			const projectIds = [...new Set(userTasks.map(t => t.projectId?.toString()).filter(Boolean))];

			const projects = await Project.find({
				_id: { $in: projectIds },
				name: queryRegex
			})
				.populate("teamId", "name")
				.limit(10);

			return NextResponse.json({ tasks, projects });
		}
	} catch (error) {
		console.error("Search API Error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
