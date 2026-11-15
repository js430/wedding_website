import { MEAL_OPTIONS } from "@/lib/meals";

/** One RSVP row from Notion, flattened. Kept separate so counting needs no database. */
export interface RsvpRow {
  name: string; attending: boolean; plusOne: boolean; guestName: string;
  mealLabel: string; guestMealLabel: string; dietary: string;
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

  for (const row of rows) {
    if (!row.attending) continue;
    rsvpsAttending++;
    plate(row.mealLabel, row.name, "guest");
    if (row.plusOne) {
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
