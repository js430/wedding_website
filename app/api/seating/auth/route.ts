import { NextRequest, NextResponse } from "next/server";
import { SEATING_COOKIE, signSeating } from "@/lib/seating-auth";
import { checkSecret } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  const denied = checkSecret(req, "seating", password, process.env.SEATING_PASSWORD, "SEATING_PASSWORD");
  if (denied) return denied;

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
