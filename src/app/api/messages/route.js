import { NextResponse } from "next/server";
import { connectionDb } from "@/config/db_config";
import Message from "@/models/message.model";
import User from "@/models/users.model";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET(request) {
	try {
		await connectionDb();
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value;
		if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const decoded = verify(token, process.env.TOKEN_SECRET);
		const currentUserId = decoded.id;

		const { searchParams } = new URL(request.url);
		const otherUserId = searchParams.get("userId");

		let query = {
			$or: [{ sender: currentUserId }, { receiver: currentUserId }],
		};

		if (otherUserId) {
			query = {
				$or: [
					{ sender: currentUserId, receiver: otherUserId },
					{ sender: otherUserId, receiver: currentUserId },
				],
			};
		}

		const messages = await Message.find(query)
			.populate("sender", "full_name email")
			.populate("receiver", "full_name email")
			.sort({ createdAt: 1 });

		return NextResponse.json({ messages }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		await connectionDb();
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value;
		if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const decoded = verify(token, process.env.TOKEN_SECRET);
		const sender = decoded.id;

		const { receiver, content } = await request.json();
		if (!receiver || !content) {
			return NextResponse.json({ error: "Receiver and content are required" }, { status: 400 });
		}

		const message = await Message.create({ sender, receiver, content });
		return NextResponse.json({ message }, { status: 201 });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
