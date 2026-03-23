// Gestão de sessão via cookie (substitui NextAuth session)

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { AuthUser, Session } from "@/types/auth";

export const SESSION_COOKIE = "ca_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias em segundos

function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

/** API/servidor podem enviar `nivel`, `tipo`, etc. como string; `includes(5)` falha com `"5"`. */
export function normalizeSessionUser(user: AuthUser): AuthUser {
  const toInt = (v: unknown, fallback = 0): number => {
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  };
  /** Cookie/API podem serializar IDs como string ou `""`; o tipo declara só `number | null`. */
  const org = user.organizacao_id as number | string | null | undefined;
  const organizacao_id =
    org === null || org === undefined || org === ""
      ? null
      : toInt(org, 0);

  return {
    ...user,
    id: toInt(user.id, 0),
    nivel: toInt(user.nivel, 0),
    tipo: toInt(user.tipo, 0),
    cargo_id: toInt(user.cargo_id, 0),
    organizacao_id,
  };
}

function normalizeSession(session: Session): Session {
  return { user: normalizeSessionUser(session.user) };
}

function decodeSession(value: string): Session | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const data = JSON.parse(json) as Session;
    if (data?.user?.token) return normalizeSession(data);
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

const secureCookies =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

/** Preferir isto em Route Handlers: encoding e Secure em produção ficam corretos no Vercel. */
export function applySessionCookie(res: NextResponse, session: Session) {
  const value = encodeSession(session);
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
    secure: secureCookies,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    secure: secureCookies,
  });
}
