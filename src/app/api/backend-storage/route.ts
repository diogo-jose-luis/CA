import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getKukaxiPublicBaseUrl } from "@/lib/kukaxi-api";
import { expandStoragePathCandidates, storageImagePublicUrl } from "@/lib/storage-public-url";

export const dynamic = "force-dynamic";

async function fetchUpstream(
  url: string,
  headers: HeadersInit,
): Promise<Response> {
  return fetch(url, { headers, redirect: "follow" });
}

/**
 * Proxy same-origin para ficheiros em `/storage` na API, com Bearer da sessão.
 * Em produção (Vercel / WebView), `<img src="https://api…/storage/…">` falha comum
 * por referer, cookies ou ficheiros protegidos — este endpoint reutiliza o token como `/api/backend`.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("p") ?? "";
  if (!raw.trim() || raw.includes("..")) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const session = await getSession();
  if (!session?.user?.token) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const apiBase = getKukaxiPublicBaseUrl();
  const candidates = expandStoragePathCandidates(raw);
  const token = session.user.token;
  const ua = request.headers.get("user-agent");
  const forwardHeaders = (withAuth: boolean): HeadersInit => {
    const h: Record<string, string> = {};
    if (withAuth) h.Authorization = `Bearer ${token}`;
    if (ua) h["User-Agent"] = ua;
    return h;
  };

  let upstream: Response | null = null;
  let lastStatus = 404;

  outer: for (const withAuth of [true, false]) {
    for (const c of candidates) {
      const targetUrl = storageImagePublicUrl(apiBase, c);
      if (!targetUrl) continue;
      const res = await fetchUpstream(targetUrl, forwardHeaders(withAuth));
      lastStatus = res.status;
      if (res.ok) {
        upstream = res;
        break outer;
      }
      await res.arrayBuffer().catch(() => {});
    }
  }

  if (!upstream?.ok) {
    return NextResponse.json({ message: "Upstream error" }, { status: lastStatus });
  }

  const res = new NextResponse(upstream.body, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return res;
}
