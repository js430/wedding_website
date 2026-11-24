/**
 * Grouping rules for registry items.
 *
 * A gift that comes at several price points (a 20-piece vs 45-piece flatware
 * set, say) is stored as one Notion row per option, all sharing the same
 * `Group` value. The site renders each group as a single card with an option
 * picker, and claiming any one option closes the whole group.
 *
 * Unless the group allows multiple: tick `Allow Multiple` on any of its rows
 * and each option is claimed on its own, so a guest can take one candle
 * scent and leave the others open for someone else, or take several at once.
 * The card closes only when every option is taken.
 *
 * Quantities: `Quantity` (number, blank = 1) is how many of a row the couple
 * wants; the site keeps `Quantity Claimed` (number) up to date. A guest can
 * claim any number up to what's left, and the row stays open until all are
 * claimed. In a one-of group, the first purchase picks the option: the other
 * options close and only that one stays open until its quantity is met (so a
 * pair of lamps always matches).
 *
 * A row with a blank `Group` is a standalone gift and becomes a group of one,
 * so the rest of the page can treat everything uniformly.
 */

export interface RegistryItem {
  id:          string;
  name:        string;
  description: string;
  price:       number | null;
  link:        string;
  imageUrl:    string;
  category:    string;
  claimed:     boolean;
  variant:     string;
  group:       string;
  option:      string;
  /** The row's `Allow Multiple` checkbox. */
  multiple?:   boolean;
  /** How many the couple wants (`Quantity`; blank = 1). */
  quantity?:   number;
  /** How many guests have claimed so far (`Quantity Claimed`; blank = none recorded). */
  claimedCount?: number | null;
}

/** How many of this option the couple wants. */
export function wanted(item: RegistryItem): number {
  const q = Math.floor(item.quantity ?? 1);
  return Number.isFinite(q) && q > 1 ? q : 1;
}

/**
 * How many have been bought. A row ticked Claimed without a recorded count
 * (older rows, or a one-of option closed because a sibling was chosen gets
 * an explicit 0) counts as fully bought.
 */
export function bought(item: RegistryItem): number {
  if (typeof item.claimedCount === "number") return Math.max(0, item.claimedCount);
  return item.claimed ? wanted(item) : 0;
}

/** How many a guest can still claim. */
export function remaining(item: RegistryItem): number {
  if (item.claimed) return 0;
  return Math.max(0, wanted(item) - (typeof item.claimedCount === "number" ? item.claimedCount : 0));
}

export interface RegistryGroup {
  /** Stable key: the Group value, or the row id for standalone gifts. */
  key:     string;
  /** The row whose fields represent the group (name, image, description). */
  lead:    RegistryItem;
  /** Every option, cheapest first. Length 1 for a standalone gift. */
  options: RegistryItem[];
  /**
   * True when the gift is closed: once ANY option is taken, or for a group
   * that allows multiple, once EVERY option is taken.
   */
  claimed: boolean;
  /** Options are claimed independently (`Allow Multiple` ticked on any row). */
  multiple: boolean;
  /**
   * For a one-of gift: the option someone has already bought. The gift is
   * then that option only (e.g. the second lamp of a pair must match).
   */
  locked: RegistryItem | null;
  /** Options a guest can pick right now. */
  available: RegistryItem[];
  /** Options to show in the picker: a locked one-of gift shows only its option. */
  shown: RegistryItem[];
}

/** Label for one option, falling back to price or name when Option is blank. */
export function optionLabel(item: RegistryItem): string {
  if (item.option) return item.option;
  if (item.price !== null) return `$${item.price.toFixed(2)}`;
  return item.name;
}

export function groupItems(items: RegistryItem[]): RegistryGroup[] {
  const byKey = new Map<string, RegistryItem[]>();

  for (const item of items) {
    const key = item.group.trim() || item.id;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(item);
    else byKey.set(key, [item]);
  }

  return Array.from(byKey, ([key, options]) => {
    options.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    const multiple = options.length > 1 && options.some((o) => o.multiple === true);
    const locked = !multiple && options.length > 1 ? options.find((o) => bought(o) > 0) ?? null : null;
    const available = options.filter((o) => remaining(o) > 0 && (!locked || o.id === locked.id));
    return {
      key,
      lead:    options[0],
      options,
      claimed: available.length === 0,
      multiple,
      locked,
      available,
      shown:   locked ? [locked] : options,
    };
  });
}

/** Cheapest option price in a group, or null when no option is priced. */
export function groupMinPrice(group: RegistryGroup): number | null {
  const prices = group.options
    .map((o) => o.price)
    .filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : null;
}

export interface PriceRange {
  id:    string;
  label: string;
  min:   number;
  max:   number;
}

/** Budget brackets offered to guests. `max: Infinity` is the open top end. */
export const PRICE_RANGES: PriceRange[] = [
  { id: "u100",    label: "<$100",      min: 0,   max: 100 },
  { id: "100-250", label: "$100–$250",  min: 100, max: 250 },
  { id: "250-500", label: "$250–$500",  min: 250, max: 500 },
  { id: "500+",    label: "$500+",      min: 500, max: Infinity },
];

/**
 * True when any option in the group falls inside the bracket. A multi-option
 * gift is therefore shown to a guest whose budget matches any one of its
 * price points, not only its cheapest.
 */
export function groupInRange(group: RegistryGroup, range: PriceRange): boolean {
  // Upper bound exclusive, so a $100 gift sits in "$100–$250" only, not in
  // "<$100" too.
  return group.options.some(
    (o) => o.price !== null && o.price >= range.min && o.price < range.max
  );
}

export type SortMode = "featured" | "price-asc" | "price-desc";

/** Sort a copy of the groups. Unpriced gifts always sort last. */
export function sortGroups(groups: RegistryGroup[], mode: SortMode): RegistryGroup[] {
  if (mode === "featured") return groups;
  const dir = mode === "price-asc" ? 1 : -1;
  return [...groups].sort((a, b) => {
    const pa = groupMinPrice(a);
    const pb = groupMinPrice(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (pa - pb) * dir;
  });
}
