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
