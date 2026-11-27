#!/usr/bin/env node
/**
 * Email the wedding invitations through Resend.
 *
 * Run it from your own computer, never on the server:
 *
 *   node --env-file=.env.invites scripts/send-invites.mjs                 # preview only (default)
 *   node --env-file=.env.invites scripts/send-invites.mjs --test you@x.com  # one sample to yourself
 *   node --env-file=.env.invites scripts/send-invites.mjs --send            # the real thing
 *   node --env-file=.env.invites scripts/send-invites.mjs --resend guest@x.com  # send one guest's invite again
 *
 * Guest list: invites/guests.csv (copy invites/guests.example.csv). Columns:
 *   name   how to greet them: "Alex & Sam", "Aunt May", "the Lee family"
 *   email  one address, or several for one household separated by ";"
 * The invites/ folder is git-ignored (the repository is public), except
 * the example file.
 *
 * Settings (.env.invites, also git-ignored):
 *   RESEND_API_KEY        same key as on Render
 *   INVITE_FROM           e.g. Katie & Jeffrey <hello@jeffandkatie2027.com>  (a verified Resend domain)
 *   INVITE_REPLY_TO       where guests' replies go, e.g. your own email
 *   SITE_PASSWORD         same as on Render (shown in the email for other devices)
 *   INVITE_LINK           the shared link from the site's "Open on another device" box, or leave it
 *                         out and set INVITE_SECRET (same as Render) to have it worked out here
 *   NEXT_PUBLIC_SITE_URL  https://www.jeffandkatie2027.com (default)
 *
 * Safety:
 *   - Without --send nothing is sent: you get a summary and invites/preview.html.
 *   - --send asks you to type SEND, sends at most --limit emails per run
 *     (default 90: Resend's free plan allows 100 a day), and records every
 *     success in invites/sent.json. Running it again skips anyone already
 *     sent, so you can send in batches or re-run after an error.
 *   - Each send carries an idempotency key, so a retried request can't
 *     deliver the same invite twice.
 *   - --resend <email> sends that one address its invite again, right away
 *     (even within 24 hours of the first). The greeting comes from the
 *     guest list row that has the address, so it must be in guests.csv.
 *     It asks you to type SEND, and notes the resend in sent.json.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";
import { buildInviteEmail } from "./invite-email.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "invites");
const GUESTS = path.join(DIR, "guests.csv");
const SENT = path.join(DIR, "sent.json");
const PREVIEW = path.join(DIR, "preview.html");
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// ── Arguments ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const mode = flag("--send") ? "send" : flag("--resend") ? "resend" : value("--test") ? "test" : "preview";
const limit = Number(value("--limit") ?? 90);
const guestsPath = value("--guests") ? path.resolve(value("--guests")) : GUESTS;

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// ── Settings ─────────────────────────────────────────────────────────────────
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeffandkatie2027.com").trim().replace(/\/+$/, "");
const password = (process.env.SITE_PASSWORD ?? "").trim();
if (!password) fail("Set SITE_PASSWORD (the same value as on Render).");

/** Same derivation as linkToken() in lib/invite-crypto.ts; keep them in step. */
function deriveLink() {
  const secret = process.env.INVITE_SECRET;
  if (!secret) return "";
  const passwordHash = crypto.createHash("sha256").update(password.toLowerCase()).digest("hex");
  const token = crypto.createHmac("sha256", secret).update(`link:${passwordHash}`).digest("hex").slice(0, 16);
  return `${siteUrl}/i/${token}`;
}
const link = (process.env.INVITE_LINK ?? "").trim() || deriveLink();
if (!/^https:\/\/[^/]+\/i\/[0-9a-f]{16}$/i.test(link) && !/^http:\/\/localhost/.test(link)) {
  fail("Set INVITE_LINK to the link from the site's \"Open on another device\" box (…/i/ followed by 16 characters), or set INVITE_SECRET.");
}

