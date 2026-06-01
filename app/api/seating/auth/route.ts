import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.SEATING_PASSWORD) {
    return NextResponse.json({ error: "SEATING_PASSWORD not configured" }, { status: 500 });
  }

  if (password !== process.env.SEATING_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("seating_auth", "true", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
