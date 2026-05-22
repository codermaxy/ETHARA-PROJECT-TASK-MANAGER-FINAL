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
		if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const decoded = verify(token, process.env.TOKEN_SECRET);
		const user = await User.findById(decoded.id).populate("teamId", "name");
		if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

		const memberId = user._id;

		const [totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks, highTasks, mediumTasks, lowTasks] = await Promise.all([
			Task.countDocuments({ assignedTo: memberId }),
			Task.countDocuments({ assignedTo: memberId, status: "todo" }),
			Task.countDocuments({ assignedTo: memberId, status: "in-progress" }),
			Task.countDocuments({ assignedTo: memberId, status: "done" }),
			Task.countDocuments({ assignedTo: memberId, status: { $ne: "done" }, dueDate: { $lt: new Date() } }),
			Task.countDocuments({ assignedTo: memberId, priority: "High" }),
			Task.countDocuments({ assignedTo: memberId, priority: "Medium" }),
			Task.countDocuments({ assignedTo: memberId, priority: "Low" }),
		]);

		// Recent 5 tasks
		const recentTasks = await Task.find({ assignedTo: memberId })
			.populate("projectId", "name")
			.sort({ updatedAt: -1 })
			.limit(5);

		// Monthly task completion for last 6 months
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
		sixMonthsAgo.setDate(1);
		sixMonthsAgo.setHours(0, 0, 0, 0);

		const tasksByMonth = await Task.aggregate([
			{ $match: { assignedTo: memberId, createdAt: { $gte: sixMonthsAgo } } },
			{
				$group: {
					_id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, status: "$status" },
					count: { $sum: 1 },
				},
			},
			{ $sort: { "_id.year": 1, "_id.month": 1 } },
		]);

		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const progressMap = {};
		for (let i = 0; i < 6; i++) {
			const d = new Date();
			d.setMonth(d.getMonth() - (5 - i));
			const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
			progressMap[key] = { month: monthNames[d.getMonth()], todo: 0, inProgress: 0, done: 0 };
		}
		for (const e of tasksByMonth) {
			const key = `${e._id.year}-${e._id.month}`;
			if (!progressMap[key]) continue;
			if (e._id.status === "todo") progressMap[key].todo = e.count;
			else if (e._id.status === "in-progress") progressMap[key].inProgress = e.count;
			else if (e._id.status === "done") progressMap[key].done = e.count;
		}

		return NextResponse.json({
			user: {
				_id: user._id,
				full_name: user.full_name,
				email: user.email,
				job_title: user.job_title,
				department: user.department,
				team: user.teamId,
			},
			stats: { totalTasks, todoTasks, inProgressTasks, doneTasks, overdueTasks, highTasks, mediumTasks, lowTasks },
			taskProgress: Object.values(progressMap),
			recentTasks,
		});
	} catch (error) {
		console.error("Member dashboard error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
