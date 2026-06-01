"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PasswordGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/seating/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-rose-blush flex items-center justify-center px-6">
      <div className="bg-white/80 border border-rose-soft/30 p-10 max-w-sm w-full text-center shadow-sm">
        <p className="font-serif italic text-gold text-sm mb-2">Private Access</p>
        <h1 className="font-serif text-3xl text-bark mb-2">Seating Chart</h1>
        <p className="font-sans text-bark/50 text-sm mb-8">Jeffrey &amp; Katie · March 27, 2027</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full border border-rose-soft/60 bg-white px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep text-center tracking-widest"
          />
          {error && (
            <p className="text-rose-deep text-sm font-sans">Incorrect password.</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
