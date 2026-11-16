"use client";

import { useState, FormEvent } from "react";

type Reason = "none" | "invalid" | "error";
type State = "idle" | "sending" | "sent" | "invalid-email" | "error";

/**
 * Shown to devices that don't yet carry a personal-link cookie. No Navbar:
 * its links would only bounce back here.
 *
 * The confirmation is the same whether or not the address is on the guest
 * list — the server behaves identically too.
 */
export default function GatePage({ reason }: { reason: Reason }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/invite/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      if (res.ok) setState("sent");
      else if (res.status === 400) setState("invalid-email");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="min-h-screen bg-rose-blush flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-gold text-xl mb-4" aria-hidden="true">✦</p>
        <h1 className="font-script text-6xl sm:text-7xl text-bark leading-tight break-words">
          Katie &amp; Jeffrey
        </h1>
        <p className="mt-3 font-sans text-xs tracking-widest uppercase text-bark/60">
          March 27, 2027 · Charlottesville, Virginia
        </p>

        <p className="mt-6 font-serif italic text-lg text-bark/80">
          This website is for our guests.
        </p>

        {reason !== "none" && (
          <p
            role="status"
            className="mt-6 border border-rose-soft/60 bg-white/70 px-4 py-3 font-sans text-sm text-rose-deep leading-relaxed"
          >
            {reason === "invalid"
              ? "That link didn't work. It may have been cut off when copied, or it's no longer active."
              : "We couldn't check your link just now. Please try again in a minute."}
          </p>
        )}

        <p className="mt-8 font-sans text-sm text-bark leading-relaxed">
          Open the personal link from your invitation — your text or email. It
          works on all your devices: phone, computer, tablet.
        </p>

        <div className="my-8 flex items-center justify-center gap-3 text-gold" aria-hidden="true">
          <span className="h-px w-12 bg-gold/40" />
          <span>✦</span>
          <span className="h-px w-12 bg-gold/40" />
        </div>

        <section>
          <h2 className="font-serif text-xl text-bark">
            On a new device, or can&rsquo;t find your link?
          </h2>

          {state === "sent" ? (
            <p role="status" className="mt-4 font-sans text-sm text-bark/60 leading-relaxed">
              If that address is on our guest list, your link is on its way.
              Check your inbox — and your spam folder, just in case.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <label htmlFor="gate-email" className="sr-only">
                Email address
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="gate-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state !== "sending") setState("idle");
                  }}
                  placeholder="The email on your invitation"
                  className="flex-1 min-w-0 border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                />
                <button
                  type="submit"
                  disabled={state === "sending" || !email.trim()}
                  className="shrink-0 bg-rose-deep text-white font-sans text-xs tracking-widest uppercase px-5 py-2.5 hover:bg-crimson-dark transition-colors disabled:opacity-50"
                >
                  {state === "sending" ? "Sending…" : "Email me my link"}
                </button>
              </div>
              {state === "invalid-email" && (
                <p role="alert" className="text-red-500 text-xs font-sans">
                  Please enter a valid email address.
                </p>
              )}
              {state === "error" && (
                <p role="alert" className="text-red-500 text-xs font-sans">
                  Something went wrong. Please try again in a moment.
                </p>
              )}
            </form>
          )}
        </section>

        <p className="mt-8 font-sans text-xs text-bark/50 leading-relaxed">
          Invited by text? Just open the link in your message on this device.
        </p>
        <p className="mt-2 font-sans text-xs text-bark/50 leading-relaxed">
          Still stuck? Reach out to Katie or Jeffrey.
        </p>
      </div>
    </main>
  );
}
