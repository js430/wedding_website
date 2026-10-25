import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/event";

// Generated per request, not prerendered: Next's static route-handler cache
// serializes the body in a way that drops the CR of each CRLF, and it would
// also freeze DTSTAMP at build time.
export const dynamic = "force-dynamic";

/** Serves the wedding as a downloadable .ics file. */
export async function GET() {
  // Encode to bytes: handing NextResponse a string strips the CR of each
  // CRLF, and RFC 5545 requires CRLF (Outlook rejects LF-only files).
  const body = new TextEncoder().encode(buildIcs());

  return new NextResponse(body, {
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jeffrey-and-katie-wedding.ics"',
      "Content-Length":      String(body.byteLength),
      "Cache-Control":       "public, max-age=3600",
    },
  });
}
