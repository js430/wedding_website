"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Envelope intro: a wax-sealed envelope rises in, the seal cracks,
 * the flap lifts, and the invitation card slides out — then the
 * overlay melts away into the site. Once per session, click to skip,
 * disabled for reduced-motion users.
 */

const ORDER = ["closed", "sealCrack", "flapOpen", "cardOut", "fade", "done"] as const;
type Phase = (typeof ORDER)[number];

const TIMELINE: [Phase, number][] = [
  ["sealCrack", 1200],
  ["flapOpen", 1900],
  ["cardOut", 2800],
  ["fade", 4600],
  ["done", 5500],
];

export default function Intro() {
  const [phase, setPhase] = useState<Phase>("closed");

  useEffect(() => {
    if (
      sessionStorage.getItem("intro_seen") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      return;
    }
    const timers = TIMELINE.map(([p, t]) =>
      setTimeout(() => {
        if (p === "done") sessionStorage.setItem("intro_seen", "1");
        setPhase(p);
      }, t)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  function skip() {
    sessionStorage.setItem("intro_seen", "1");
    setPhase("done");
  }

  if (phase === "done") return null;

  const at = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);
  const cracked = at("sealCrack");
  const opened = at("flapOpen");
  const cardUp = at("cardOut");

  return (
    <motion.div
      onClick={skip}
      role="presentation"
      aria-label="Skip intro"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-crimson-darkest cursor-pointer overflow-hidden"
      animate={{ opacity: phase === "fade" ? 0 : 1 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
    >
      {/* Candlelight vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(139,0,16,0.45), transparent 65%)",
        }}
      />

      {/* Envelope group — settles down as the card rises */}
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.88 }}
        animate={{ y: cardUp ? 95 : 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ perspective: 1200 }}
      >
        <div className="relative w-[320px] h-[210px] md:w-[380px] md:h-[250px]">
          {/* Invitation card — rises out of the envelope */}
          <motion.div
            animate={cardUp ? { y: -245 } : { y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 -translate-x-1/2 top-4 w-[280px] md:w-[330px] h-[170px] md:h-[200px] z-10 flex flex-col items-center justify-center text-center px-4 border border-gold/50 shadow-2xl"
            style={{ backgroundColor: "#FFF9F3" }}
          >
            <p className="font-script text-5xl md:text-6xl text-crimson-dark leading-tight">
              Jeffrey &amp; Katie
            </p>
            <div className="h-px w-16 bg-gold/60 my-2" />
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark/60">
              March 27, 2027 · Charlottesville
            </p>
            <p className="font-serif italic text-gold text-sm mt-2">
              You&apos;re invited
            </p>
          </motion.div>

          {/* Envelope back */}
          <div
            className="absolute inset-0 z-0 border border-gold/30"
            style={{ backgroundColor: "#F2D7CC" }}
          />

          {/* Pocket — the V-cut front that hides the card's lower half */}
          <div
            className="absolute inset-0 z-20 border border-gold/30"
            style={{
              backgroundColor: "#F8E4DA",
              clipPath: "polygon(0% 0%, 50% 46%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          />

          {/* Flap — rotates open around its top edge */}
          <motion.div
            animate={{ rotateX: opened ? 180 : 0 }}
            transition={{ duration: 0.9, ease: [0.45, 0, 0.25, 1] }}
            className="absolute top-0 left-0 right-0 h-1/2 border border-gold/30"
            style={{
              backgroundColor: "#F0D0C3",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              transformOrigin: "top",
              zIndex: opened ? 5 : 30,
            }}
          />

          {/* Wax seal — cracks and falls away */}
          <motion.div
            animate={
              cracked
                ? { scale: [1, 1.18, 0.85], rotate: 14, y: 26, opacity: 0 }
                : { scale: 1, rotate: 0, y: 0, opacity: 1 }
            }
            transition={{ duration: 0.55, ease: "easeIn" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background:
                "radial-gradient(circle at 38% 32%, #c22033, #8B0010 60%, #5c0410)",
              border: "2px solid rgba(30,0,8,0.35)",
            }}
          >
            <span className="font-script text-2xl text-rose-blush/90 select-none">
              J·K
            </span>
          </motion.div>
        </div>
      </motion.div>

      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-sans text-[10px] tracking-[0.3em] uppercase text-rose-blush/35">
        Click anywhere to skip
      </p>
    </motion.div>
  );
}
