import { Client } from "@notionhq/client";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_EXPIRES, normalizeId, signSession } from "@/lib/invite-crypto";
import { generateCode, normalizeCode } from "@/lib/invite-codes";

/**
 * Household invitations, read from the Notion "Invitations" database.
 *
 * Node runtime only (route handlers) — the Notion SDK does not belong in
 * middleware. Middleware checks the signed cookie alone; this module is what
 * answers "is that household still invited?".
 *
 * Each household has a 4-character code in the database's rich-text "Code"
 * property. Missing, invalid or duplicate codes are assigned automatically on
 * load and written back to Notion. To issue a household a NEW code, clear its
 * Code cell in Notion: the old link and code stop working within the 5-minute
 * cache. Devices that already unlocked the site stay in; use the Revoked
 * checkbox to remove those.
 */

export interface Invitation {
  /** Notion page id, normalized (lowercase, no dashes). */
  id: string;
  name: string;
  /** Lowercased; "" if none. */
  email: string;
  phone: string;
  revoked: boolean;
  /** ISO date, or "" if never sent. */
  linkSent: string;
  /** Uppercase 4-char code; "" when none could be assigned (and saved). */
  code: string;
}

const TTL_MS = 5 * 60 * 1000;

interface Cache {
  at: number;
  rows: Invitation[];
  /** invite code → row, computed once per load. */
  codes: Map<string, Invitation>;
}

let cache: Cache | null = null;
/** The load in progress, shared by concurrent callers so codes are assigned once. */
let inflight: Promise<Cache> | null = null;

export function invitesConfigured(): boolean {
  return Boolean(
    process.env.INVITE_SECRET &&
      process.env.NOTION_TOKEN &&
      process.env.NOTION_INVITES_DATABASE_ID,
  );
}

function toInvitation(page: any): Invitation & { created: string } {
  const p = page.properties ?? {};
  const text = (arr: any): string =>
    Array.isArray(arr) ? arr.map((t: any) => t?.plain_text ?? "").join("") : "";
  return {
    id: normalizeId(page.id),
    name: text(p.Name?.title).trim(),
    email: (p.Email?.email ?? "").trim().toLowerCase(),
    phone: p.Phone?.phone_number ?? "",
    revoked: Boolean(p.Revoked?.checkbox),
    linkSent: p["Link Sent"]?.date?.start ?? "",
    code: normalizeCode(text(p.Code?.rich_text)),
    created: page.created_time ?? "",
  };
}

async function fetchAndAssign(): Promise<Cache> {
  // NOTION_API_BASE_URL exists only so tests can point at a mock server.
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    baseUrl: process.env.NOTION_API_BASE_URL || undefined,
  });

  const found: (Invitation & { created: string })[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: process.env.NOTION_INVITES_DATABASE_ID as string,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of res.results) found.push(toInvitation(page));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  // Earliest-created row keeps a duplicated code (id breaks exact ties).
  const order = found.slice().sort((a, b) =>
    a.created < b.created ? -1 : a.created > b.created ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const taken = new Set<string>();
  const needs: (Invitation & { created: string })[] = [];
  for (const row of order) {
    if (row.code && !taken.has(row.code)) taken.add(row.code);
    else needs.push(row);
  }
  for (const row of needs) {
    const fresh = generateCode(taken);
    taken.add(fresh);
    try {
      await notion.pages.update({
        page_id: row.id,
        properties: { Code: { rich_text: [{ text: { content: fresh } }] } },
      });
      console.info(`[Invites] assigned code to ${row.name || row.id}`);
      row.code = fresh;
    } catch (err: any) {
      // Never hand out a code that was not saved: it would change on the next load.
      console.error(`[Invites] could not save code for ${row.name || row.id}:`, err?.message ?? err);
      row.code = "";
    }
  }

  const rows: Invitation[] = found.map(({ created: _created, ...inv }) => inv);
  const codes = new Map<string, Invitation>();
  for (const row of rows) if (row.code) codes.set(row.code, row);
  return { at: Date.now(), rows, codes };
}

/**
 * Every invitation, cached in memory for 5 minutes. THROWS on a Notion error:
 * callers must never treat a failed load as "not invited".
 */
export async function loadInvitations(opts?: { fresh?: boolean }): Promise<Invitation[]> {
  if (!opts?.fresh && cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  if (!inflight) {
    const p: Promise<Cache> = fetchAndAssign()
      .then((c) => {
        cache = c;
        return c;
      })
      .finally(() => {
        if (inflight === p) inflight = null;
      });
    inflight = p;
  }
  return (await inflight).rows;
}

/** Match a typed or linked code (any case, dashes/spaces ignored). Revoked rows are returned. */
export async function findByCode(code: string): Promise<Invitation | null> {
  const want = normalizeCode(code);
  if (!want) return null;
  await loadInvitations();
  return cache?.codes.get(want) ?? null;
}

export async function findById(id: string): Promise<Invitation | null> {
  const want = normalizeId(id);
  const rows = await loadInvitations();
  return rows.find((r) => r.id === want) ?? null;
}

export async function findByEmail(email: string): Promise<Invitation | null> {
  const want = email.trim().toLowerCase();
  if (!want) return null;
  const rows = await loadInvitations();
  return rows.find((r) => r.email === want) ?? null;
}

export function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return configured ? configured.replace(/\/+$/, "") : req.nextUrl.origin;
}

export async function inviteUrl(origin: string, inv: Invitation): Promise<string> {
  return inv.code ? `${origin}/i/${inv.code}` : "";
}

/** Set the device cookie that lets this browser in as household `id`. */
export async function setSessionCookie(res: NextResponse, id: string): Promise<void> {
  res.cookies.set(SESSION_COOKIE, await signSession(id, Math.floor(Date.now() / 1000)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: SESSION_EXPIRES,
  });
}

/** Stamp "Link Sent" with now and drop the cache so the next read sees it. */
export async function markLinkSent(id: string): Promise<void> {
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    baseUrl: process.env.NOTION_API_BASE_URL || undefined,
  });
  await notion.pages.update({
    page_id: id,
    properties: { "Link Sent": { date: { start: new Date().toISOString() } } },
  });
  cache = null;
  inflight = null;
}
