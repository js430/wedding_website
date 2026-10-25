"use client";

import { useState, FormEvent } from "react";

interface Row { date: string; path: string; views: number }

/** Private view-count dashboard, gated on ADMIN_PASSWORD. */
export default function AnalyticsDashboard() {
  const [password, setPassword] = useState("");
  const [rows,     setRows]     = useState<Row[] | null>(null);
  const [state,    setState]    = useState<"idle" | "loading" | "denied" | "error">("idle");

  async function load(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/analytics", { headers: { "x-admin-password": password } });
      if (res.status === 401) { setState("denied"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRows(data.rows ?? []);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (rows === null) {
    return (
      <main className="min-h-screen bg-rose-blush flex items-center justify-center px-6">
        <form onSubmit={load} className="w-full max-w-sm bg-white/70 border border-rose-soft/40 p-8 space-y-4">
          <p className="font-serif text-2xl text-bark text-center">Site analytics</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
          />
          {state === "denied" && <p className="text-rose-deep text-sm font-sans text-center">Incorrect password.</p>}
          {state === "error"  && <p className="text-rose-deep text-sm font-sans text-center">Could not load analytics.</p>}
          <button type="submit" disabled={state === "loading" || !password} className="w-full btn-primary disabled:opacity-50">
            {state === "loading" ? "Loading…" : "View"}
          </button>
        </form>
      </main>
    );
  }

  const total   = rows.reduce((n, r) => n + r.views, 0);
  const byPath  = new Map<string, number>();
  const byDate  = new Map<string, number>();
  rows.forEach((r) => {
    byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.views);
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.views);
  });
  const paths = Array.from(byPath.entries()).sort((a, b) => b[1] - a[1]);
  const days  = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  const peak  = Math.max(1, ...days.map(([, v]) => v));

  return (
    <main className="min-h-screen bg-rose-blush px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <p className="font-serif text-3xl text-bark mb-1">Site analytics</p>
        <p className="font-sans text-bark/50 text-sm mb-10">
          {total.toLocaleString()} page view{total === 1 ? "" : "s"} recorded
        </p>

        <section className="mb-12">
          <h2 className="font-sans text-xs tracking-widest uppercase text-bark/50 mb-3">By page</h2>
          <div className="bg-white/60 border border-rose-soft/30">
            {paths.length === 0 && <p className="font-sans text-sm text-bark/40 p-5">Nothing recorded yet.</p>}
            {paths.map(([path, views]) => (
              <div key={path} className="flex items-center justify-between px-5 py-3 border-b border-rose-soft/20 last:border-0">
                <span className="font-sans text-sm text-bark">{path}</span>
                <span className="font-sans text-sm text-rose-deep font-medium">{views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-sans text-xs tracking-widest uppercase text-bark/50 mb-3">Last 30 days</h2>
          <div className="bg-white/60 border border-rose-soft/30 p-5 space-y-1.5">
            {days.length === 0 && <p className="font-sans text-sm text-bark/40">Nothing recorded yet.</p>}
            {days.map(([date, views]) => (
              <div key={date} className="flex items-center gap-3">
                <span className="font-sans text-xs text-bark/50 w-24 shrink-0">{date}</span>
                <span
                  className="bg-rose-deep/70 h-3 shrink-0"
                  style={{ width: `${Math.max(2, (views / peak) * 100)}%` }}
                />
                <span className="font-sans text-xs text-bark/60">{views}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
