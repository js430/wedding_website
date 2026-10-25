"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SparkleTitle from "./SparkleTitle";

interface Rsvp {
  name:        string;
  email:       string;
  attending:   string;
  plusOne:     string;
  plusOneName: string;
  dietary:     string;
  message:     string;
}

type Load = "loading" | "ready" | "invalid" | "missing";

export default function EditRSVP() {
  const token = useSearchParams().get("token") ?? "";

  const [load,     setLoad]     = useState<Load>("loading");
  const [closed,   setClosed]   = useState(false);
  const [deadline, setDeadline] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  const [name,        setName]        = useState("");
  const [attending,   setAttending]   = useState<"yes" | "no" | "">("");
  const [plusOne,     setPlusOne]     = useState<"yes" | "no" | "">("");
  const [plusOneName, setPlusOneName] = useState("");
  const [dietary,     setDietary]     = useState("");
  const [message,     setMessage]     = useState("");

  useEffect(() => {
    if (!token) { setLoad("missing"); return; }

    fetch(`/api/rsvp/edit?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: { rsvp: Rsvp; closed: boolean; deadline: string }) => {
        setName(data.rsvp.name);
        setAttending(data.rsvp.attending === "yes" ? "yes" : "no");
        setPlusOne(data.rsvp.plusOne === "yes" ? "yes" : "no");
        setPlusOneName(data.rsvp.plusOneName);
        setDietary(data.rsvp.dietary);
        setMessage(data.rsvp.message);
        setClosed(data.closed);
        setDeadline(data.deadline);
        setLoad("ready");
      })
      .catch(() => setLoad("invalid"));
  }, [token]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/rsvp/edit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, attending, plusOne, plusOneName, dietary, message }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setClosed(true);
        setDeadline(data.deadline ?? deadline);
        return;
      }
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("Something went wrong. Please try again, or just reply to our email.");
    } finally {
      setSaving(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <>
      <Navbar />
      <main className="min-h-screen bg-rose-blush pt-24 pb-32 px-6">
        <div className="max-w-xl mx-auto">{children}</div>
      </main>
      <Footer />
    </>
  );

  if (load === "loading")
    return shell(<p className="text-center font-serif italic text-bark/50 py-24">Loading your RSVP…</p>);

  if (load === "missing" || load === "invalid")
    return shell(
      <div className="text-center py-20">
        <SparkleTitle text="RSVP" className="mt-8" />
        <p className="font-sans text-bark/60 text-sm mt-6 leading-relaxed">
          This link isn&apos;t valid — it may have been copied incompletely.
          Please use the link in your confirmation email, or reply to it and
          we&apos;ll update things for you.
        </p>
      </div>
    );

  if (saved)
    return shell(
      <div className="text-center py-20 bg-white/60 border border-rose-soft/30">
        <p className="text-4xl mb-4">💌</p>
        <p className="font-serif text-2xl text-bark mb-2">RSVP updated</p>
        <p className="font-sans text-bark/60 text-sm px-6">
          Thanks, {name.split(" ")[0] || "friend"} — we&apos;ve saved your changes.
          You can come back to this link any time before {deadline}.
        </p>
      </div>
    );

  const attendingYes = attending === "yes";

  return shell(
    <>
      <SparkleTitle text="Your RSVP" className="mt-8" />
      <div className="section-divider"><span className="text-gold text-xl">✦</span></div>

      <p className="text-center font-sans text-bark/60 text-sm mb-8 -mt-2">
        {closed
          ? `Changes closed on ${deadline}. Here's what we have for you — reply to our email if something needs fixing.`
          : `Hi ${name.split(" ")[0] || "there"} — update anything below. You can make changes until ${deadline}.`}
      </p>

      <form
        onSubmit={save}
        className="bg-white/60 border border-rose-soft/30 p-8 space-y-6"
        aria-disabled={closed}
      >
        {/* Attending */}
        <div>
          <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">
            Will you be joining us?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "yes", label: "Joyfully accepts" },
              { id: "no",  label: "Regretfully declines" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={closed}
                onClick={() => setAttending(opt.id as "yes" | "no")}
                className={`py-3 px-4 border font-sans text-sm transition-all disabled:opacity-50 ${
                  attending === opt.id
                    ? "bg-rose-deep text-white border-rose-deep"
                    : "border-rose-soft/60 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {attendingYes && (
          <>
            {/* Plus one */}
            <div>
              <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">
                Bringing a guest?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[{ id: "yes", label: "Yes" }, { id: "no", label: "No" }].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={closed}
                    onClick={() => setPlusOne(opt.id as "yes" | "no")}
                    className={`py-2.5 px-4 border font-sans text-sm transition-all disabled:opacity-50 ${
                      plusOne === opt.id
                        ? "bg-rose-deep text-white border-rose-deep"
                        : "border-rose-soft/60 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {plusOne === "yes" && (
              <div>
                <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                  Guest&apos;s name
                </label>
                <input
                  type="text"
                  value={plusOneName}
                  disabled={closed}
                  onChange={(e) => setPlusOneName(e.target.value)}
                  placeholder="Guest's full name"
                  className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep disabled:opacity-50"
                />
              </div>
            )}

            <div>
              <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                Dietary restrictions
              </label>
              <input
                type="text"
                value={dietary}
                disabled={closed}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Vegetarian, gluten-free, etc."
                className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep disabled:opacity-50"
              />
            </div>
          </>
        )}

        <div>
          <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
            A note for us <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={message}
            disabled={closed}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share a kind word..."
            className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep resize-none disabled:opacity-50"
          />
        </div>

        {error && <p className="text-red-500 text-xs text-center font-sans">{error}</p>}

        {!closed && (
          <button
            type="submit"
            disabled={saving || !attending}
            className="w-full btn-primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </form>
    </>
  );
}
