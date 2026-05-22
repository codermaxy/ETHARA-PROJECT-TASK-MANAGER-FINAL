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
			return NextResponse.json({ projects: [] });
		}

		const projects = await Project.find({ teamId: user.teamId })
			.populate("createdBy", "full_name email role job_title department company")
			.sort({ createdAt: -1 });

		const projectsWithStats = await Promise.all(
			projects.map(async (project) => {
				const [totalTasks, todoTasks, inProgressTasks, doneTasks] = await Promise.all([
					Task.countDocuments({ projectId: project._id }),
					Task.countDocuments({ projectId: project._id, status: "todo" }),
					Task.countDocuments({ projectId: project._id, status: "in-progress" }),
					Task.countDocuments({ projectId: project._id, status: "done" }),
				]);
				return {
					_id: project._id,
					name: project.name,
					description: project.description,
					createdBy: project.createdBy,
					createdAt: project.createdAt,
					stats: {
						total: totalTasks,
						todo: todoTasks,
						inProgress: inProgressTasks,
						done: doneTasks,
						progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
					},
				};
			})
		);

		return NextResponse.json({ projects: projectsWithStats });
	} catch (error) {
		console.error("Fetch member projects API error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
