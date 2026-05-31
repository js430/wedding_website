"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const roomTypes = [
  "Standard King",
  "Standard Double",
  "Junior Suite",
  "Suite",
];

export default function HotelBlock() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const data = {
      ihgNumber: (form.elements.namedItem("ihgNumber") as HTMLInputElement).value,
      firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value,
      lastName: (form.elements.namedItem("lastName") as HTMLInputElement).value,
      guests: (form.elements.namedItem("guests") as HTMLSelectElement).value,
      roomType: (form.elements.namedItem("roomType") as HTMLSelectElement).value,
      arrivalDate: (form.elements.namedItem("arrivalDate") as HTMLInputElement).value,
      departureDate: (form.elements.namedItem("departureDate") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/hotel", {
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

  if (status === "success") {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🏨</div>
        <p className="font-serif text-xl text-bark mb-2">Request Received</p>
        <p className="font-sans text-bark/60 text-sm">
          We&apos;ll be in touch with confirmation details.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-serif italic text-gold text-sm mb-2 text-center">Hotel Block</p>
      <p className="font-serif text-xl text-bark mb-1 text-center">The Forum Hotel</p>
      <p className="font-sans text-bark/60 text-sm text-center mb-5">
        Fill out the form below to request a room in our block.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
            IHG Rewards # <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            name="ihgNumber"
            type="text"
            placeholder="123456789"
            className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
              First Name *
            </label>
            <input
              name="firstName"
              required
              type="text"
              placeholder="Jane"
              className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
            />
          </div>
          <div>
            <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
              Last Name *
            </label>
            <input
              name="lastName"
              required
              type="text"
              placeholder="Smith"
              className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
              # of Guests *
            </label>
            <select
              name="guests"
              required
              className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark focus:outline-none focus:border-rose-deep"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
              Room Type *
            </label>
            <select
              name="roomType"
              required
              className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark focus:outline-none focus:border-rose-deep"
            >
              <option value="">Select...</option>
              {roomTypes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
              Arrival Date *
            </label>
            <input
              name="arrivalDate"
              required
              type="date"
              defaultValue="2027-03-27"
              className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark focus:outline-none focus:border-rose-deep"
            />
          </div>
          <div>
            <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
              Departure Date *
            </label>
            <input
              name="departureDate"
              required
              type="date"
              defaultValue="2027-03-28"
              className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark focus:outline-none focus:border-rose-deep"
            />
          </div>
        </div>

        <div>
          <label className="block font-sans text-xs tracking-widest uppercase text-bark/60 mb-1">
            Email <span className="normal-case tracking-normal">(for payment authorization)</span> *
          </label>
          <input
            name="email"
            required
            type="email"
            placeholder="jane@example.com"
            className="w-full border border-rose-soft/60 bg-white/60 px-4 py-2.5 font-sans text-sm text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep"
          />
        </div>

        {status === "error" && (
          <p className="text-red-500 text-sm font-sans text-center">
            Something went wrong. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {status === "submitting" ? "Submitting..." : "Request Room"}
        </button>
      </form>
    </div>
  );
}
