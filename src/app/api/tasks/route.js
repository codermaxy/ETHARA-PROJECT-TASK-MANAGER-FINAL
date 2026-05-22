import { NextResponse } from "next/server";
import { connectionDb } from "@/config/db_config";
import Task from "@/models/task.model";
import User from "@/models/users.model";
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

		if (!user || (user.role !== "admin" && !user.isAdmin)) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const projectId = searchParams.get("projectId");

		const query = projectId ? { projectId } : {};

		const tasks = await Task.find(query)
			.populate("assignedTo", "full_name email")
			.populate("projectId", "name")
			.sort({ createdAt: -1 });

		return NextResponse.json({ tasks }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		await connectionDb();
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value;

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const decoded = verify(token, process.env.TOKEN_SECRET);
		const user = await User.findById(decoded.id);

		if (!user || (user.role !== "admin" && !user.isAdmin)) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		const body = await request.json();
		const { title, description, status, priority, projectId, dueDate } = body;

		if (!title || !projectId) {
			return NextResponse.json(
				{ error: "Title and projectId are required" },
				{ status: 400 },
			);
		}

		// ── Team-wise assignment: create one task per selected member ──────────
		if (body.assignToTeam && Array.isArray(body.memberIds) && body.memberIds.length > 0) {
			const created = await Promise.all(
				body.memberIds.map((memberId) =>
					Task.create({
						title,
						description,
						status: status || "todo",
						priority: priority || "Medium",
						assignedTo: memberId,
						projectId,
						dueDate,
					})
				)
			);

			const populated = await Task.find({ _id: { $in: created.map((t) => t._id) } })
				.populate("assignedTo", "full_name email")
				.populate("projectId", "name");

			return NextResponse.json({ tasks: populated, count: populated.length }, { status: 201 });
		}

		// ── Single assignment ──────────────────────────────────────────────────
		if (!body.assignedTo) {
			return NextResponse.json(
				{ error: "assignedTo is required for single assignment" },
				{ status: 400 },
			);
		}

		const task = await Task.create({
			title,
			description,
			status: status || "todo",
			priority: priority || "Medium",
			assignedTo: body.assignedTo,
			projectId,
			dueDate,
		});

		const populatedTask = await Task.findById(task._id)
			.populate("assignedTo", "full_name email")
			.populate("projectId", "name");

		return NextResponse.json({ task: populatedTask }, { status: 201 });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
