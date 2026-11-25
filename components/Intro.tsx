"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Envelope intro: a wax-sealed envelope rises in, the seal cracks,
 * the flap lifts, and the invitation card slides out. Holds until the
 * guest presses Enter (the button, or the Enter/Space key). Clicking during
 * the animation fast-forwards to the opened state.
 *
 * Plays once per browser tab: not again when a guest comes back to the home
 * page from another page, and not when they follow a link to a section
 * (/#gallery). Reduced-motion users go straight to the site.
 */

const SEEN_KEY = "intro-seen";

/**
 * Runs before the first paint (inline script), so a guest who shouldn't see
 * the intro never gets a flash of it: it marks <html> with .intro-skip,
 * which hides the overlay and leaves the page scrollable.
 */
const DECIDE_SKIP = `try{var d=document.documentElement;if(location.hash||matchMedia("(prefers-reduced-motion: reduce)").matches||sessionStorage.getItem("${SEEN_KEY}"))d.classList.add("intro-skip")}catch(e){}`;

const ORDER = ["closed", "sealCrack", "flapOpen", "cardOut", "fade", "done"] as const;
type Phase = (typeof ORDER)[number];

const TIMELINE: [Phase, number][] = [
  ["sealCrack", 1200],
  ["flapOpen", 1900],
  ["cardOut", 2800],
];

export default function Intro() {
  const [phase, setPhase] = useState<Phase>("closed");
  const enterRef = useRef<HTMLButtonElement | null>(null);

  // Only ever move forward — a stale timer can't rewind a fast-forward
  const advance = (p: Phase) =>
    setPhase((prev) => (ORDER.indexOf(p) > ORDER.indexOf(prev) ? p : prev));

  useEffect(() => {
    if (document.documentElement.classList.contains("intro-skip")) {
      setPhase("done");
      return;
    }
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // private mode: it just plays again next time
    }
    // Start at the top, even if the browser restored a scroll position.
    window.scrollTo(0, 0);
    const timers = TIMELINE.map(([p, t]) => setTimeout(() => advance(p), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Keyboard: Enter or Space skips ahead, then enters; Tab stays on the
  // intro's button instead of reaching links hidden behind it.
  useEffect(() => {
    if (phase === "done" || phase === "fade") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (ORDER.indexOf(phase) >= ORDER.indexOf("cardOut")) enter();
        else fastForward();
      } else if (e.key === "Tab") {
        e.preventDefault();
        enterRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the Enter button when it appears.
  useEffect(() => {
    if (phase === "cardOut") enterRef.current?.focus({ preventScroll: true });
  }, [phase]);

  function fastForward() {
    advance("cardOut");
  }

  function enter() {
    advance("fade");
    setTimeout(() => advance("done"), 950);
  }

  if (phase === "done") return null;

  const at = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);
  const cracked = at("sealCrack");
  const opened = at("flapOpen");
  const cardUp = at("cardOut");

  return (
    <motion.div
      onClick={fastForward}
      role="presentation"
      // data-lenis-prevent: the smooth-scroll library ignores wheel events here.
      data-lenis-prevent
      className="intro-overlay fixed inset-0 z-[100] flex items-center justify-center bg-crimson-darkest overflow-hidden"
      animate={{ opacity: phase === "fade" ? 0 : 1 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
    >
      {/* Decide before the first paint whether to skip (see DECIDE_SKIP). */}
      <script dangerouslySetInnerHTML={{ __html: DECIDE_SKIP }} />
      {/* Hold the page still behind the intro, so the guest starts at the top.
          A style tag (not an effect) so it applies from the first paint,
          before the page is interactive; it goes away with the intro. */}
      <style>{"html:not(.intro-skip){overflow:hidden}html.intro-skip .intro-overlay{display:none}"}</style>
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
          {/* Centered via left calc — motion's transform would overwrite
              a -translate-x-1/2 class */}
          <motion.div
            animate={cardUp ? { y: -245 } : { y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-[calc(50%-140px)] md:left-[calc(50%-165px)] top-4 w-[280px] md:w-[330px] h-[170px] md:h-[200px] z-10 flex flex-col items-center justify-center text-center px-4 border border-gold/50 shadow-2xl"
            style={{ backgroundColor: "#FFF9F3" }}
          >
            <p className="font-script text-5xl md:text-6xl text-crimson-dark leading-tight">
              Katie &amp; Jeffrey
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
            className="absolute left-[calc(50%-2rem)] top-[calc(50%-2rem)] z-40 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
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

      {/* Enter button — appears once the card is out */}
      <div className="absolute inset-x-0 bottom-14 flex justify-center">
        {cardUp ? (
          <motion.button
            ref={enterRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              enter();
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="border border-gold/60 text-gold font-sans text-sm tracking-[0.35em] uppercase px-12 py-3.5 transition-colors duration-300 hover:bg-gold hover:text-crimson-darkest"
          >
            Enter
          </motion.button>
        ) : (
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-rose-blush/60">
            Click to skip ahead
          </p>
        )}
      </div>
    </motion.div>
  );
}
