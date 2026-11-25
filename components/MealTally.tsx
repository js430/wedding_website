"use client";

import { useState, FormEvent } from "react";
import type { MealTally as Tally } from "@/lib/meal-tally";

/** Private meal-count page for the caterer, gated on ADMIN_PASSWORD. */
export default function MealTally() {
  const [password, setPassword] = useState("");
  const [data,     setData]     = useState<Tally | null>(null);
  const [state,    setState]    = useState<"idle" | "loading" | "denied" | "locked" | "error">("idle");

  async function load(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/meals", { headers: { "x-admin-password": password } });
      if (res.status === 401) { setState("denied"); return; }
      if (res.status === 429) { setState("locked"); return; }
      if (!res.ok) throw new Error();
      setData(await res.json());
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (data === null) {
    return (
      <main className="min-h-screen bg-rose-blush flex items-center justify-center px-6">
        <form onSubmit={load} className="w-full max-w-sm bg-white/70 border border-rose-soft/40 p-8 space-y-4">
          <p className="font-serif text-2xl text-bark text-center">Meal counts</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            aria-label="Admin password"
            className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
          />
          {state === "denied" && <p className="text-rose-deep text-sm font-sans text-center">Incorrect password.</p>}
          {state === "locked" && <p role="alert" className="text-rose-deep text-sm font-sans text-center">Too many wrong tries from this network. Please wait about 15 minutes, then try again.</p>}
          {state === "error"  && <p className="text-rose-deep text-sm font-sans text-center">Could not load meal counts.</p>}
          <button type="submit" disabled={state === "loading" || !password} className="w-full btn-primary disabled:opacity-50">
            {state === "loading" ? "Loading…" : "View"}
          </button>
        </form>
      </main>
    );
  }

  const mains    = data.counts.filter((c) => c.kind === "main");
  const specials = data.counts.filter((c) => c.kind === "special");

  // One bordered list with a label on the left and a value on the right.
  const List = ({ title, rows }: { title: string; rows: { key: string; left: string; right: string }[] }) => (
    <section className="mb-12">
      <h2 className="font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">{title}</h2>
      <div className="bg-white/60 border border-rose-soft/30">
        {rows.map((r) => (
          <div key={r.key} className="flex items-start justify-between gap-4 px-5 py-3 border-b border-rose-soft/20 last:border-0">
            <span className="font-sans text-sm text-bark min-w-0 break-words">{r.left}</span>
            <span className="font-sans text-sm text-rose-deep font-medium text-right min-w-0 break-words">{r.right}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-rose-blush px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="font-serif text-3xl text-bark mb-1">Meal counts</p>
        <p className="font-sans text-bark/60 text-sm mb-10">
          {data.plates.toLocaleString()} plate{data.plates === 1 ? "" : "s"} from {data.rsvpsAttending.toLocaleString()} attending RSVP{data.rsvpsAttending === 1 ? "" : "s"}
        </p>

        <List title="Mains" rows={mains.map((c) => ({ key: c.id, left: c.label, right: String(c.count) }))} />
        <List title="Special meals" rows={specials.map((c) => ({ key: c.id, left: c.label, right: String(c.count) }))} />

        {data.unrecognized.length > 0 && (
          <List title="Unrecognized" rows={data.unrecognized.map((u) => ({ key: u.label, left: u.label, right: String(u.count) }))} />
        )}
        {data.missing.length > 0 && (
          <List
            title="No meal chosen"
            rows={data.missing.map((m, i) => ({ key: `${m.name}-${m.who}-${i}`, left: m.name, right: m.who === "plus-one" ? "+1" : "Guest" }))}
          />
        )}

        <section>
          <h2 className="font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">Allergies and dietary notes</h2>
          <div className="bg-white/60 border border-rose-soft/30">
            {data.allergies.length === 0 && <p className="font-sans text-sm text-bark/60 p-5">None noted.</p>}
            {data.allergies.map((a, i) => (
              <div key={`${a.name}-${i}`} className="px-5 py-3 border-b border-rose-soft/20 last:border-0">
                <p className="font-sans text-sm text-bark">{a.name}</p>
                <p className="font-sans text-sm text-bark/60 break-words">{a.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
