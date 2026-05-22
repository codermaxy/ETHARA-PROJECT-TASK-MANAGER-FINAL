import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectionDb } from "@/config/db_config.js";
import UsersModel from "@/models/users.model";
import SessionModel from "@/models/session.model"; // ✅ added

/**
 * Clear BOTH auth cookies
 */
const clearAuthCookies = (response) => {
	response.cookies.set("token", "", {
		httpOnly: true,
		expires: new Date(0),
		path: "/",
	});

	response.cookies.set("sessionId", "", {
		httpOnly: true,
		expires: new Date(0),
		path: "/",
	});

	return response;
};

/**
 * Normalize path
 */
const normalizePath = (path) => {
	if (!path) return "/";
	if (path.length > 1 && path.endsWith("/")) {
		return path.slice(0, -1);
	}
	return path;
};

/**
 * Handle CORS
 */
function handleCors(request, response) {
	const origin = request.headers.get("origin") || "";

	const allowedOrigins = [
		process.env.DOMAIN_URL,
		process.env.NEXT_PUBLIC_BASE_URL,
		"http://localhost:3000",
	].filter(Boolean);

	if (
		allowedOrigins.includes(origin) ||
		process.env.NODE_ENV === "development"
	) {
		response.headers.set("Access-Control-Allow-Origin", origin || "*");
	}

	response.headers.set(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, PATCH, OPTIONS",
	);
	response.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	);

	return response;
}

export default async function proxy(request) {
	const currentPath = request.nextUrl.pathname;




	if (currentPath.startsWith("/api/")) {
		if (request.method === "OPTIONS") {
			return handleCors(request, new NextResponse(null, { status: 204 }));
		}
		return handleCors(request, NextResponse.next());
	}

	const accessToken = request.cookies.get("token")?.value;
	const sessionId = request.cookies.get("sessionId")?.value;

	const normalizedPath = normalizePath(currentPath);

	const publicPaths = [
		"/auth/login",
		"/auth/signup",
		"/auth/admin-signup",
		"/auth/register",
		"/auth/reset-email",
		"/auth/reset-password",
		"/auth/verify-email",
		"/unauthorized",
	];

	const isPublicRoute = publicPaths.some(
		(path) => normalizePath(path) === normalizedPath,
	);

	const buildLoginUrl = () => {
		const loginUrl = new URL("/auth/login", request.url);
		loginUrl.searchParams.set("callbackUrl", currentPath);
		return loginUrl;
	};




	if (isPublicRoute) {

		const isLoginPage = normalizedPath === "/auth/login" || normalizedPath === "/auth/signup" || normalizedPath === "/auth/admin-signup";

		if (accessToken && sessionId && isLoginPage) {
			try {
				const decoded = jwt.verify(accessToken, process.env.TOKEN_SECRET);

				await connectionDb();
				const user = await UsersModel.findById(decoded.id)
					.select("isAdmin")
					.lean();

				if (user?.isAdmin) {
					return NextResponse.redirect(
						new URL("/admin/dashboard", request.url),
					);
				}

				return NextResponse.redirect(new URL("/", request.url));
			} catch (error) {
				return clearAuthCookies(NextResponse.next());
			}
		}
		return NextResponse.next();
	}






	if (!accessToken || !sessionId) {
		return NextResponse.redirect(buildLoginUrl());
	}

	let decoded;
	try {
		decoded = jwt.verify(accessToken, process.env.TOKEN_SECRET);
	} catch (error) {
		return clearAuthCookies(NextResponse.redirect(buildLoginUrl()));
	}

	try {
		await connectionDb();

		const user = await UsersModel.findById(decoded.id)
			.select("isAdmin role email")
			.lean();

		if (!user) {
			return clearAuthCookies(NextResponse.redirect(buildLoginUrl()));
		}




		try {
			const session = await SessionModel.findById(sessionId);

			if (session) {
				const now = Date.now();
				const last = new Date(session.lastActive).getTime();


				if (now - last > 30000) {
					await SessionModel.findByIdAndUpdate(sessionId, {
						lastActive: new Date(),
					});
				}
			}
		} catch (err) {
			console.error("Session update failed:", err.message);
		}





		if (normalizedPath.startsWith("/admin")) {
			if (user.role !== "admin" && !user.isAdmin) {
				return NextResponse.redirect(new URL("/unauthorized", request.url));
			}
			return NextResponse.next();
		}

		if (normalizedPath.startsWith("/member")) {
			if (user.role !== "member" && !user.isAdmin) {
				return NextResponse.redirect(new URL("/unauthorized", request.url));
			}
			return NextResponse.next();
		}


		if (normalizedPath === "/") {
			if (user.isAdmin) {
				return NextResponse.redirect(new URL("/admin/dashboard", request.url));
			}
			return NextResponse.redirect(new URL("/member/dashboard", request.url));
		}

		return NextResponse.next();
	} catch (error) {
		console.error("Proxy error:", error);
		return clearAuthCookies(NextResponse.redirect(buildLoginUrl()));
	}
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