// ── Guest list ───────────────────────────────────────────────────────────────
/** Minimal CSV reader: commas, "quoted, fields" and "" escapes. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

if (!fs.existsSync(guestsPath)) {
  fail(`No guest list at ${path.relative(ROOT, guestsPath)}. Copy invites/guests.example.csv to invites/guests.csv and fill it in.`);
}
const [header, ...rows] = parseCsv(fs.readFileSync(guestsPath, "utf8").replace(/^﻿/, ""));
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
const nameCol = col("name"), emailCol = col("email");
if (nameCol < 0 || emailCol < 0) fail('The guest list needs a header row with "name" and "email" columns.');

const problems = [];
const seen = new Map();
const guests = [];
rows.forEach((r, n) => {
  const line = n + 2;
  const name = (r[nameCol] ?? "").trim();
  const emails = (r[emailCol] ?? "").split(";").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!name) problems.push(`line ${line}: no name`);
  if (!emails.length) problems.push(`line ${line}: no email`);
  for (const e of emails) {
    if (!EMAIL.test(e)) problems.push(`line ${line}: "${e}" doesn't look like an email address`);
    if (seen.has(e)) problems.push(`line ${line}: ${e} is also on line ${seen.get(e)}`);
    seen.set(e, line);
  }
  if (name && emails.length) guests.push({ name, emails, key: emails.slice().sort().join(";") });
});
if (problems.length) fail(`Fix the guest list first:\n  ${problems.join("\n  ")}`);
if (!guests.length) fail("The guest list is empty.");

const sent = fs.existsSync(SENT) ? JSON.parse(fs.readFileSync(SENT, "utf8")) : {};
const pending = guests.filter((g) => !sent[g.key]);

// ── Preview (always) ─────────────────────────────────────────────────────────
fs.mkdirSync(DIR, { recursive: true });
const sample = buildInviteEmail({ name: guests[0].name, link, password, siteUrl });
fs.writeFileSync(PREVIEW, sample.html);

console.log(`
Guests: ${guests.length} households, ${seen.size} addresses
Already sent: ${guests.length - pending.length}    Still to send: ${pending.length}
Invite link: ${link}
Subject: ${sample.subject}
Preview of the first email: ${path.relative(ROOT, PREVIEW)} (open it in a browser)`);

if (mode === "preview") {
  console.log("\nNothing was sent. Next: --test your@email.com, then --send.\n");
  process.exit(0);
}

// ── Sending ──────────────────────────────────────────────────────────────────
const apiKey = process.env.RESEND_API_KEY;
const from = (process.env.INVITE_FROM || process.env.REGISTRY_FROM_EMAIL || "").trim();
const replyTo = (process.env.INVITE_REPLY_TO ?? "").trim();
if (!apiKey) fail("Set RESEND_API_KEY.");
if (!from) fail('Set INVITE_FROM, e.g. "Katie & Jeffrey <hello@jeffandkatie2027.com>" (an address on your verified Resend domain).');
if (/onboarding@resend\.dev/.test(from)) fail("onboarding@resend.dev can only email your own account; use an address on your verified domain.");

const resend = new Resend(apiKey);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendOne(to, name, { test = false, resend: again = false } = {}) {
  const email = buildInviteEmail({ name, link, password, siteUrl });
  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: test ? `[Test] ${email.subject}` : email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "kind", value: test ? "invite-test" : "invite" }],
    },
    // Same key for the same household: a retried request isn't delivered twice.
    // A deliberate resend gets a key of its own, or Resend would treat it as
    // a repeat of the first send (it remembers keys for 24 hours).
    test
      ? undefined
      : {
          idempotencyKey: again
            ? `wedding-invite-resend/${crypto.createHash("sha256").update(to.join(";")).digest("hex").slice(0, 24)}/${Date.now()}`
            : `wedding-invite/${crypto.createHash("sha256").update(to.join(";")).digest("hex").slice(0, 32)}`,
        },
  );
  if (error) throw new Error(error.message ?? JSON.stringify(error));
  return data?.id;
}

if (mode === "test") {
  const to = value("--test").trim().toLowerCase();
  if (!EMAIL.test(to)) fail(`"${to}" doesn't look like an email address.`);
  try {
    const id = await sendOne([to], guests[0].name, { test: true });
    console.log(`\n✓ Test sent to ${to} (Resend id ${id}). Check it on your phone and computer, and in the spam folder.\n`);
  } catch (err) {
    fail(`Test send failed: ${err.message}`);
  }
  process.exit(0);
}

if (mode === "resend") {
  const to = (value("--resend") ?? "").trim().toLowerCase();
  if (!EMAIL.test(to)) fail(`Give the address to resend to, e.g. --resend guest@example.com${to ? ` ("${to}" doesn't look like one)` : ""}.`);
  const g = guests.find((x) => x.emails.includes(to));
  if (!g) fail(`${to} isn't in ${path.relative(ROOT, guestsPath)}. Add it there (the greeting comes from its row), then run this again.`);
  const before = sent[g.key];
  console.log(`\nThis will email the invitation to ${to} again, greeting "Dear ${g.name},"${before ? ` (first sent ${before.at.slice(0, 10)})` : " (not sent before)"}.`);
  if (g.emails.length > 1) console.log(`Only ${to} gets it; the other address on that row (${g.emails.filter((e) => e !== to).join(", ")}) does not.`);
  if (!flag("--yes")) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("Type SEND to go ahead: ");
    rl.close();
    if (answer.trim() !== "SEND") fail("Cancelled; nothing was sent.");
  }
  try {
    const id = await sendOne([to], g.name, { resend: true });
    const entry = before ?? { name: g.name, to: g.emails, id, at: new Date().toISOString() };
    entry.resent = [...(entry.resent ?? []), { to, id, at: new Date().toISOString() }];
    sent[g.key] = entry;
    fs.writeFileSync(SENT, JSON.stringify(sent, null, 2));
    console.log(`\n✓ Resent to ${g.name} <${to}> (Resend id ${id}).\n`);
  } catch (err) {
    fail(`Resend failed: ${err.message}`);
  }
  process.exit(0);
}

// mode === "send"
const batch = pending.slice(0, Math.max(0, limit));
if (!batch.length) {
  console.log("\nEveryone on the list has been sent an invite.\n");
  process.exit(0);
}
console.log(`\nThis run will email ${batch.length} household(s)${pending.length > batch.length ? ` (${pending.length - batch.length} left for the next run)` : ""}, from ${from}${replyTo ? `, replies to ${replyTo}` : ""}.`);
if (!flag("--yes")) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Type SEND to go ahead: ');
  rl.close();
  if (answer.trim() !== "SEND") fail("Cancelled; nothing was sent.");
}

let ok = 0;
const failed = [];
for (const g of batch) {
  try {
    const id = await sendOne(g.emails, g.name);
    sent[g.key] = { name: g.name, to: g.emails, id, at: new Date().toISOString() };
    fs.writeFileSync(SENT, JSON.stringify(sent, null, 2)); // saved after each one
    ok++;
    console.log(`  ✓ ${g.name} <${g.emails.join(", ")}>`);
  } catch (err) {
    failed.push(g);
    console.log(`  ✗ ${g.name} <${g.emails.join(", ")}>: ${err.message}`);
    if (/rate|limit|quota|429/i.test(err.message)) {
      console.log("\nStopped: Resend's sending limit was reached. Run again later; sent guests are skipped.");
      break;
    }
  }
  await pause(600); // stay under Resend's default 2 requests per second
}

console.log(`\nSent ${ok}. ${failed.length ? `${failed.length} failed (run again to retry them).` : "No failures."} ${pending.length - ok - failed.length > 0 ? `${pending.length - ok - failed.length} not attempted yet.` : ""}\nRecord of who was sent: ${path.relative(ROOT, SENT)}\n`);
process.exit(failed.length ? 1 : 0);
