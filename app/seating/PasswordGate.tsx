"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PasswordGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<"" | "wrong" | "locked" | "failed">("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let res: Response;
    try {
      res = await fetch("/api/seating/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      setError("failed");
      setLoading(false);
      return;
    }

    if (res.ok) {
      router.refresh();
    } else {
      setError(res.status === 429 ? "locked" : res.status === 401 ? "wrong" : "failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-rose-blush flex items-center justify-center px-6">
      <div className="bg-white/80 border border-rose-soft/30 p-10 max-w-sm w-full text-center shadow-sm">
        <p className="font-serif italic text-gold text-sm mb-2">Private Access</p>
        <h1 className="font-serif text-3xl text-bark mb-2">Seating Chart</h1>
        <p className="font-sans text-bark/50 text-sm mb-8">Katie &amp; Jeffrey · March 27, 2027</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            aria-label="Seating chart password"
            autoFocus
            className="w-full border border-rose-soft/60 bg-white px-4 py-3 font-sans text-bark placeholder-bark/30 focus:outline-none focus:border-rose-deep text-center tracking-widest"
          />
          {error && (
            <p role="alert" className="text-rose-deep text-sm font-sans">
              {error === "wrong"
                ? "Incorrect password."
                : error === "locked"
                ? "Too many wrong tries from this network. Please wait about 15 minutes, then try again."
                : "Couldn't check that just now. Please try again."}
            </p>
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
