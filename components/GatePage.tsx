"use client";

import { useState, FormEvent } from "react";

type Reason = "none" | "invalid" | "blocked";

function duration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes >= 20 * 60) return "a day";
  if (minutes >= 50 && minutes <= 70) return "an hour";
  if (minutes >= 120) {
    const hours = Math.round(minutes / 60);
    return `${hours} hours`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * Shown to devices that don't yet carry the sign-in cookie. No Navbar: its
 * links would only bounce back here. `next` has already been checked as a
 * same-site path by the page.
 */
export default function GatePage({ reason, next }: { reason: Reason; next: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !password.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/invite/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.replace(next);
        return;
      }
      if (res.status === 400) {
        setError("That's not quite it. Check your invitation and try again.");
      } else if (res.status === 429) {
        let secs = 3600;
        try {
          const body = await res.json();
          if (typeof body?.retryAfterSeconds === "number") secs = body.retryAfterSeconds;
        } catch {
          // keep the default
        }
        setError(
          `Too many incorrect tries. For security, entry is paused — please try again in about ${duration(secs)}.`,
        );
      } else {
        setError("We couldn't check that just now. Please try again in a minute.");
      }
    } catch {
      setError("We couldn't check that just now. Please try again in a minute.");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-rose-blush flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-gold text-xl mb-4" aria-hidden="true">✦</p>
        <h1 className="font-script text-6xl sm:text-7xl text-bark leading-tight break-words">
          Katie &amp; Jeffrey
        </h1>

        <p className="mt-6 font-serif italic text-lg text-bark/80">
          This website is for our guests.
        </p>

        {reason !== "none" && (
          <p
            role="status"
            className="mt-6 border border-rose-soft/60 bg-white/70 px-4 py-3 font-sans text-sm text-rose-deep leading-relaxed"
          >
            {reason === "invalid"
              ? "That link didn't work — it may have been cut off when copied. Try entering the password instead."
              : "Too many incorrect tries from this network. Please wait about an hour, then try again."}
          </p>
        )}

        <div className="my-8 flex items-center justify-center gap-3 text-gold" aria-hidden="true">
          <span className="h-px w-12 bg-gold/40" />
          <span>✦</span>
          <span className="h-px w-12 bg-gold/40" />
        </div>

        <section>
          <h2 className="font-serif text-xl text-bark">Enter the password from your invitation</h2>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <label htmlFor="gate-password" className="sr-only">
              Password
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="gate-password"
                type="text"
                required
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (!busy) setError("");
                }}
                placeholder="Password"
                className="flex-1 min-w-0 border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
              />
              <button
                type="submit"
                disabled={busy || !password.trim()}
                className="shrink-0 bg-rose-deep text-white font-sans text-xs tracking-widest uppercase px-5 py-2.5 hover:bg-crimson-dark transition-colors disabled:opacity-50"
              >
                {busy ? "Checking…" : "Enter"}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-red-500 text-xs font-sans leading-relaxed">
                {error}
              </p>
            )}
          </form>

          <p className="mt-4 font-sans text-xs text-bark/60 leading-relaxed">
            It&rsquo;s in the text we sent you &mdash; or just tap the link in it.
          </p>
        </section>

        <p className="mt-8 font-sans text-xs text-bark/50 leading-relaxed">
          Still stuck? Reach out to Katie or Jeffrey.
        </p>
      </div>
    </main>
  );
}
