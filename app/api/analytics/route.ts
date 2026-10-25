import { NextRequest, NextResponse } from "next/server";
import { record, flush, readAll, isBot, trackablePath } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** POST — count one page view. Fire-and-forget from the browser. */
export async function POST(req: NextRequest) {
  const { path } = await req.json().catch(() => ({ path: "" }));

  if (isBot(req.headers.get("user-agent") ?? "")) {
    return NextResponse.json({ ok: true });
  }

  const clean = trackablePath(typeof path === "string" ? path : "");
  if (clean) {
    record(clean);
    // Flushes on its own schedule; this just gives it a chance to run.
    await flush().catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

/** GET — the dashboard's data, behind the admin password. */
export async function GET(req: NextRequest) {
  const given = req.headers.get("x-admin-password") ?? "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  if (given !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Write out anything buffered so the dashboard shows the latest.
  await flush(true).catch(() => {});
  return NextResponse.json({ rows: await readAll() });
}
