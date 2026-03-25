import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getKukaxiPublicBaseUrl } from "@/lib/kukaxi-api";
import { normalizePublicBaseForFiles, storageImagePublicUrl } from "@/lib/storage-public-url";

export const dynamic = "force-dynamic";

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

  const targetUrl = storageImagePublicUrl(getKukaxiPublicBaseUrl(), raw);
  if (!targetUrl) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 });
  }

  const authHeaders = { Authorization: `Bearer ${session.user.token}` };
  let upstream = await fetch(targetUrl, {
    headers: authHeaders,
    redirect: "follow",
  });

  if (!upstream.ok && upstream.status === 404 && !/^https?:\/\//i.test(raw)) {
    const fileBase = normalizePublicBaseForFiles(getKukaxiPublicBaseUrl());
    const tail = raw
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");
    if (tail) {
      const alt = `${fileBase}/${tail}`;
      if (alt !== targetUrl) {
        const second = await fetch(alt, { headers: authHeaders, redirect: "follow" });
        if (second.ok) upstream = second;
      }
    }
  }

  if (!upstream.ok) {
    return NextResponse.json({ message: "Upstream error" }, { status: upstream.status });
  }

  const res = new NextResponse(upstream.body, { status: upstream.status });
  const ct = upstream.headers.get("content-type");
  if (ct) res.headers.set("content-type", ct);
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return res;
}
