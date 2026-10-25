import { Client } from "@notionhq/client";

/**
 * Private page-view counts, stored in Notion.
 *
 * Views accumulate in memory and flush at most once a minute, so a burst of
 * guests opening the site costs a couple of Notion calls rather than two per
 * view. The trade is that up to a minute of counts is lost on a restart or
 * deploy — fine for "did people look at the site", not for anything exact.
 *
 * Required Notion database (NOTION_ANALYTICS_DATABASE_ID) properties:
 *   Name  — title   (e.g. "2027-03-01 /registry")
 *   Date  — date
 *   Path  — rich text
 *   Views — number
 */

const FLUSH_INTERVAL_MS = 60_000;

/** key: "YYYY-MM-DD|/path" -> pending view count */
const pending = new Map<string, number>();
let lastFlush = 0;
let flushing = false;

/** Day bucket in the wedding's timezone, so "today" means today to us. */
function todayKey(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** Obvious crawlers — the site is noindex, but they still knock. */
export function isBot(userAgent: string): boolean {
  return /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|headless/i.test(
    userAgent
  );
}

/** Only count real pages, and never the admin dashboard itself. */
export function trackablePath(path: string): string | null {
  if (!path.startsWith("/")) return null;
  if (path.startsWith("/admin") || path.startsWith("/api")) return null;
  // Drop query strings and trailing slashes so /registry and /registry/ agree.
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  return clean.length > 120 ? null : clean;
}

export function record(path: string, now: Date = new Date()) {
  const key = `${todayKey(now)}|${path}`;
  pending.set(key, (pending.get(key) ?? 0) + 1);
}

function notion() {
  return new Client({ auth: process.env.NOTION_TOKEN });
}

/** Push pending counts into Notion, adding to whatever is already there. */
export async function flush(force = false, now: Date = new Date()): Promise<void> {
  const dbId = process.env.NOTION_ANALYTICS_DATABASE_ID;
  if (!dbId || !process.env.NOTION_TOKEN) return;
  if (flushing || pending.size === 0) return;
  if (!force && now.getTime() - lastFlush < FLUSH_INTERVAL_MS) return;

  flushing = true;
  // Take the batch first: views arriving mid-flush land in the next one
  // rather than being dropped.
  const batch = Array.from(pending.entries());
  pending.clear();
  lastFlush = now.getTime();

  const client = notion();
  try {
    for (const [key, count] of batch) {
      const [date, path] = key.split("|");
      try {
        const existing = await client.databases.query({
          database_id: dbId,
          filter: {
            and: [
              { property: "Date", date: { equals: date } },
              { property: "Path", rich_text: { equals: path } },
            ],
          },
          page_size: 1,
        });

        const row: any = existing.results[0];
        if (row) {
          const current = row.properties?.Views?.number ?? 0;
          await client.pages.update({
            page_id: row.id,
            properties: { Views: { number: current + count } },
          });
        } else {
          await client.pages.create({
            parent: { database_id: dbId },
            properties: {
              Name:  { title: [{ text: { content: `${date} ${path}` } }] },
              Date:  { date: { start: date } },
              Path:  { rich_text: [{ text: { content: path } }] },
              Views: { number: count },
            },
          });
        }
      } catch (err: any) {
        // Put the counts back so a transient failure doesn't lose them.
        pending.set(key, (pending.get(key) ?? 0) + count);
        console.warn("[analytics] row flush failed:", err?.message ?? err);
      }
    }
  } finally {
    flushing = false;
  }
}

export interface DayRow { date: string; path: string; views: number }

/** Everything recorded so far, newest day first. */
export async function readAll(): Promise<DayRow[]> {
  const dbId = process.env.NOTION_ANALYTICS_DATABASE_ID;
  if (!dbId || !process.env.NOTION_TOKEN) return [];

  const rows: DayRow[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion().databases.query({
      database_id: dbId,
      sorts: [{ property: "Date", direction: "descending" }],
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of res.results as any[]) {
      rows.push({
        date:  page.properties?.Date?.date?.start ?? "",
        path:  page.properties?.Path?.rich_text?.[0]?.plain_text ?? "",
        views: page.properties?.Views?.number ?? 0,
      });
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return rows;
}
