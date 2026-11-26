import type { Client } from "@notionhq/client";

/**
 * A guest's +1 gets their own row in the RSVP database, so the database
 * counts people (one row = one person) and every person's meal sits in the
 * same Meal column.
 *
 * The +1's row has: Name (their name, or "Alex's guest" when left blank),
 * Attending = Yes, Meal, and "Guest Of" = the email of the guest who
 * brought them. No Email of its own, so it never matches the one-row-per-
 * email lookup. The host's row keeps "+1" = Yes/No.
 *
 * Needs a Text property named "Guest Of" in the RSVP database. Without it
 * the site falls back to the older layout (the +1's name and meal in the
 * host row's "Guest Name" and "Guest Meal" columns) rather than failing,
 * and everything that reads RSVPs understands both layouts.
 */

export const GUEST_OF = "Guest Of";
export const LEGACY_GUEST_NAME = "Guest Name";
export const LEGACY_GUEST_MEAL = "Guest Meal";

const text = (p: any): string => (p?.rich_text ?? p?.title ?? []).map((t: any) => t.plain_text ?? "").join("");

/** The host email a +1's row points at ("" for a host's own row). */
export function guestOfKey(page: any): string {
  return text(page?.properties?.[GUEST_OF]).trim().toLowerCase();
}

export function isGuestRow(page: any): boolean {
  return guestOfKey(page) !== "";
}

/** Lower-cased email on a host row ("" if none). */
export function hostKey(page: any): string {
  return String(page?.properties?.Email?.email ?? "").trim().toLowerCase();
}

/**
 * A choice column's value, whether the column is a Select ("Sea Bass"), a
 * Status, or plain Text. Lets the database owner change a column's type
 * without breaking the site.
 */
export function readChoice(prop: any): string {
  return (prop?.select?.name ?? prop?.status?.name ?? text(prop)).trim();
}

/** Re-shape one property value to the type Notion says the column has. */
function convert(value: any, to: string): any | undefined {
  const s: string | undefined =
    value?.select !== undefined ? (value.select?.name ?? "") :
    value?.rich_text !== undefined ? value.rich_text.map((t: any) => t.text?.content ?? "").join("") :
    value?.checkbox !== undefined ? (value.checkbox ? "Yes" : "") :
    undefined;
  if (s === undefined) return undefined;
  if (to === "rich_text") return { rich_text: s ? [{ text: { content: s } }] : [] };
  if (to === "select") return { select: s ? { name: s.replace(/,/g, " ") } : null };
  if (to === "checkbox") return { checkbox: /^(yes|true|y|1|x)$/i.test(s.trim()) };
  return undefined;
}

/**
 * Run a Notion write and retry it, adapting to the database as it is:
 * - drops any of `optional` that Notion reports as a property that doesn't
 *   exist (returned in `dropped`);
 * - when Notion says a column has another type (Select, Text, Checkbox),
 *   sends that value in the column's actual type; an optional column of a
 *   type it can't fill is dropped.
 * Anything else is thrown as before.
 */
export async function writeTolerant<T>(
  properties: Record<string, any>,
  optional: string[],
  write: (properties: Record<string, any>) => Promise<T>,
): Promise<{ value: T; dropped: string[] }> {
  const props = { ...properties };
  const dropped: string[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return { value: await write(props), dropped };
    } catch (err: any) {
      const message = String(err?.message ?? "");
      let changed = false;
      // Notion lists every problem in one message: "Meal is expected to be rich_text. X is not a property that exists."
      for (const sentence of message.split(/\.\s+|\.$/)) {
        const m = sentence.trim().match(/^(.+?) is expected to be (\w+)$/);
        if (!m || !(m[1] in props)) continue;
        const next = convert(props[m[1]], m[2]);
        if (next === undefined) {
          // A column of a type we can't write: skip it if it's optional.
          if (optional.includes(m[1])) {
            console.warn(`[RSVP] Notion's "${m[1]}" column is ${m[2]}, which the site can't fill; saved without it.`);
            delete props[m[1]];
            dropped.push(m[1]);
            changed = true;
          }
          continue;
        }
        console.warn(`[RSVP] Notion's "${m[1]}" column is ${m[2]}; saved it as ${m[2]}.`);
        props[m[1]] = next;
        changed = true;
      }
      for (const key of optional) {
        if (key in props && message.includes(`${key} is not a property`)) {
          console.warn(`[RSVP] Notion has no "${key}" column; saved without it.`);
          delete props[key];
          dropped.push(key);
          changed = true;
        }
      }
      if (!changed) throw err;
    }
  }
  return { value: await write(props), dropped };
}

