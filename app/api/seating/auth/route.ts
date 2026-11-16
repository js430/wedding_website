import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { SEATING_COOKIE, signSeating } from "@/lib/seating-auth";

function passwordMatches(given: unknown, expected: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  if (!process.env.SEATING_PASSWORD) {
    return NextResponse.json({ error: "SEATING_PASSWORD not configured" }, { status: 500 });
  }

  if (!passwordMatches(password, process.env.SEATING_PASSWORD)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SEATING_COOKIE, signSeating(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
