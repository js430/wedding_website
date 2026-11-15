/**
 * Meal choices offered on the RSVP form.
 *
 * One meal per attending person: the guest picks for themselves, and again
 * for their +1 if they bring one. Caterers count plates, not preferences, so
 * the standard mains and the special meals are a single flat list — a guest
 * choosing the vegan plate is choosing it *instead of* a main, not alongside.
 *
 * Allergies stay in the free-text "Dietary Restrictions" field, because an
 * allergy is a note to the kitchen about a chosen plate, not a plate of
 * its own.
 *
 * Changing an `id` after invitations go out orphans meals already stored in
 * Notion, so change labels freely and ids never.
 */

export type MealKind = "main" | "special";

export interface MealOption {
  /** Stored in Notion. Stable forever once guests have RSVPed. */
  id:    string;
  /** Shown to guests, and written to Notion as the select value. */
  label: string;
  /** One short line under the label. Optional. */
  note?: string;
  kind:  MealKind;
}

export const MEAL_OPTIONS: MealOption[] = [
  // ── The two mains ────────────────────────────────────────────────────────
  { id: "fish", label: "Sea Bass",                kind: "main" },
  { id: "beef", label: "Braised Beef Short Rib",  kind: "main" },

  // ── Special meals, prepared separately ───────────────────────────────────
  { id: "vegetarian",  label: "Vegetarian",  kind: "special" },
  { id: "vegan",       label: "Vegan",       kind: "special" },
  { id: "gluten-free", label: "Gluten-Free", kind: "special" },
  { id: "halal",       label: "Halal",       kind: "special" },
  { id: "kosher",      label: "Kosher",      kind: "special" },
];

export const MAIN_MEALS:    MealOption[] = MEAL_OPTIONS.filter((m) => m.kind === "main");
export const SPECIAL_MEALS: MealOption[] = MEAL_OPTIONS.filter((m) => m.kind === "special");

/** The option for an id, or undefined if the id is unknown. */
export function mealById(id: string): MealOption | undefined {
  return MEAL_OPTIONS.find((m) => m.id === id);
}

/** Guest-facing label for an id. Falls back to the raw id so nothing vanishes. */
export function mealLabel(id: string): string {
  return mealById(id)?.label ?? id;
}

/** True when `id` is one we offer. Used to validate input server-side. */
export function isValidMeal(id: unknown): id is string {
  return typeof id === "string" && MEAL_OPTIONS.some((m) => m.id === id);
}

/**
 * Notion stores the human label, so the database stays readable for the
 * caterer, and reads map back to an id.
 */
export function labelToId(label: string): string {
  return MEAL_OPTIONS.find((m) => m.label === label)?.id ?? "";
}
