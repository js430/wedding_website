import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

/**
 * Configuration check, guarded by ADMIN_PASSWORD.
 *
 * Reports whether each variable is SET — never its value — and actually calls
 * Resend and Notion so a wrong-but-present key is caught too. Nothing here is
 * guesswork: every answer comes from a live call.
 */

function present(name: string) {
  const v = process.env[name];
  return { set: Boolean(v && v.trim()), name };
}

async function checkResend() {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, detail: "RESEND_API_KEY is not set — no email can be sent." };
  }
  try {
    const res: any = await new Resend(process.env.RESEND_API_KEY).domains.list();
    if (res?.error) {
      // Could be a bad key or a network problem; report it without guessing.
      return { ok: false, detail: `Resend returned an error: ${res.error.message ?? res.error}` };
    }
    const domains: any[] = res?.data?.data ?? res?.data ?? [];
    const verified = domains.filter((d) => d.status === "verified").map((d) => d.name);
    const from = process.env.REGISTRY_FROM_EMAIL ?? "";
    const usingTestSender = !from || from.includes("resend.dev");

    return {
      ok: verified.length > 0 && !usingTestSender,
      verifiedDomains: verified,
      fromAddressSet: Boolean(from),
      usingTestSender,
      detail: usingTestSender
        ? "Sending from onboarding@resend.dev. Resend only delivers that sender to your own account address, so guests receive nothing. Verify a domain and set REGISTRY_FROM_EMAIL."
        : verified.length === 0
        ? "REGISTRY_FROM_EMAIL is set but no verified domain exists in Resend; sends will be rejected."
        : "Resend is configured for guest delivery.",
    };
  } catch (err: any) {
    return { ok: false, detail: `Could not reach Resend: ${err?.message ?? err}` };
  }
}

async function checkNotionDb(envName: string) {
  const id = process.env[envName];
  if (!id) return { ok: false, detail: `${envName} is not set.` };
  if (!process.env.NOTION_TOKEN) return { ok: false, detail: "NOTION_TOKEN is not set." };
  try {
    const db: any = await new Client({ auth: process.env.NOTION_TOKEN }).databases.retrieve({
      database_id: id,
    });
    return { ok: true, properties: Object.keys(db.properties ?? {}) };
  } catch (err: any) {
    return {
      ok: false,
      detail:
        `${err?.message ?? err}. If this says the database was not found, the Notion ` +
        `integration has not been connected to it (database → ⋯ → Connections).`,
    };
  }
}

export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }
  if ((req.headers.get("x-admin-password") ?? "") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [resend, rsvpDb, registryDb] = await Promise.all([
    checkResend(),
    checkNotionDb("NOTION_DATABASE_ID"),
    checkNotionDb("NOTION_REGISTRY_DATABASE_ID"),
  ]);

  return NextResponse.json({
    email: resend,
    notion: { rsvpDatabase: rsvpDb, registryDatabase: registryDb },
    variablesSet: [
      "RESEND_API_KEY",
      "REGISTRY_FROM_EMAIL",
      "REGISTRY_CLAIM_KEY",
      "NEXT_PUBLIC_SITE_URL",
      "NOTION_TOKEN",
      "VENMO_HANDLE",
      "ZELLE_EMAIL",
      "PAYPAL_EMAIL",
    ].map(present),
    notes: {
      editLinks: process.env.REGISTRY_CLAIM_KEY
        ? "REGISTRY_CLAIM_KEY is set. Changing it invalidates every edit link already emailed."
        : "REGISTRY_CLAIM_KEY is NOT set, so no edit link can be minted and the email falls back to 'reach out to us directly'.",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL
        ? `Email links point at ${process.env.NEXT_PUBLIC_SITE_URL}`
        : "NEXT_PUBLIC_SITE_URL is not set; email links use whatever origin the request arrived on.",
    },
  });
}
