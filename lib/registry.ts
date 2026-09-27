/**
 * Grouping rules for registry items.
 *
 * A gift that comes at several price points (a 20-piece vs 45-piece flatware
 * set, say) is stored as one Notion row per option, all sharing the same
 * `Group` value. The site renders each group as a single card with an option
 * picker, and claiming any one option closes the whole group.
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
}

export interface RegistryGroup {
  /** Stable key: the Group value, or the row id for standalone gifts. */
  key:     string;
  /** The row whose fields represent the group (name, image, description). */
  lead:    RegistryItem;
  /** Every option, cheapest first. Length 1 for a standalone gift. */
  options: RegistryItem[];
  /** True once ANY option has been taken — the whole gift is then closed. */
  claimed: boolean;
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
    return {
      key,
      lead:    options[0],
      options,
      claimed: options.some((o) => o.claimed),
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
  { id: "u50",     label: "Under $50",  min: 0,   max: 50 },
  { id: "50-100",  label: "$50–$100",   min: 50,  max: 100 },
  { id: "100-250", label: "$100–$250",  min: 100, max: 250 },
  { id: "250+",    label: "$250+",      min: 250, max: Infinity },
];

/**
 * True when any option in the group falls inside the bracket. A multi-option
 * gift is therefore shown to a guest whose budget matches any one of its
 * price points, not only its cheapest.
 */
export function groupInRange(group: RegistryGroup, range: PriceRange): boolean {
  return group.options.some(
    (o) => o.price !== null && o.price >= range.min && o.price <= range.max
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
