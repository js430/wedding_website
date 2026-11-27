"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import CountdownTimer from "./CountdownTimer";
import PetalsField from "./PetalsField";
import Sparkles from "./Sparkles";
import Magnetic from "./Magnetic";

export default function Hero() {
  const reduced = useReducedMotion();

  // Cinematic exit — content drifts down, shrinks, and fades as you scroll
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 190]);
  const opacity = useTransform(scrollY, [0, 520], [1, 0]);
  const scale = useTransform(scrollY, [0, 700], [1, 0.94]);

  return (
    <section
      id="top"
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #FEE8EC 0%, #FFB3C4 40%, #FEE8EC 100%)",
      }}
    >
      <PetalsField />
      <Sparkles />

      {/* Decorative rings — slow breathing pulse */}
      <div className="absolute top-24 left-10 w-40 h-40 rounded-full border border-gold/20 pointer-events-none [animation:breathe_9s_ease-in-out_infinite]" />
      <div className="absolute top-16 left-4 w-60 h-60 rounded-full border border-gold/10 pointer-events-none [animation:breathe_12s_ease-in-out_infinite]" />
      <div className="absolute bottom-20 right-8 w-48 h-48 rounded-full border border-rose-soft/30 pointer-events-none [animation:breathe_10s_ease-in-out_1.5s_infinite]" />
      <div className="absolute bottom-12 right-2 w-72 h-72 rounded-full border border-rose-soft/15 pointer-events-none [animation:breathe_14s_ease-in-out_infinite]" />

      <motion.div
        className="relative flex flex-col items-center w-full max-w-full"
        style={reduced ? undefined : { y, opacity, scale }}
      >
        {/* Tagline — gold shimmer */}
        <p className="hero-enter shimmer-text font-serif italic text-lg mb-3 tracking-widest">
          Together Forever
        </p>

        <h1 className="font-script text-[clamp(4.5rem,14vh,6rem)] md:text-[clamp(6rem,17vh,10rem)] text-bark mb-5 leading-none">
          <span className="hero-enter block [animation-delay:150ms]">Katie</span>
          <span className="hero-enter block font-script text-[clamp(2.5rem,7vh,3rem)] md:text-[clamp(3rem,8vh,4.5rem)] text-rose-deep my-1 [animation-delay:350ms]">
            &amp;
          </span>
          <span className="hero-enter block [animation-delay:550ms]">Jeffrey</span>
        </h1>

        <div className="hero-enter flex items-center gap-3 sm:gap-4 mb-6 [@media(min-height:760px)]:mb-8 max-w-full [animation-delay:750ms]">
          <span className="hidden min-[340px]:block h-px w-6 sm:w-12 shrink-0 bg-gradient-to-r from-transparent to-gold" />
          <p className="font-sans text-sm tracking-[0.1em] min-[340px]:tracking-[0.2em] sm:tracking-[0.3em] uppercase text-bark/60 min-w-0">
            <span className="whitespace-nowrap">Saturday,</span>{" "}
            <span className="whitespace-nowrap">March 27, 2027</span>
          </p>
          <span className="hidden min-[340px]:block h-px w-6 sm:w-12 shrink-0 bg-gradient-to-l from-transparent to-gold" />
        </div>

        <p className="hero-enter font-sans text-bark/60 tracking-wider min-[340px]:tracking-widest text-xs uppercase mb-8 [@media(min-height:760px)]:mb-10 max-w-full break-words [animation-delay:900ms]">
          Charlottesville, Virginia
        </p>

        <div className="hero-enter [animation-delay:1050ms]">
          <CountdownTimer />
        </div>

        <div className="hero-enter [animation-delay:1200ms]">
          <Magnetic>
            <a href="#rsvp" className="btn-primary">
              RSVP Now
            </a>
          </Magnetic>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <div aria-hidden="true" className="hero-enter absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-bark/30 hidden [@media(min-height:820px)]:flex [animation-delay:1800ms]">
        <span className="text-xs tracking-widest uppercase font-sans">Scroll</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
