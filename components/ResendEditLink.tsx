"use client";

import { useState, FormEvent } from "react";

/**
 * "Email me my RSVP link" form.
 *
 * The confirmation is intentionally the same whether or not the address is on
 * the guest list — the server behaves identically too, so this form cannot be
 * used to probe who was invited.
 */
export default function ResendEditLink({ compact = false }: { compact?: boolean }) {
  const [open,   setOpen]   = useState(false);
  const [email,  setEmail]  = useState("");
  const [state,  setState]  = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/rsvp/resend", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p className="font-sans text-sm text-bark/60 text-center leading-relaxed">
        If <span className="text-bark">{email}</span> is on our guest list, the
        link is on its way. Check your inbox — and your spam folder, just in case.
      </p>
    );
  }

  if (compact && !open) {
    return (
      <p className="text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-sans text-xs text-bark/50 underline underline-offset-2 hover:text-rose-deep transition-colors"
        >
          Already RSVPed? Email me my edit link
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label
        htmlFor="resend-email"
        className="block font-sans text-xs tracking-widest uppercase text-bark/60 text-center"
      >
        Email me my RSVP link
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="resend-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="The email you RSVPed with"
          className="flex-1 min-w-0 border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
        />
        <button
          type="submit"
          disabled={state === "sending" || !email}
          className="shrink-0 bg-rose-deep text-white font-sans text-xs tracking-widest uppercase px-5 py-2.5 hover:bg-crimson-dark transition-colors disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Send link"}
        </button>
      </div>
      {state === "error" && (
        <p className="text-red-500 text-xs font-sans text-center">
          Something went wrong. Please try again, or just reply to our email.
        </p>
      )}
    </form>
  );
}
