"use client";

import { useEffect, useState } from "react";

type Phase = "drawing" | "fading" | "done";

/**
 * One-time splash: the names trace themselves in gold script over a
 * deep maroon backdrop, then the overlay melts away. Shows once per
 * browser session; click anywhere to skip. Skipped entirely for
 * reduced-motion users.
 */
export default function Intro() {
  const [phase, setPhase] = useState<Phase>("drawing");

  useEffect(() => {
    if (
      sessionStorage.getItem("intro_seen") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      return;
    }

    const fadeTimer = setTimeout(() => setPhase("fading"), 3100);
    const doneTimer = setTimeout(() => {
      sessionStorage.setItem("intro_seen", "1");
      setPhase("done");
    }, 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  function skip() {
    sessionStorage.setItem("intro_seen", "1");
    setPhase("done");
  }

  if (phase === "done") return null;

  return (
    <div
      onClick={skip}
      role="presentation"
      aria-label="Skip intro"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-crimson-darkest cursor-pointer transition-opacity duration-1000 ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <svg viewBox="0 0 700 180" className="w-full max-w-2xl px-6" aria-hidden="true">
        <text
          x="350"
          y="105"
          textAnchor="middle"
          fontSize="76"
          className="intro-script-text"
        >
          Jeffrey &amp; Katie
        </text>
      </svg>
      <p className="intro-sub font-sans text-xs tracking-[0.35em] uppercase text-rose-blush/60">
        March 27, 2027 · Charlottesville
      </p>
    </div>
  );
}
