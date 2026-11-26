"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SparkleTitle from "./SparkleTitle";
import AttendanceChoice from "./AttendanceChoice";
import MealPicker from "./MealPicker";
import ResendEditLink from "./ResendEditLink";

interface Rsvp {
  name:        string;
  email:       string;
  attending:   string;
  plusOne:     string;
  plusOneName: string;
  dietary:     string;
  message:     string;
  noUpdates?:  boolean;
  meal:        string;
  plusOneMeal: string;
}

type Load = "loading" | "ready" | "invalid" | "missing" | "unavailable";

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
  const [noUpdates,   setNoUpdates]   = useState(false);
  const [meal,        setMeal]        = useState("");
  const [plusOneMeal, setPlusOneMeal] = useState("");

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
        setNoUpdates(data.rsvp.noUpdates === true);
        setMeal(data.rsvp.meal ?? "");
        setPlusOneMeal(data.rsvp.plusOneMeal ?? "");
        setClosed(data.closed);
        setDeadline(data.deadline);
        setLoad("ready");
      })
      .catch((e: Error) => setLoad(Number(e.message) >= 500 || e.message === "Failed to fetch" ? "unavailable" : "invalid"));
  }, [token]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/rsvp/edit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, attending, plusOne, plusOneName, dietary, message, meal, plusOneMeal, noUpdates }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setClosed(true);
        setDeadline(data.deadline ?? deadline);
        return;
      }
      if (res.status === 400 && data.error === "meal-required") {
        setError("Please choose a meal for yourself.");
        return;
      }
      if (res.status === 400 && data.error === "guest-meal-required") {
        setError("Please choose a meal for your guest.");
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
      <main id="main" className="min-h-screen bg-rose-blush pt-24 pb-32 px-4 min-[360px]:px-6">
        <div className="max-w-xl mx-auto">{children}</div>
      </main>
      <Footer />
    </>
  );

  if (load === "loading")
    return shell(<p className="text-center font-serif italic text-bark/60 py-24">Loading your RSVP…</p>);

  if (load === "unavailable")
    return shell(
      <div className="text-center py-20">
        <SparkleTitle as="h1" text="RSVP" className="mt-8" />
        <p role="alert" className="font-sans text-bark/60 text-sm mt-6 leading-relaxed">
          We couldn&apos;t load your RSVP just now. Your link is fine; please try
          again in a few minutes.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="btn-outline mt-6">
          Try again
        </button>
      </div>
    );

  if (load === "missing" || load === "invalid")
    return shell(
      <div className="text-center py-20">
        <SparkleTitle as="h1" text="RSVP" className="mt-8" />
        <p className="font-sans text-bark/60 text-sm mt-6 leading-relaxed">
          This link isn&apos;t valid — it may have been copied incompletely, or
          cut in half by an email app. We can send you a fresh one.
        </p>
        <div className="mt-8 max-w-md mx-auto bg-white/60 border border-rose-soft/30 p-6">
          <ResendEditLink />
        </div>
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
  const needsMeal = attendingYes && !meal;
  const needsGuestMeal = attendingYes && plusOne === "yes" && !plusOneMeal;

  return shell(
    <>
      <SparkleTitle as="h1" text="Your RSVP" className="mt-8" />
      <div className="section-divider"><span className="text-gold text-xl">✦</span></div>

      <p className="text-center font-sans text-bark/60 text-sm mb-8 -mt-2">
        {closed
          ? `Changes closed at the end of ${deadline}. Here's what we have for you — reply to our email if something needs fixing.`
          : `Hi ${name.split(" ")[0] || "there"} — update anything below. You can make changes until ${deadline}.`}
      </p>

      <form
        onSubmit={save}
        className="bg-white/60 border border-rose-soft/30 p-8 space-y-6"
        aria-disabled={closed}
      >
        <AttendanceChoice
          legend="Will you be joining us?"
          attending={attending}
          plusOne={plusOne}
          disabled={closed}
          onChange={(a, p) => {
            setAttending(a);
            setPlusOne(p);
            if (p === "no") setPlusOneMeal("");
          }}
        />

        {attendingYes && (
          <>
            {plusOne === "yes" && (
              <div>
                <label htmlFor="edit-guest-name" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                  Guest&apos;s name
                </label>
                <input
                  id="edit-guest-name"
                  type="text"
                  value={plusOneName}
                  disabled={closed}
                  onChange={(e) => setPlusOneName(e.target.value)}
                  placeholder="Guest's full name"
                  className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep disabled:opacity-50"
                />
              </div>
            )}

            <MealPicker
              legend="Your meal"
              idPrefix="edit-meal"
              value={meal}
              onChange={setMeal}
              disabled={closed}
            />

            {plusOne === "yes" && (
              <MealPicker
                legend="Your guest's meal"
                idPrefix="edit-guest-meal"
                value={plusOneMeal}
                onChange={setPlusOneMeal}
                disabled={closed}
              />
            )}

            <div>
              <label htmlFor="edit-dietary" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                Allergies or dietary notes
              </label>
              <input
                id="edit-dietary"
                type="text"
                value={dietary}
                disabled={closed}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Nut allergy, shellfish, etc."
                className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep disabled:opacity-50"
              />
              <p className="font-sans text-xs text-bark/60 mt-1.5 leading-relaxed">
                We can&apos;t guarantee we can accommodate every request, but we&apos;ll do our best.
              </p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="edit-message" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
            A note for us <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="edit-message"
            rows={3}
            value={message}
            disabled={closed}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share a kind word..."
            className="w-full border border-rose-soft/60 bg-white/80 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep resize-none disabled:opacity-50"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={noUpdates}
            disabled={closed}
            onChange={(e) => setNoUpdates(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-rose-deep cursor-pointer disabled:cursor-default"
          />
          <span className="font-sans text-xs text-bark/70 leading-relaxed">
            No update emails, please. We&apos;ll still email you about your RSVP.
          </span>
        </label>

        {error && <p className="text-red-500 text-xs text-center font-sans">{error}</p>}

        {!closed && (needsMeal || needsGuestMeal) && (
          <p className="font-sans text-xs text-bark/60 text-center">
            {needsMeal ? "Choose a meal to continue." : "Choose a meal for your guest to continue."}
          </p>
        )}

        {!closed && (
          <button
            type="submit"
            disabled={saving || !attending || needsMeal || needsGuestMeal}
            className="w-full btn-primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </form>
    </>
  );
}
