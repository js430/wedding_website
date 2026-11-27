import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { Client } from "@notionhq/client";
import { Resend } from "resend";
import { buildEditUrl, editingClosed, formatDeadline } from "@/lib/rsvp-token";
import { allow } from "@/lib/rate-limit";
import { clientKey } from "@/lib/invite-guard";
import { cleanEmail, escapeHtml } from "@/lib/input";
import { C, button, emailLayout, greeting, para, signoff } from "@/lib/email-layout";

export const dynamic = "force-dynamic";

/**
 * Re-send a guest their RSVP edit link, matched on the email they RSVPed with.
 *
 * The response is deliberately identical whether or not that email is in the
 * guest list, so this cannot be used to test who was invited.
 */

const WINDOW_MS   = 15 * 60 * 1000;
const PER_EMAIL   = 3;   // a guest retrying is fine; a script hammering one address is not
const PER_CLIENT  = 10;  // across all addresses from one IP

function buildResendEmail(name: string, editUrl: string): { html: string; text: string } {
  const closed = editingClosed();
  const intro = closed
    ? `Here's your personal link to view your RSVP. Changes closed at the end of <strong style="color:${C.darkest};">${escapeHtml(formatDeadline())}</strong>; if something needs fixing, just reply to this email.`
    : `Here's your personal link to view or change your RSVP. You can make changes any time until <strong style="color:${C.darkest};">${escapeHtml(formatDeadline())}</strong>.`;
  const bodyHtml = [
    greeting(name),
    para(intro, { margin: "0 0 26px" }),
    `<div style="text-align:center;">${button(editUrl, closed ? "View my RSVP" : "Open my RSVP")}</div>`,
    para("This link is just for you, so please don't forward it. If you didn't ask for it, you can safely ignore this email.", { size: 13, color: C.muted, align: "center", margin: "22px 0 0" }),
    signoff(),
  ].join("\n");
  const first = name.trim().split(/\s+/)[0];
  return {
    html: emailLayout({ kicker: "Katie & Jeffrey", title: "Your personal link", preheader: `View or change your RSVP until ${formatDeadline()}.`, bodyHtml }),
    text: [
      `Hi ${first || "there"},`,
      "",
      closed
        ? `Here's your personal link to view your RSVP. Changes closed at the end of ${formatDeadline()}; if something needs fixing, just reply to this email:`
        : `Here's your personal link to view or change your RSVP. You can make changes until ${formatDeadline()}:`,
      editUrl,
      "",
      "This link is just for you, so please don't forward it. If you didn't ask for it, you can ignore this email.",
      "",
      "With love,",
      "Katie & Jeffrey",
    ].join("\n"),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body && typeof body === "object" ? (body as { email?: unknown }).email : "";
  const address = cleanEmail(email);

  // Same body for every outcome below, so nothing distinguishes a hit from a miss.
  const ok = NextResponse.json({ ok: true });

  if (!address) {
    return NextResponse.json({ error: "invalid-email" }, { status: 400 });
  }

  const ip = clientKey(req);
  if (!allow(`ip:${ip}`, PER_CLIENT, WINDOW_MS) || !allow(`em:${address}`, PER_EMAIL, WINDOW_MS)) {
    // Also a 200: a distinct 429 would leak that the address is being retried.
    console.warn("[RSVP resend] rate limited", { ip });
    return ok;
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID || !process.env.RESEND_API_KEY) {
    console.warn("[RSVP resend] not configured — skipping");
    return ok;
  }

  // Not awaited: the lookup and email run after the response goes out, so
  // the response time doesn't reveal whether the address has an RSVP.
  void sendEditLink(req, address);
  return ok;
}

async function sendEditLink(req: NextRequest, address: string) {
  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const found = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      filter: { property: "Email", email: { equals: address } },
      sorts:  [{ property: "Submitted At", direction: "descending" }],
      page_size: 1,
    });

    const page: any = found.results[0];
    if (!page) {
      console.info("[RSVP resend] no RSVP for that address");
      return;
    }

    const name    = page.properties?.Name?.title?.[0]?.plain_text ?? "";
    const origin  = publicOrigin(req);
    const editUrl = buildEditUrl(page.id, origin);
    if (!editUrl) {
      console.warn("[RSVP resend] REGISTRY_CLAIM_KEY not set — cannot mint link");
      return;
    }

    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from:    process.env.REGISTRY_FROM_EMAIL ?? "Katie & Jeffrey <onboarding@resend.dev>",
      to:      address,
      subject: "Your RSVP link",
      ...buildResendEmail(name, editUrl),
    });
    if (error) console.error("[RSVP resend] email failed:", error);
  } catch (err: any) {
    // Never surface the failure: the response must not vary by outcome.
    console.error("[RSVP resend] failed:", err?.message ?? err);
  }
}
