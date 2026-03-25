import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getKukaxiApiRequestBaseUrl } from "@/lib/kukaxi-api";

export const dynamic = "force-dynamic";

function invalidPath(segments: string[]) {
  return (
    segments.length === 0 ||
    segments.some((p) => p === "" || p.includes(".."))
  );
}

/** Rotas da API que o browser pode chamar sem sessão Next (ex.: login cria o token). */
function allowsAnonymousProxy(segments: string[], method: string): boolean {
  const first = segments[0]?.toLowerCase() ?? "";
  if (first === "login" && method === "POST") return true;
  if (first === "sanctum") return true;
  if (first === "register" && method === "POST") return true;
  return false;
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  if (invalidPath(pathSegments)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const session = await getSession();
  const token = session?.user?.token;
  const isPublic = allowsAnonymousProxy(pathSegments, request.method);
  if (!isPublic && !token) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const root = getKukaxiApiRequestBaseUrl();
  const sub = pathSegments.join("/");
  const url = `${root}/${sub}${request.nextUrl.search}`;

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const accept = request.headers.get("accept");
  if (accept) headers.set("Accept", accept);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const method = request.method;
  const init: RequestInit = {
    method,
    headers,
    redirect: "follow",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength) init.body = body;
  }

  const upstream = await fetch(url, init);
  const res = new NextResponse(upstream.body, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}
