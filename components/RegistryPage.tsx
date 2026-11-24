"use client";

import { useState, useEffect, FormEvent } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SparkleTitle from "./SparkleTitle";
import { SHIPPING_LINES, SHIPPING_TEXT } from "@/lib/shipping";
import {
  groupItems, optionLabel, sortGroups, groupInRange, PRICE_RANGES, wanted, remaining,
  type RegistryItem, type RegistryGroup, type SortMode,
} from "@/lib/registry";

type Status = "idle" | "submitting" | "success" | "error";

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({
  group,
  basket,
  onSet,
  qtyOf,
  onQty,
}: {
  group: RegistryGroup;
  /** Every option id currently in the guest's basket. */
  basket: Set<string>;
  /** Put an option of this gift in the basket (true) or take it out (false). */
  onSet: (optionId: string, on: boolean) => void;
  /** How many of an option the guest is taking. */
  qtyOf: (optionId: string) => number;
  onQty: (optionId: string, qty: number) => void;
}) {
  const { lead, options, claimed, multiple } = group;
  // A one-of gift someone has started buying shows only that option.
  const pickerOptions = group.shown;
  const hasOptions = pickerOptions.length > 1;
  const isOpen = (o: { id: string }) => group.available.some((a) => a.id === o.id);

  const inBasket = options.filter((o) => basket.has(o.id));
  const selected = inBasket.length > 0;
  // A one-of gift has at most one option in the basket, and the card follows it.
  const singleSelectedId = !multiple && selected ? inBasket[0].id : null;

  // Which option the card is showing: the one in the basket for a one-of
  // gift; otherwise the one last clicked, starting from the cheapest option
  // still open, so the card leads with its lowest available price point.
  const firstOpen = group.available[0] ?? group.shown[0] ?? lead;
  const [viewingId, setViewingId] = useState(firstOpen.id);
  const shown = pickerOptions.find((o) => o.id === (singleSelectedId ?? viewingId)) ?? firstOpen;
  const shownWanted = wanted(shown);
  const shownLeft = remaining(shown);
  const shownImage = shown.imageUrl || lead.imageUrl;
  const shownSelected = basket.has(shown.id);

  function chooseOption(id: string) {
    setViewingId(id);
    // Switching options of a one-of gift while in the basket swaps it over.
    if (singleSelectedId) onSet(id, true);
  }

  return (
    <div
      className={`flex flex-col border transition-all duration-150 ${
        selected
          ? "border-rose-deep shadow-md"
          : claimed
          ? "border-rose-soft/20 opacity-60"
          : "border-rose-soft/30 hover:border-rose-soft"
      } bg-white/70`}
    >
      {/* Image — follows the chosen option, falling back to the lead row's
          picture for options that have none of their own. */}
      <div className="aspect-square bg-rose-blush overflow-hidden">
        {shownImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={shownImage}
            src={shownImage}
            alt={shown.option ? `${lead.name} — ${shown.option}` : lead.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-rose-soft/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {claimed && (
          <span className="inline-block font-sans text-xs tracking-widest uppercase text-rose-deep border border-rose-deep/40 px-2 py-0.5 mb-2 w-fit">
            Reserved
          </span>
        )}
        {/* Fixed-height header — reserves room for a two-line name and a
            two-line description whether or not this card uses it, so the
            option pickers line up across the row. */}
        <p className="font-serif text-bark text-lg leading-snug mb-1 line-clamp-2 min-h-[3.1rem]">
          {lead.name}
        </p>

        <p className="font-sans text-rose-deep text-sm font-medium mb-2 min-h-[1.25rem]">
          {shown.price !== null && (
            <>
              ${shown.price.toFixed(2)}
              <span className="ml-1 text-[10px] tracking-widest uppercase text-bark/40 font-normal">MSRP</span>
              {hasOptions && !singleSelectedId && (
                <span className="text-bark/40 font-normal"> · {pickerOptions.length} options</span>
              )}
            </>
          )}
        </p>
        {shownWanted > 1 && (
          <p className="font-sans text-xs text-bark/60 -mt-1 mb-2">
            We&apos;d love {shownWanted}
            {shownLeft < shownWanted && (
              <> · <span className="text-rose-deep">{shownLeft > 0 ? `${shownLeft} left` : "all claimed"}</span></>
            )}
          </p>
        )}

        <p className="font-sans text-bark/60 text-sm leading-relaxed mb-3 line-clamp-2 min-h-[2.85rem]">
          {lead.description}
        </p>

        {/* Price-point options */}
        {hasOptions && !claimed && (
          <div className="mb-3">
            <p className="font-sans text-xs tracking-widest uppercase text-bark/50 mb-1.5">
              {multiple ? "Choose any" : "Choose one"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pickerOptions.map((o) => {
                const active = o.id === shown.id;
                const taken = !isOpen(o);
                const picked = multiple && basket.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => chooseOption(o.id)}
                    aria-pressed={active}
                    className={`font-sans text-xs px-2.5 py-1.5 border transition-all text-left ${
                      active
                        ? "border-rose-deep text-rose-deep bg-rose-blush/60"
                        : taken
                        ? "border-rose-soft/30 text-bark/35"
                        : "border-rose-soft/50 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                    }`}
                  >
                    {picked && <span aria-hidden="true">✓ </span>}
                    <span className={taken ? "line-through" : ""}>{optionLabel(o)}</span>
                    {taken && <span className="sr-only"> (taken)</span>}
                    {picked && <span className="sr-only"> (selected)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto">
          {shown.variant && (
            <p className="font-sans text-xs text-bark/80 bg-rose-blush border border-rose-soft/40 px-2 py-1 mb-3 w-fit">
              <span className="text-rose-deep font-medium">Preferred:</span> {shown.variant}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 border-t border-rose-soft/20">
          {shown.link && (
            <a
              href={shown.link.match(/^https?:\/\//) ? shown.link : `https://${shown.link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs tracking-widest uppercase text-bark/50 hover:text-rose-deep transition-colors"
            >
              View Item ↗
            </a>
          )}
          {!claimed && !isOpen(shown) && (
            <span className="ml-auto font-sans text-xs tracking-widest uppercase text-bark/40 px-3 py-1.5">
              Taken
            </span>
          )}
          {!claimed && isOpen(shown) && shownSelected && shownLeft > 1 && (
            <label className="ml-auto flex items-center gap-1.5 font-sans text-xs text-bark/60">
              Qty
              <select
                value={qtyOf(shown.id)}
                onChange={(e) => onQty(shown.id, Number(e.target.value))}
                className="border border-rose-soft/50 bg-white/80 px-1.5 py-1 text-xs text-bark focus:outline-none focus:border-rose-deep"
              >
                {Array.from({ length: shownLeft }, (_, n) => n + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          {!claimed && isOpen(shown) && (
            <button
              onClick={() => onSet(shown.id, !shownSelected)}
              className={`${shownSelected && shownLeft > 1 ? "" : "ml-auto "}flex items-center gap-2 font-sans text-xs tracking-widest uppercase transition-all px-3 py-1.5 border ${
                shownSelected
                  ? "bg-rose-deep text-white border-rose-deep"
                  : "border-rose-soft/50 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
              }`}
            >
              <span className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                shownSelected ? "border-white bg-white/20" : "border-bark/40"
              }`}>
                {shownSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {shownSelected ? "Selected" : "Select"}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter controls ───────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`font-sans text-xs px-3 py-1.5 border transition-all ${
        active
          ? "bg-rose-deep text-white border-rose-deep"
          : "border-rose-soft/50 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-2">
      <span className="font-sans text-xs tracking-widest uppercase text-bark/40 sm:w-20 sm:text-right shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ── Main registry page ────────────────────────────────────────────────────────

export default function RegistryPage() {
  const [items,    setItems]    = useState<RegistryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("All");
  const [rangeId,  setRangeId]  = useState<string | null>(null);
  const [sort,     setSort]     = useState<SortMode>("featured");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // How many of each selected option (1 unless the guest picks more).
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [status,   setStatus]   = useState<Status>("idle");
  const [copied,   setCopied]   = useState(false);
  const [taken,    setTaken]    = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");


  /** Fetch the registry; false when it couldn't be loaded. */
  async function fetchItems(): Promise<RegistryItem[] | null> {
    try {
      const res = await fetch("/api/registry", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.error || !Array.isArray(data.items)) return null;
      return data.items;
    } catch {
      return null;
    }
  }

  async function load() {
    setLoading(true);
    const fresh = await fetchItems();
    if (fresh) setItems(fresh);
    setLoadError(!fresh);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category))).sort()];

  const groups = groupItems(items);
  const range   = PRICE_RANGES.find((r) => r.id === rangeId) ?? null;

  const filtered = sortGroups(
    groups
      .filter((g) => filter === "All" || g.lead.category === filter)
      .filter((g) => !range || groupInRange(g, range)),
    sort
  );

  const filtersActive = filter !== "All" || range !== null;

  const byId = new Map(items.map((i) => [i.id, i]));
  /** Chosen quantity, never more than what's left. */
  function qtyOf(id: string): number {
    const item = byId.get(id);
    const left = item ? remaining(item) : 1;
    return Math.max(1, Math.min(qty[id] ?? 1, left || 1));
  }
  const basketCount = Array.from(selected).reduce((n, id) => n + qtyOf(id), 0);

  function clearFilters() {
    setFilter("All");
    setRangeId(null);
  }

  /**
   * Put an option of a gift in the basket or take it out. A one-of gift
   * holds at most one option, so any sibling already selected is dropped
   * first; a gift that allows multiple can hold several.
   */
  function setOption(group: RegistryGroup, optionId: string, on: boolean) {
    setTaken([]);
    if (status === "success" || status === "error") setStatus("idle");
    setSelected((prev) => {
      const next = new Set(prev);
      if (on && !group.multiple) for (const o of group.options) next.delete(o.id);
      if (on) next.add(optionId);
      else next.delete(optionId);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected.size || !email || !name) return;
    setStatus("submitting");
    setTaken([]);

    setErrorMsg("");
    // Only ids: the server looks up each gift's details itself.
    const chosen = items.filter((i) => selected.has(i.id)).map((i) => ({ id: i.id, qty: qtyOf(i.id) }));

    try {
      const res = await fetch("/api/registry/claim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ guestName: name, email, items: chosen }),
      });
      if (res.status === 409) {
        // Someone claimed one of these while this page was open. Refresh, and
        // keep the guest's other picks that are still available.
        const data = await res.json().catch(() => ({}));
        setTaken(data.items ?? []);
        const fresh = await fetchItems();
        if (fresh) {
          setItems(fresh);
          const open = new Set(groupItems(fresh).flatMap((g) => g.available.map((i) => i.id)));
          setSelected((prev) => new Set(Array.from(prev).filter((id) => open.has(id))));
        } else {
          setSelected(new Set());
        }
        setStatus("idle");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          data.error === "email-failed"
            ? "We couldn't send the email, so nothing was reserved. Please try again in a minute."
            : data.error === "email-invalid"
            ? "Please check your email address."
            : data.error === "rate-limited"
            ? "Too many tries for now. Please wait a bit and try again."
            : "Something went wrong. Please try again.",
        );
        throw new Error();
      }

      // Reload, so counts and closed options match what the server recorded.
      const fresh = await fetchItems();
      if (fresh) setItems(fresh);
      setSelected(new Set());
      setQty({});
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }


  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-rose-blush pt-24 pb-32 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <SparkleTitle as="h1" text="Registry" className="mt-8" />
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
          <p className="text-center font-sans text-bark/60 text-sm mb-5 -mt-4 max-w-lg mx-auto">
            Select the items you'd like to gift, enter your email, and we'll send
            you the purchase links — no account needed.
          </p>
          <p className="text-center font-sans text-bark/70 text-sm leading-relaxed mb-10 max-w-lg mx-auto border border-gold/30 bg-white/50 px-5 py-3">
            <span className="font-serif italic text-gold">A note on prices:</span>{" "}
            prices shown are the retail price (MSRP), just for reference. You&apos;re free
            to buy any gift wherever you like, and if you find it for less elsewhere,
            please do. We&apos;d encourage it!
          </p>

          {/* Filters — category, price, sort */}
          <div className="max-w-3xl mx-auto mb-10 bg-white/50 border border-rose-soft/30 px-5 py-4">
            <div className="space-y-3">
              {categories.length > 1 && (
                <FilterRow label="Category">
                  {categories.map((cat) => (
                    <FilterChip
                      key={cat}
                      active={filter === cat}
                      onClick={() => setFilter(cat)}
                    >
                      {cat}
                    </FilterChip>
                  ))}
                </FilterRow>
              )}

              <FilterRow label="Price">
                <FilterChip active={rangeId === null} onClick={() => setRangeId(null)}>
                  Any
                </FilterChip>
                {PRICE_RANGES.map((r) => (
                  <FilterChip
                    key={r.id}
                    active={rangeId === r.id}
                    onClick={() => setRangeId(rangeId === r.id ? null : r.id)}
                  >
                    {r.label}
                  </FilterChip>
                ))}
              </FilterRow>

              <FilterRow label="Sort">
                <select
                  id="registry-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="font-sans text-xs text-bark/70 bg-white/80 border border-rose-soft/50 px-3 py-1.5 focus:outline-none focus:border-rose-deep"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </FilterRow>
            </div>

            {/* Result count */}
            <div className="flex justify-center items-center gap-2 mt-4 pt-3 border-t border-rose-soft/20">
              <p className="font-sans text-xs text-bark/40">
                {filtered.length} {filtered.length === 1 ? "gift" : "gifts"}
              </p>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="font-sans text-xs text-bark/40 underline underline-offset-2 hover:text-rose-deep transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Items grid */}
          {loading ? (
            <p className="text-center font-serif italic text-bark/50 py-20">
              Loading registry…
            </p>
          ) : loadError ? (
            <div role="alert" className="text-center py-20">
              <p className="font-sans text-bark/70 text-sm mb-4">
                We couldn&apos;t load the registry just now.
              </p>
              <button type="button" onClick={load} className="btn-outline">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center font-sans text-bark/40 py-20">
              {filtersActive
                ? "No gifts match these filters."
                : "No items in this category yet."}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map((group) => (
                <ItemCard
                  key={group.key}
                  group={group}
                  basket={selected}
                  onSet={(optionId, on) => setOption(group, optionId, on)}
                  qtyOf={qtyOf}
                  onQty={(optionId, n) => setQty((q) => ({ ...q, [optionId]: n }))}
                />
              ))}
            </div>
          )}
          {/* Cash gifts: on the day only */}
          <div className="mt-20 border-t border-rose-soft/40 pt-16 text-center">
            <h2 className="font-serif text-3xl text-bark mb-2">Cash Gifts</h2>
            <div className="flex items-center justify-center gap-3 mb-6" aria-hidden="true">
              <span className="block h-px w-12 bg-gold" />
              <span className="text-gold">✦</span>
              <span className="block h-px w-12 bg-gold" />
            </div>
            <p className="font-sans text-bark/70 text-sm leading-relaxed max-w-md mx-auto">
              If you&apos;d rather give cash, you&apos;re welcome to bring it with you on
              the day. No need to let us know ahead of time.
            </p>
          </div>

        </div>
      </main>

      {/* Sticky claim bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-crimson-darkest border-t border-rose-soft/20 transition-all duration-300 ${
          selected.size > 0 || status === "success" || taken.length > 0
            ? "translate-y-0"
            : "translate-y-full"
        }`}
      >
        {status === "success" ? (
          <div className="max-w-5xl mx-auto px-6 py-5">
            <p className="font-serif text-rose-blush text-lg text-center mb-4">
              💌 Check your inbox — your picks are on their way!
            </p>

            {/* Shipping address — also repeated in the email */}
            <div className="max-w-md mx-auto border border-rose-soft/30 bg-white/10 px-5 py-4">
              <p className="font-sans text-xs tracking-widest uppercase text-rose-soft mb-2">
                Ship gifts to
              </p>
              <address className="not-italic font-serif text-rose-blush text-lg leading-snug">
                {SHIPPING_LINES.map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </address>
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(SHIPPING_TEXT);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* clipboard blocked — the address is on screen to copy by hand */
                    }
                  }}
                  className="font-sans text-xs tracking-widest uppercase text-rose-blush/70 border border-rose-soft/30 px-3 py-1.5 hover:text-rose-blush hover:border-rose-soft transition-colors"
                >
                  {copied ? "Copied ✓" : "Copy address"}
                </button>
                <p className="font-sans text-xs text-rose-blush/50 leading-snug">
                  Use this at checkout as the delivery address.
                </p>
              </div>
            </div>
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="font-sans text-xs tracking-widest uppercase text-rose-blush/70 underline underline-offset-4 hover:text-rose-blush"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <p className="font-sans text-rose-blush/70 text-sm shrink-0">
                {basketCount} item{basketCount !== 1 ? "s" : ""} selected
              </p>
              <div className="flex flex-col sm:flex-row flex-1 gap-3 w-full">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                  autoComplete="name"
                  required
                  className="flex-1 min-w-0 bg-white/10 border border-rose-soft/30 text-rose-blush placeholder-rose-blush/30 px-4 py-2.5 font-sans text-sm focus:outline-none focus:border-rose-soft"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  aria-label="Your email"
                  autoComplete="email"
                  required
                  className="flex-1 min-w-0 bg-white/10 border border-rose-soft/30 text-rose-blush placeholder-rose-blush/30 px-4 py-2.5 font-sans text-sm focus:outline-none focus:border-rose-soft"
                />
                <button
                  type="submit"
                  disabled={status === "submitting" || !name || !email}
                  className="shrink-0 w-full sm:w-auto bg-rose-deep text-white font-sans text-xs tracking-widest uppercase px-6 py-2.5 hover:bg-crimson-dark transition-colors disabled:opacity-50"
                >
                  {status === "submitting" ? "Sending…" : "Send to Email"}
                </button>
              </div>
            </div>
            {status === "error" && (
              <p role="alert" className="text-red-300 text-xs font-sans mt-2 text-center">
                {errorMsg || "Something went wrong. Please try again."}
              </p>
            )}
            {taken.length > 0 && (
              <p className="text-rose-soft text-xs font-sans mt-2 text-center">
                Just taken by another guest: {taken.join(", ")}. The registry has
                been refreshed; your other picks are still selected.
              </p>
            )}
          </form>
        )}
      </div>

      <Footer />
    </>
  );
}
