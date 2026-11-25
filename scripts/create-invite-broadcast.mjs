#!/usr/bin/env node
/**
 * Put the wedding invitation into Resend as a DRAFT broadcast, so you can
 * review it, send yourself a test and press Send in the Resend dashboard.
 * Nothing is sent by this script.
 *
 * The Broadcasts editor in the dashboard has no "paste HTML" option, but the
 * API takes HTML, so this uploads the same designed email that
 * scripts/send-invites.mjs sends (scripts/invite-email.mjs).
 *
 *   node --env-file=.env.invites scripts/create-invite-broadcast.mjs
 *   node --env-file=.env.invites scripts/create-invite-broadcast.mjs --html-only   # just write invites/broadcast.html
 *
 * Before running:
 *   1. Resend dashboard → Audience → Contacts → Import your guest CSV
 *      (columns: email, first_name, last_name). One contact per address. Put
 *      the greeting you want in first_name, e.g. "Alex & Sam" for both of a
 *      couple's addresses: each gets their own copy saying "Dear Alex & Sam,".
 *   2. Put those contacts in a segment (or use the default one) and copy its id.
 *
 * Settings (.env.invites, git-ignored):
 *   RESEND_API_KEY, INVITE_FROM, INVITE_REPLY_TO, SITE_PASSWORD,
 *   INVITE_LINK (or INVITE_SECRET), NEXT_PUBLIC_SITE_URL   — as for send-invites.mjs
 *   RESEND_SEGMENT_ID     the segment to send to (shown in the dashboard)
 *
 * The email greets each contact as "Dear {first name}," ("Dear friend," when
 * a contact has none) and carries Resend's required unsubscribe link.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";
import { buildInviteEmail } from "./invite-email.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "invites", "broadcast.html");
const htmlOnly = process.argv.includes("--html-only");

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeffandkatie2027.com").trim().replace(/\/+$/, "");
const password = (process.env.SITE_PASSWORD ?? "").trim();
if (!password) fail("Set SITE_PASSWORD (the same value as on Render).");

/** Same derivation as linkToken() in lib/invite-crypto.ts; keep them in step. */
function deriveLink() {
  const secret = process.env.INVITE_SECRET;
  if (!secret) return "";
  const hash = crypto.createHash("sha256").update(password.toLowerCase()).digest("hex");
  return `${siteUrl}/i/${crypto.createHmac("sha256", secret).update(`link:${hash}`).digest("hex").slice(0, 16)}`;
}
const link = (process.env.INVITE_LINK ?? "").trim() || deriveLink();
if (!/^https:\/\/[^/]+\/i\/[0-9a-f]{16}$/i.test(link)) {
  fail("Set INVITE_LINK to the link from the site's \"Open on another device\" box (…/i/ followed by 16 characters), or set INVITE_SECRET.");
}

const email = buildInviteEmail({
  name: "{{{FIRST_NAME|friend}}}",
  link,
  password,
  siteUrl,
  unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, email.html);
console.log(`\nWrote ${path.relative(ROOT, OUT)} (contains the site password; it stays out of git).`);
if (htmlOnly) process.exit(0);

const apiKey = process.env.RESEND_API_KEY;
const from = (process.env.INVITE_FROM || process.env.REGISTRY_FROM_EMAIL || "").trim();
const replyTo = (process.env.INVITE_REPLY_TO ?? "").trim();
const segmentId = (process.env.RESEND_SEGMENT_ID ?? "").trim();
if (!apiKey) fail("Set RESEND_API_KEY.");
if (!from) fail('Set INVITE_FROM, e.g. "Katie & Jeffrey <hello@jeffandkatie2027.com>".');
if (!segmentId) fail("Set RESEND_SEGMENT_ID to the segment holding your guests (Resend dashboard → Audience).");

const { data, error } = await new Resend(apiKey).broadcasts.create({
  name: "Wedding invitation",
  segmentId,
  from,
  ...(replyTo ? { replyTo } : {}),
  subject: email.subject,
  previewText: `Join us in Charlottesville on Saturday, March 27, 2027. Kindly reply by January 27, 2027.`,
  html: email.html,
  text: email.text,
  // Draft only: you review and send it from the dashboard.
});
if (error) fail(`Resend refused the broadcast: ${error.message ?? JSON.stringify(error)}`);

console.log(`✓ Draft broadcast created (id ${data?.id}).
  Open https://resend.com/broadcasts, check it, send yourself a test, then Send or Schedule.\n`);
