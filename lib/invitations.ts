import { Client } from "@notionhq/client";
import type { NextRequest } from "next/server";
import { inviteCode, normalizeId } from "@/lib/invite-crypto";

/**
 * Household invitations, read from the Notion "Invitations" database.
 *
 * Node runtime only (route handlers) — the Notion SDK does not belong in
 * middleware. Middleware checks the signed cookie alone; this module is what
 * answers "is that household still invited?".
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
}

const TTL_MS = 5 * 60 * 1000;

interface Cache {
  at: number;
  rows: Invitation[];
  /** invite code → row, computed once per load. */
  codes: Map<string, Invitation>;
}

let cache: Cache | null = null;

export function invitesConfigured(): boolean {
  return Boolean(
    process.env.INVITE_SECRET &&
      process.env.NOTION_TOKEN &&
      process.env.NOTION_INVITES_DATABASE_ID,
  );
}

function toInvitation(page: any): Invitation {
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
  };
}

/**
 * Every invitation, cached in memory for 5 minutes. THROWS on a Notion error:
 * callers must never treat a failed load as "not invited".
 */
export async function loadInvitations(opts?: { fresh?: boolean }): Promise<Invitation[]> {
  if (!opts?.fresh && cache && Date.now() - cache.at < TTL_MS) return cache.rows;

  // NOTION_API_BASE_URL exists only so tests can point at a mock server.
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    baseUrl: process.env.NOTION_API_BASE_URL || undefined,
  });

  const rows: Invitation[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: process.env.NOTION_INVITES_DATABASE_ID as string,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of res.results) rows.push(toInvitation(page));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  const codes = new Map<string, Invitation>();
  for (const row of rows) {
    const code = await inviteCode(row.id);
    if (code) codes.set(code, row);
  }

  cache = { at: Date.now(), rows, codes };
  return rows;
}

export async function findByCode(code: string): Promise<Invitation | null> {
  await loadInvitations();
  return cache?.codes.get(code) ?? null;
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
  return `${origin}/i/${await inviteCode(inv.id)}`;
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
}
