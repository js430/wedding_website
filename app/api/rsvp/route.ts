import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Log the RSVP — swap this out for a database, email service, or Google Sheets API
  console.log("[RSVP]", new Date().toISOString(), body);

  // Example: send to a webhook (e.g. Discord, Slack, Make.com, Zapier)
  // const webhook = process.env.RSVP_WEBHOOK_URL;
  // if (webhook) {
  //   await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  // }

  return NextResponse.json({ ok: true });
}
