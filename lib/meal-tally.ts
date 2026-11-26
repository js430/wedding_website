import { MEAL_OPTIONS } from "@/lib/meals";

/**
 * One RSVP row from Notion, flattened. Kept separate so counting needs no
 * database. A +1 normally has a row of their own (guestOf = the host's
 * email); older rows may instead carry the +1 in guestName/guestMealLabel.
 */
export interface RsvpRow {
  name: string; attending: boolean; plusOne: boolean; guestName: string;
  mealLabel: string; guestMealLabel: string; dietary: string;
  /** Host row: its email. */
  email?: string;
  /** +1 row: the host's email; "" for a host row. */
  guestOf?: string;
}

export interface MealTally {
  counts: { id: string; label: string; kind: "main" | "special"; count: number }[];
  plates: number;
  rsvpsAttending: number;
  unrecognized: { label: string; count: number }[];
  missing: { name: string; who: "guest" | "plus-one" }[];
  allergies: { name: string; note: string }[];
}

/** Count plates for the caterer. Declined RSVPs are ignored entirely. */
export function tallyMeals(rows: RsvpRow[]): MealTally {
  const byLabel = new Map<string, number>(MEAL_OPTIONS.map((m) => [m.label, 0]));
  const other   = new Map<string, number>();
  const missing: MealTally["missing"]     = [];
  const allergies: MealTally["allergies"] = [];
  let plates = 0;
  let rsvpsAttending = 0;

  function plate(label: string, name: string, who: "guest" | "plus-one") {
    plates++;
    const l = label.trim();
    if (!l) { missing.push({ name, who }); return; }
    if (byLabel.has(l)) byLabel.set(l, (byLabel.get(l) ?? 0) + 1);
    else other.set(l, (other.get(l) ?? 0) + 1);
  }

  // Hosts whose +1 has a row of their own: their older +1 columns are ignored.
  const hasOwnRow = new Set(rows.filter((r) => r.guestOf).map((r) => r.guestOf!.toLowerCase()));

  for (const row of rows) {
    if (!row.attending) continue;
    if (row.guestOf) {
      plate(row.mealLabel, row.name, "plus-one");
      continue;
    }
    rsvpsAttending++;
    plate(row.mealLabel, row.name, "guest");
    if (row.plusOne && !hasOwnRow.has((row.email ?? "").toLowerCase())) {
      plate(row.guestMealLabel, row.guestName.trim() || `${row.name}'s guest`, "plus-one");
    }
    const note = row.dietary.trim();
    if (note) allergies.push({ name: row.name, note });
  }

  return {
    counts: MEAL_OPTIONS.map((m) => ({ id: m.id, label: m.label, kind: m.kind, count: byLabel.get(m.label) ?? 0 })),
    plates,
    rsvpsAttending,
    unrecognized: Array.from(other.entries()).map(([label, count]) => ({ label, count })),
    missing,
    allergies,
  };
}
