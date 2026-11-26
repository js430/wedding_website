#!/usr/bin/env node
/**
 * One-off: give every existing +1 their own row in the RSVP database.
 *
 * RSVPs saved before +1s had their own rows keep the +1 in the host's
 * "Guest Name" / "Guest Meal" columns. The site reads both layouts, so this
 * is only tidying: afterwards every person is one row, with their meal in
 * the Meal column. Run it once, after adding the "Guest Of" Text column.
 *
 *   node --env-file=.env.notion scripts/split-plus-ones.mjs           # dry run: shows what it would do
 *   node --env-file=.env.notion scripts/split-plus-ones.mjs --apply   # does it
 *
 * .env.notion (git-ignored), same values as on Render:
 *   NOTION_TOKEN=secret_…
 *   NOTION_DATABASE_ID=…
 *
 * For each host row with "+1" = Yes and no +1 row of its own yet, it creates
 * the +1's row (Name, Attending, Meal, Guest Of = host email, Table and Seat
 * copied) and then clears the host's Guest Name / Guest Meal. Safe to run
 * again: hosts that already have a +1 row are skipped.
 */

import { Client } from "@notionhq/client";

const apply = process.argv.includes("--apply");
const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
if (!token || !databaseId) {
  console.error("\n✗ Set NOTION_TOKEN and NOTION_DATABASE_ID (see the top of this file).\n");
  process.exit(1);
}

const notion = new Client({ auth: token });
const text = (p) => (p?.rich_text ?? p?.title ?? []).map((t) => t.plain_text ?? "").join("");

// Everything in the database (paged).
const pages = [];
let cursor;
do {
  const res = await notion.databases.query({ database_id: databaseId, page_size: 100, start_cursor: cursor });
  pages.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

if (pages.length && !("Guest Of" in (pages[0].properties ?? {}))) {
  console.error('\n✗ The RSVP database has no "Guest Of" column. Add a Text property named exactly "Guest Of" first.\n');
  process.exit(1);
}

// Meal / Attending may be Select or Text columns; read and write either.
const choice = (prop) => (prop?.select?.name ?? prop?.status?.name ?? text(prop)).trim();
const asType = (type, v) => type === "rich_text"
  ? { rich_text: v ? [{ text: { content: v } }] : [] }
  : { select: v ? { name: v } : null };
const typeOf = (key) => pages.find((p) => p.properties?.[key])?.properties[key].type ?? "select";

const guestOf = (p) => text(p.properties?.["Guest Of"]).trim().toLowerCase();
const hasOwnRow = new Set(pages.map(guestOf).filter(Boolean));
const todo = pages.filter((p) =>
  !guestOf(p) &&
  choice(p.properties?.["+1"]) === "Yes" &&
  !hasOwnRow.has(String(p.properties?.Email?.email ?? "").trim().toLowerCase()),
);

console.log(`\n${pages.length} rows; ${todo.length} +1(s) to move to their own row.${apply ? "" : " (dry run: nothing changes)"}\n`);

let done = 0;
for (const host of todo) {
  const p = host.properties;
  const hostName = text(p.Name);
  const email = String(p.Email?.email ?? "").trim().toLowerCase();
  if (!email) {
    console.log(`  – skipped ${hostName || host.id}: no email to link the +1 to`);
    continue;
  }
  const firstName = hostName.trim().split(/\s+/)[0] || "Guest";
  const guestName = text(p["Guest Name"]).trim() || `${firstName}'s guest`;
  const meal = choice(p["Guest Meal"]) || null;
  console.log(`  ${apply ? "✓" : "→"} ${guestName}${meal ? ` (${meal})` : " (no meal chosen)"}, guest of ${hostName} <${email}>`);
  if (!apply) continue;

  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name:           { title:     [{ text: { content: guestName } }] },
      Attending:      asType(typeOf("Attending"), choice(p.Attending) === "Yes" ? "Yes" : "No"),
      Meal:           asType(typeOf("Meal"), meal),
      "Guest Of":     { rich_text: [{ text: { content: email } }] },
      "Submitted At": { date:      p["Submitted At"]?.date?.start ? { start: p["Submitted At"].date.start } : null },
      ...("Table" in p ? { Table: { rich_text: text(p.Table) ? [{ text: { content: text(p.Table) } }] : [] } } : {}),
      ...("Seat" in p ? { Seat: { number: p.Seat?.number ?? null } } : {}),
    },
  });
  await notion.pages.update({
    page_id: host.id,
    properties: {
      ...("Guest Name" in p ? { "Guest Name": { rich_text: [] } } : {}),
      ...("Guest Meal" in p ? { "Guest Meal": asType(typeOf("Guest Meal"), null) } : {}),
    },
  });
  done++;
}

console.log(apply ? `\nMoved ${done}.\n` : "\nRun again with --apply to make these changes.\n");
