"use client";

import { useState, useEffect, FormEvent } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface RegistryItem {
  id:          string;
  name:        string;
  description: string;
  price:       number | null;
  link:        string;
  imageUrl:    string;
  category:    string;
  claimed:     boolean;
  variant:     string; // e.g. "Black/White set, Large size"
}

type Status = "idle" | "submitting" | "success" | "error";

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  selected,
  onToggle,
}: {
  item: RegistryItem;
  selected: boolean;
  onToggle: () => void;
})
 {
  return (
    <div
      className={`flex flex-col border transition-all duration-150 ${
        selected
          ? "border-rose-deep shadow-md"
          : item.claimed
          ? "border-rose-soft/20 opacity-60"
          : "border-rose-soft/30 hover:border-rose-soft"
      } bg-white/70`}
    >
      {/* Image */}
      <div className="aspect-square bg-rose-blush overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
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
        {item.claimed && (
          <span className="inline-block font-sans text-xs tracking-widest uppercase text-rose-deep border border-rose-deep/40 px-2 py-0.5 mb-2 w-fit">
            Reserved
          </span>
        )}
        <p className="font-serif text-bark text-lg leading-snug mb-1">{item.name}</p>
        {item.price !== null && (
          <p className="font-sans text-rose-deep text-sm font-medium mb-2">
            ${item.price.toFixed(2)}
          </p>
        )}
        {item.description && (
          <p className="font-sans text-bark/60 text-sm leading-relaxed mb-2 flex-1">
            {item.description}
          </p>
        )}
        {item.variant && (
          <p className="font-sans text-xs text-bark/80 bg-rose-blush border border-rose-soft/40 px-2 py-1 mb-3 w-fit">
            <span className="text-rose-deep font-medium">Preferred:</span> {item.variant}
          </p>
        )}

        <div className="flex items-center gap-3 mt-auto pt-3 border-t border-rose-soft/20">
          {item.link && (
            <a
              href={item.link.match(/^https?:\/\//) ? item.link : `https://${item.link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs tracking-widest uppercase text-bark/50 hover:text-rose-deep transition-colors"
            >
              View Item ↗
            </a>
          )}
          {!item.claimed && (
            <button
              onClick={onToggle}
              className={`ml-auto flex items-center gap-2 font-sans text-xs tracking-widest uppercase transition-all px-3 py-1.5 border ${
                selected
                  ? "bg-rose-deep text-white border-rose-deep"
                  : "border-rose-soft/50 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
              }`}
            >
              <span className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                selected ? "border-white bg-white/20" : "border-bark/40"
              }`}>
                {selected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {selected ? "Selected" : "Select"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main registry page ────────────────────────────────────────────────────────

export default function RegistryPage() {
  const [items,    setItems]    = useState<RegistryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [status,   setStatus]   = useState<Status>("idle");

  // Cash fund state
  const [cashName,   setCashName]   = useState("");
  const [cashEmail,  setCashEmail]  = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashMethod, setCashMethod] = useState<"venmo"|"paypal"|"zelle"|"cash"|"">("");
  const [cashNote,   setCashNote]   = useState("");
  const [cashStatus, setCashStatus] = useState<Status>("idle");

  useEffect(() => {
    fetch("/api/registry")
      .then((r) => r.json())
      .then((data) => { setItems(data.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category))).sort()];

  const filtered = filter === "All" ? items : items.filter((i) => i.category === filter);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected.size || !email || !name) return;
    setStatus("submitting");

    const chosenItems = items
      .filter((i) => selected.has(i.id))
      .map(({ id, name, price, link, variant }) => ({ id, name, price, link, variant }));

    try {
      const res = await fetch("/api/registry/claim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ guestName: name, email, items: chosenItems }),
      });
      if (!res.ok) throw new Error();

      // Mark claimed locally
      setItems((prev) =>
        prev.map((i) =>
          selected.has(i.id) ? { ...i, claimed: true } : i
        )
      );
      setSelected(new Set());
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  async function handleCashSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cashEmail || !cashName || !cashMethod) return;
    setCashStatus("submitting");
    try {
      const res = await fetch("/api/registry/cash", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ guestName: cashName, email: cashEmail, amount: cashAmount, method: cashMethod, note: cashNote }),
      });
      if (!res.ok) throw new Error();
      setCashStatus("success");
    } catch {
      setCashStatus("error");
    }
  }

  const METHODS = [
    { id: "venmo",  label: "Venmo" },
    { id: "paypal", label: "PayPal" },
    { id: "zelle",  label: "Zelle" },
    { id: "cash",   label: "Cash on the day of" },
  ] as const;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-rose-blush pt-24 pb-32 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <h2 className="section-title mt-8">Registry</h2>
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
          <p className="text-center font-sans text-bark/60 text-sm mb-10 -mt-4 max-w-lg mx-auto">
            Select the items you'd like to gift, enter your email, and we'll send
            you the purchase links — no account needed.
          </p>

          {/* Category filters */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`font-sans text-xs tracking-widest uppercase px-4 py-2 border transition-all ${
                    filter === cat
                      ? "bg-rose-deep text-white border-rose-deep"
                      : "border-rose-soft/50 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Items grid */}
          {loading ? (
            <p className="text-center font-serif italic text-bark/50 py-20">
              Loading registry…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center font-sans text-bark/40 py-20">
              No items in this category yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          )}
          {/* Cash fund */}
          <div className="mt-20 border-t border-rose-soft/40 pt-16">
            <h3 className="font-serif text-3xl text-bark text-center mb-2">Cash Fund</h3>
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className="block h-px w-12 bg-gold" />
              <span className="text-gold">✦</span>
              <span className="block h-px w-12 bg-gold" />
            </div>
            <p className="text-center font-sans text-bark/60 text-sm mb-10 max-w-md mx-auto">
              If you'd prefer to contribute to our honeymoon fund, fill out the form
              below and we'll send you payment details by email.
            </p>

            {cashStatus === "success" ? (
              <div className="max-w-md mx-auto text-center py-10 bg-white/60 border border-rose-soft/30">
                <p className="text-4xl mb-4">💛</p>
                <p className="font-serif text-2xl text-bark mb-2">Thank You!</p>
                <p className="font-sans text-bark/60 text-sm">Check your inbox for payment details.</p>
              </div>
            ) : (
              <form onSubmit={handleCashSubmit} className="max-w-md mx-auto bg-white/60 border border-rose-soft/30 p-8 space-y-5">
                {/* Name + email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">Name *</label>
                    <input required type="text" value={cashName} onChange={e => setCashName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep" />
                  </div>
                  <div>
                    <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">Email *</label>
                    <input required type="email" value={cashEmail} onChange={e => setCashEmail(e.target.value)}
                      placeholder="jane@email.com"
                      className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep" />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">Amount <span className="normal-case tracking-normal">(optional)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bark/40 font-sans text-sm">$</span>
                    <input type="number" min="1" value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                      placeholder="0"
                      className="w-full border border-rose-soft/60 bg-white/80 pl-7 pr-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep" />
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">Payment Method *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {METHODS.map(m => (
                      <button key={m.id} type="button" onClick={() => setCashMethod(m.id)}
                        className={`py-2.5 border font-sans text-sm tracking-wide transition-all ${
                          cashMethod === m.id
                            ? "bg-rose-deep text-white border-rose-deep"
                            : "border-rose-soft/60 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">Leave a note <span className="normal-case tracking-normal">(optional)</span></label>
                  <textarea rows={2} value={cashNote} onChange={e => setCashNote(e.target.value)}
                    placeholder="A kind word..."
                    className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep resize-none" />
                </div>

                {cashStatus === "error" && (
                  <p className="text-red-500 text-xs text-center font-sans">Something went wrong. Please try again.</p>
                )}

                <button type="submit" disabled={!cashName || !cashEmail || !cashMethod || cashStatus === "submitting"}
                  className="w-full btn-primary disabled:opacity-50">
                  {cashStatus === "submitting" ? "Sending…" : "Send Payment Details"}
                </button>
              </form>
            )}
          </div>

        </div>
      </main>

      {/* Sticky claim bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-crimson-darkest border-t border-rose-soft/20 transition-all duration-300 ${
          selected.size > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {status === "success" ? (
          <div className="max-w-5xl mx-auto px-6 py-4 text-center">
            <p className="font-serif text-rose-blush text-lg">
              💌 Check your inbox — your picks are on their way!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <p className="font-sans text-rose-blush/70 text-sm shrink-0">
                {selected.size} item{selected.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex flex-1 gap-3 w-full">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="flex-1 min-w-0 bg-white/10 border border-rose-soft/30 text-rose-blush placeholder-rose-blush/30 px-4 py-2.5 font-sans text-sm focus:outline-none focus:border-rose-soft"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 min-w-0 bg-white/10 border border-rose-soft/30 text-rose-blush placeholder-rose-blush/30 px-4 py-2.5 font-sans text-sm focus:outline-none focus:border-rose-soft"
                />
                <button
                  type="submit"
                  disabled={status === "submitting" || !name || !email}
                  className="shrink-0 bg-rose-deep text-white font-sans text-xs tracking-widest uppercase px-6 py-2.5 hover:bg-crimson-dark transition-colors disabled:opacity-50"
                >
                  {status === "submitting" ? "Sending…" : "Send to Email"}
                </button>
              </div>
            </div>
            {status === "error" && (
              <p className="text-red-400 text-xs font-sans mt-2 text-center">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        )}
      </div>

      <Footer />
    </>
  );
}
