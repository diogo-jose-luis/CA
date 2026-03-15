// Gestão de sessão via cookie (substitui NextAuth session)

import { cookies } from "next/headers";
import type { Session } from "@/types/auth";

export const SESSION_COOKIE = "ca_session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 dias em segundos

function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

function decodeSession(value: string): Session | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const data = JSON.parse(json) as Session;
    if (data?.user?.token) return data;
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return decodeSession(value);
}

export function sessionCookieHeader(session: Session): string {
  const value = encodeSession(session);
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; HttpOnly`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}
