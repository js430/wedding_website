import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { record, flush, readAll, isBot, trackablePath } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** POST — count one page view. Fire-and-forget from the browser. */
export async function POST(req: NextRequest) {
  // A page view is a few bytes; refuse anything bigger without reading it.
  if (Number(req.headers.get("content-length") ?? 0) > 2048) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }
  const body = await req.json().catch(() => null);
  const path = body && typeof body === "object" ? (body as { path?: unknown }).path : "";

  if (isBot(req.headers.get("user-agent") ?? "")) {
    return NextResponse.json({ ok: true });
  }

  const clean = trackablePath(typeof path === "string" ? path : "");
  if (clean) {
    record(clean);
    // Flushes on its own schedule; this just gives it a chance to run.
    // Not awaited, so the guest's request never waits on Notion.
    void flush().catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

/** GET — the dashboard's data, behind the admin password. */
export async function GET(req: NextRequest) {
  const denied = checkAdmin(req);
  if (denied) return denied;

  // Write out anything buffered so the dashboard shows the latest.
  await flush(true).catch(() => {});
  return NextResponse.json({ rows: await readAll() });
}