/**
 * The +1 rows belonging to a host. `supported` is false when the database
 * has no "Guest Of" column yet (then the caller keeps the older layout).
 */
export async function findGuestRows(
  notion: Client,
  databaseId: string,
  key: string,
): Promise<{ supported: boolean; rows: any[] }> {
  if (!key) return { supported: true, rows: [] };
  try {
    const res = await notion.databases.query({
      database_id: databaseId,
      filter: { property: GUEST_OF, rich_text: { equals: key } },
    });
    return { supported: true, rows: res.results };
  } catch (err: any) {
    if (String(err?.message ?? "").includes(GUEST_OF)) {
      console.warn(`[RSVP] Notion has no "${GUEST_OF}" column; keeping +1s on the guest's own row. Add a Text column named "${GUEST_OF}" to give each +1 their own row.`);
      return { supported: false, rows: [] };
    }
    throw err;
  }
}

export interface PlusOne {
  /** Whether the host is bringing a +1 at all. */
  bringing: boolean;
  /** Typed name, may be "". */
  name: string;
  /** Meal label as stored in Notion ("Sea Bass"), or null. */
  mealLabel: string | null;
}

/**
 * Make the +1's own row match the host's RSVP: update (or create) it when
 * they're coming, remove it when they're not. Extra rows left by an old race
 * are removed. `existing` is what findGuestRows returned.
 */
export async function syncGuestRow(
  notion: Client,
  databaseId: string,
  existing: any[],
  key: string,
  hostName: string,
  plusOne: PlusOne,
): Promise<void> {
  const [first, ...extra] = existing;
  await Promise.all(extra.map((p) => notion.pages.update({ page_id: p.id, archived: true })));

  if (!plusOne.bringing) {
    if (first) await notion.pages.update({ page_id: first.id, archived: true });
    return;
  }

  const firstName = hostName.trim().split(/\s+/)[0] || "Guest";
  const properties: Record<string, any> = {
    Name:           { title:     [{ text: { content: plusOne.name.trim() || `${firstName}'s guest` } }] },
    Attending:      { select:    { name: "Yes" } },
    Meal:           { select:    plusOne.mealLabel ? { name: plusOne.mealLabel } : null },
    [GUEST_OF]:     { rich_text: [{ text: { content: key } }] },
    "Submitted At": { date:      { start: new Date().toISOString() } },
  };
  await writeTolerant(properties, [], (props) =>
    first
      ? notion.pages.update({ page_id: first.id, properties: props })
      : notion.pages.create({ parent: { database_id: databaseId }, properties: props }),
  );
}

/**
 * The +1's name and meal for a host, from their own row when there is one,
 * else from the older host-row columns.
 */
export function readPlusOne(host: any, guestRow: any | undefined): { bringing: boolean; name: string; mealLabel: string } {
  const p = host?.properties ?? {};
  if (guestRow) {
    const g = guestRow.properties ?? {};
    const name = text(g.Name);
    // "Alex's guest" is the placeholder for a +1 with no name given.
    const firstName = text(p.Name).trim().split(/\s+/)[0] || "Guest";
    return { bringing: true, name: name === `${firstName}'s guest` ? "" : name, mealLabel: readChoice(g.Meal) };
  }
  return {
    bringing: readChoice(p["+1"]) === "Yes",
    name: text(p[LEGACY_GUEST_NAME]),
    mealLabel: readChoice(p[LEGACY_GUEST_MEAL]),
  };
}
