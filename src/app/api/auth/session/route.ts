import { NextResponse } from "next/server";
import { getSession, sessionCookieHeader } from "@/lib/session";
import type { AuthUser } from "@/types/auth";

// GET: devolve a sessão atual (a partir do cookie)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ session: null }, { status: 200 });
  }
  return NextResponse.json({ session });
}

// POST: define a sessão (após login no backend) e define o cookie
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, token } = body as { user: AuthUser; token: string };
    if (!user || !token) {
      return NextResponse.json(
        { error: "user and token are required" },
        { status: 400 }
      );
    }
    const session = {
      user: {
        ...user,
        token,
      },
    };
    const cookieHeader = sessionCookieHeader(session);
    const res = NextResponse.json({ session });
    res.headers.set("Set-Cookie", cookieHeader);
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
