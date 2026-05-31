"use client";

import { useState, FormEvent } from "react";
import HotelBlock from "./HotelBlock";

type Status = "idle" | "submitting" | "success" | "error";

export default function RSVP() {
  const [status, setStatus] = useState<Status>("idle");
  const [attending, setAttending] = useState<"yes" | "no" | "">("");
  const [plusOne, setPlusOne] = useState<"yes" | "no" | "">("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      attending,
      plusOne,
      plusOneName: (form.elements.namedItem("plusOneName") as HTMLInputElement)?.value ?? "",
      dietary: (form.elements.namedItem("dietary") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="rsvp" className="py-24 px-6 bg-rose-blush">
      <div className="max-w-5xl mx-auto">
        <h2 className="section-title">RSVP & Hotel</h2>
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>
        <p className="text-center font-sans text-bark/60 text-sm mb-12 -mt-4">
          Kindly reply by February 27, 2027
        </p>

        <div className="grid md:grid-cols-2 gap-10 md:divide-x md:divide-rose-soft/30">
          {/* RSVP Form */}
          <div className="md:pr-10">
            <h3 className="font-serif text-2xl text-bark mb-6 text-center">RSVP</h3>

            {status === "success" ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">💌</div>
                <p className="font-serif text-xl text-bark mb-2">Thank You!</p>
                <p className="font-sans text-bark/60 text-sm">
                  We have received your RSVP and can&apos;t wait to celebrate with you.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                    Full Name *
                  </label>
                  <input
                    name="name"
                    required
                    type="text"
                    placeholder="Jane Smith"
                    className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                  />
                </div>

                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="jane@example.com"
                    className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                  />
                </div>

                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">
                    Will you attend? *
                  </label>
                  <div className="flex gap-4">
                    {(["yes", "no"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setAttending(v);
                          if (v === "no") setPlusOne("");
                        }}
                        className={`flex-1 py-3 border font-sans text-sm tracking-widest uppercase transition-all ${
                          attending === v
                            ? "bg-rose-deep text-ivory border-rose-deep"
                            : "border-rose-soft/60 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                        }`}
                      >
                        {v === "yes" ? "Joyfully Accepts" : "Regretfully Declines"}
                      </button>
                    ))}
                  </div>
                </div>

                {attending === "yes" && (
                  <>
                    <div>
                      <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-3">
                        Bringing a +1?
                      </label>
                      <div className="flex gap-4">
                        {(["yes", "no"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setPlusOne(v)}
                            className={`flex-1 py-3 border font-sans text-sm tracking-widest uppercase transition-all ${
                              plusOne === v
                                ? "bg-rose-deep text-ivory border-rose-deep"
                                : "border-rose-soft/60 text-bark/60 hover:border-rose-deep hover:text-rose-deep"
                            }`}
                          >
                            {v === "yes" ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {plusOne === "yes" && (
                      <div>
                        <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                          Guest Name
                        </label>
                        <input
                          name="plusOneName"
                          type="text"
                          placeholder="Guest's full name"
                          className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                        Dietary Restrictions
                      </label>
                      <input
                        name="dietary"
                        type="text"
                        placeholder="Vegetarian, gluten-free, etc."
                        className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
                    Message for the Couple
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Share a kind word..."
                    className="w-full border border-rose-soft/60 bg-ivory/80 px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-500 text-sm font-sans text-center">
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!attending || status === "submitting"}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Sending..." : "Send RSVP"}
                </button>
              </form>
            )}
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
