"use client";

import { useState, FormEvent } from "react";
import AttendanceChoice from "./AttendanceChoice";
import MealPicker from "./MealPicker";
import HotelBlock from "./HotelBlock";
import ResendEditLink from "./ResendEditLink";
import Reveal from "./Reveal";
import SparkleTitle from "./SparkleTitle";

type Status = "idle" | "submitting" | "success" | "error";

export default function RSVP() {
  const [status, setStatus] = useState<Status>("idle");
  const [attending, setAttending] = useState<"yes" | "no" | "">("");
  const [plusOne, setPlusOne] = useState<"yes" | "no" | "">("");
  const [meal, setMeal] = useState("");
  const [plusOneMeal, setPlusOneMeal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // What the guest just sent, for the thank-you message.
  const [sent, setSent] = useState<{ attending: "yes" | "no"; emailed: boolean; email: string } | null>(null);

  const needsMeal = attending === "yes" && !meal;
  const needsGuestMeal = attending === "yes" && plusOne === "yes" && !plusOneMeal;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      attending,
      plusOne,
      meal: attending === "yes" ? meal : "",
      plusOneMeal: attending === "yes" && plusOne === "yes" ? plusOneMeal : "",
      plusOneName: (form.elements.namedItem("plusOneName") as HTMLInputElement)?.value ?? "",
      // Only on the page when accepting; a declining guest has no dietary field.
      dietary: (form.elements.namedItem("dietary") as HTMLInputElement | null)?.value ?? "",
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      noUpdates: (form.elements.namedItem("noUpdates") as HTMLInputElement).checked,
    };

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = typeof body?.error === "string" ? body.error : "";
        const messages: Record<string, string> = {
          "meal-required": "Please choose a meal for yourself.",
          "guest-meal-required": "Please choose a meal for your guest.",
          "name-required": "Please enter your name.",
          "email-invalid": "Please check your email address.",
          "attending-required": "Please let us know if you can make it.",
          "rate-limited": "Too many tries for now. Please wait a bit and try again.",
        };
        if (messages[code]) setErrorMsg(messages[code]);
        throw new Error("Request failed");
      }
      const result = await res.json().catch(() => ({}));
      setSent({ attending: attending === "yes" ? "yes" : "no", emailed: result?.emailed !== false, email: data.email.trim() });
      setStatus("success");

      // Celebrate a yes with palette-colored confetti
      if (attending === "yes") {
        try {
          const confetti = (await import("canvas-confetti")).default;
          const colors = ["#CC1428", "#FFB3C4", "#c9a838", "#8B0010", "#FEE8EC"];
          confetti({ particleCount: 130, spread: 80, origin: { y: 0.65 }, colors, ticks: 220 });
          setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
          setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 450);
        } catch {
          // celebration is optional
        }
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="rsvp" className="py-24 px-6 bg-rose-blush">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SparkleTitle text="RSVP & Hotel" />
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
          <p className="text-center font-sans text-bark/60 text-sm mb-12 -mt-4">
            Kindly reply by January 27, 2027
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-10 md:divide-x md:divide-rose-soft/30">
          {/* RSVP Form */}
          <div className="md:pr-10">
            <h3 className="font-serif text-2xl text-bark mb-6 text-center">RSVP</h3>

            {status === "success" ? (
              <div role="status" className="text-center py-10">
                <div className="text-5xl mb-4" aria-hidden="true">💌</div>
                <p className="font-serif text-xl text-bark mb-2">Thank You!</p>
                <p className="font-sans text-bark/60 text-sm leading-relaxed">
                  {sent?.attending === "no"
                    ? "We've received your RSVP. We'll miss you, and thank you for letting us know."
                    : "We've received your RSVP and can't wait to celebrate with you."}
                </p>
                {sent?.emailed === false ? (
                  <p className="mt-4 font-sans text-sm leading-relaxed text-rose-deep">
                    Your RSVP is saved, but we couldn&apos;t send the confirmation email
                    {sent.email ? <> to <strong>{sent.email}</strong></> : null}. You can request
                    your edit link below in a little while.
                  </p>
                ) : (
                  <p className="mt-4 font-sans text-xs leading-relaxed text-bark/60">
                    A confirmation is on its way to your inbox, with a link to change your
                    answer until February 27, 2027.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="rsvp-name" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    id="rsvp-name"
                    required
                    type="text"
                    placeholder="Jane Smith"
                    className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                  />
                </div>

                <div>
                  <label htmlFor="rsvp-email" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    id="rsvp-email"
                    required
                    type="email"
                    placeholder="jane@example.com"
                    aria-describedby="rsvp-email-note"
                    className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                  />
                  <p id="rsvp-email-note" className="mt-1.5 font-sans text-xs text-bark/60 leading-relaxed">
                    We&apos;ll send your confirmation here, along with any major updates
                    and news about the wedding, so please use an address you check.
                  </p>
                  <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
                    <input
                      name="noUpdates"
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-rose-deep cursor-pointer"
                    />
                    <span className="font-sans text-xs text-bark/70 leading-relaxed">
                      No update emails, please. Just send my RSVP confirmation.
                    </span>
                  </label>
                </div>

                <AttendanceChoice
                  legend="Will you attend? *"
                  attending={attending}
                  plusOne={plusOne}
                  onChange={(a, p) => {
                    setAttending(a);
                    setPlusOne(p);
                    if (a === "no") setMeal("");
                    if (p === "no") setPlusOneMeal("");
                  }}
                />

                {attending === "yes" && (
                  <>
                    {plusOne === "yes" && (
                      <div>
                        <label htmlFor="rsvp-plusOneName" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                          Guest Name
                        </label>
                        <input
                          name="plusOneName"
                          id="rsvp-plusOneName"
                          type="text"
                          placeholder="Guest's full name"
                          className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                        />
                      </div>
                    )}

                    <MealPicker
                      legend="Your meal"
                      idPrefix="rsvp-meal"
                      value={meal}
                      onChange={setMeal}
                    />

                    {plusOne === "yes" && (
                      <MealPicker
                        legend="Your guest's meal"
                        idPrefix="rsvp-guest-meal"
                        value={plusOneMeal}
                        onChange={setPlusOneMeal}
                      />
                    )}

                    <div>
                      <label htmlFor="rsvp-dietary" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                        Allergies or dietary notes
                      </label>
                      <input
                        name="dietary"
                        id="rsvp-dietary"
                        type="text"
                        placeholder="Nut allergy, shellfish, etc."
                        className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                      />
                      <p className="font-sans text-xs text-bark/60 mt-1.5 leading-relaxed">
                        We can&apos;t guarantee we can accommodate every request, but we&apos;ll do our best.
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="rsvp-message" className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                    Message for the Couple
                  </label>
                  <textarea
                    name="message"
                    id="rsvp-message"
                    rows={3}
                    placeholder="Share a kind word..."
                    className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-500 text-sm font-sans text-center">
                    {errorMsg || "Something went wrong. Please try again or email us directly."}
                  </p>
                )}

                {(needsMeal || needsGuestMeal) && (
                  <p className="font-sans text-xs text-bark/60 text-center">
                    {needsMeal ? "Choose a meal to continue." : "Choose a meal for your guest to continue."}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!attending || needsMeal || needsGuestMeal || status === "submitting"}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Sending..." : "Send RSVP"}
                </button>
              </form>
            )}

            {/* Outside the form above: ResendEditLink renders its own form, and
                nesting one form inside another breaks submission. */}
            <div className="mt-5">
              <ResendEditLink compact />
            </div>
          </div>

          {/* Hotel Block */}
          <div className="md:pl-10">
            <h3 className="font-serif text-2xl text-bark mb-6 text-center">Hotel Block</h3>
            <HotelBlock />
          </div>
        </div>
      </div>
    </section>
  );
}
