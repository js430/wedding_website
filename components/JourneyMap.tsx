"use client";

import { motion } from "framer-motion";
import SparkleTitle from "./SparkleTitle";

/**
 * Storybook-style map of the journey: Charlottesville → Brooklyn →
 * back to Charlottesville. The route draws itself as you scroll into
 * view and pins drop onto each stop in sequence.
 */

const spring = { type: "spring", stiffness: 260, damping: 15 } as const;

function Pin({
  x,
  y,
  delay,
  label,
  year,
  note,
  labelSide = "right",
}: {
  x: number;
  y: number;
  delay: number;
  label: string;
  year: string;
  note: string;
  labelSide?: "left" | "right";
}) {
  const anchor = labelSide === "right" ? "start" : "end";
  const lx = labelSide === "right" ? 22 : -22;

  return (
    <motion.g
      initial={{ y: -46, opacity: 0, scale: 0.5 }}
      whileInView={{ y: 0, opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...spring, delay }}
      style={{ x, y }}
    >
      {/* Pin */}
      <path
        d="M0,0 C-8,-13 -13,-19 -13,-27 a13 13 0 1 1 26 0 C13,-19 8,-13 0,0 Z"
        fill="#CC1428"
        stroke="#8B0010"
        strokeWidth="1"
      />
      <circle cx="0" cy="-27" r="5" fill="#FEE8EC" />
      {/* Ground shadow */}
      <ellipse cx="0" cy="2" rx="7" ry="2" fill="#1E0008" opacity="0.15" />
      {/* Label */}
      <text
        x={lx}
        y="-30"
        textAnchor={anchor}
        className="font-script"
        fontSize="26"
        fill="#7d621c"
      >
        {year}
      </text>
      <text x={lx} y="-14" textAnchor={anchor} fontSize="14" fill="#1E0008" fontFamily="var(--font-playfair)">
        {label}
      </text>
      <text x={lx} y="1" textAnchor={anchor} fontSize="11" fill="#1E0008" opacity="0.55" fontStyle="italic" fontFamily="var(--font-playfair)">
        {note}
      </text>
    </motion.g>
  );
}

export default function JourneyMap() {
  return (
    <section id="journey" className="py-24 px-6 bg-rose-blush">
      <div className="max-w-4xl mx-auto">
        <SparkleTitle text="Our Journey" />
        <div className="section-divider">
          <span className="text-gold text-xl">✦</span>
        </div>
        <p className="text-center font-sans text-bark/60 text-sm mb-12 -mt-4">
          From Grounds to the Hudson — and home again.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="shadow-xl shadow-rose-deep/10"
        >
          <svg viewBox="0 0 800 460" className="w-full h-auto" role="img" aria-label="Map of our journey from Charlottesville to Brooklyn and back">
            {/* Parchment */}
            <rect x="0" y="0" width="800" height="460" rx="6" fill="#FDF1EA" />
            <rect x="16" y="16" width="768" height="428" rx="3" fill="none" stroke="#c9a838" strokeOpacity="0.5" />
            <rect x="22" y="22" width="756" height="416" rx="2" fill="none" stroke="#c9a838" strokeOpacity="0.22" />

            {/* Faint chart grid */}
            {[80, 140, 200, 260, 320, 380].map((y) => (
              <line key={y} x1="24" y1={y} x2="776" y2={y} stroke="#1E0008" strokeOpacity="0.035" />
            ))}
            {[120, 220, 320, 420, 520, 620, 720].map((x) => (
              <line key={x} x1={x} y1="24" x2={x} y2="436" stroke="#1E0008" strokeOpacity="0.035" />
            ))}

            {/* Stylized landmasses */}
            <path
              d="M60 250 C 130 200, 240 210, 310 260 C 360 295, 350 370, 280 400 C 190 435, 90 410, 60 340 Z"
              fill="#FFB3C4"
              opacity="0.28"
            />
            <path
              d="M480 60 C 570 40, 690 60, 740 120 C 770 165, 730 220, 650 225 C 560 230, 470 180, 470 120 Z"
              fill="#FFB3C4"
              opacity="0.2"
            />
            {/* Water squiggles */}
            {[
              "M 420 390 q 12 -6 24 0 q 12 6 24 0",
              "M 460 410 q 12 -6 24 0 q 12 6 24 0",
              "M 640 330 q 12 -6 24 0 q 12 6 24 0",
            ].map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#e05252" strokeOpacity="0.3" strokeWidth="1.5" />
            ))}

            {/* Compass rose */}
            <g transform="translate(716, 84)" opacity="0.75">
              <circle r="28" fill="none" stroke="#c9a838" strokeOpacity="0.5" />
              <circle r="2.5" fill="#c9a838" />
              <path d="M0,-24 L4,-4 L0,0 L-4,-4 Z" fill="#CC1428" opacity="0.85" />
              <path d="M0,24 L4,4 L0,0 L-4,4 Z" fill="#c9a838" opacity="0.6" />
              <path d="M-24,0 L-4,-4 L0,0 L-4,4 Z" fill="#c9a838" opacity="0.6" />
              <path d="M24,0 L4,-4 L0,0 L4,4 Z" fill="#c9a838" opacity="0.6" />
              <text y="-34" textAnchor="middle" fontSize="13" fill="#7d621c" fontFamily="var(--font-playfair)">N</text>
            </g>

            {/* Route — faint dashed underlay, then the drawing stroke */}
            <path
              d="M 205 330 C 300 250, 430 170, 590 130"
              fill="none"
              stroke="#c9a838"
              strokeOpacity="0.25"
              strokeWidth="2"
              strokeDasharray="2 7"
            />
            <path
              d="M 590 130 C 480 250, 360 320, 245 348"
              fill="none"
              stroke="#c9a838"
              strokeOpacity="0.25"
              strokeWidth="2"
              strokeDasharray="2 7"
            />
            <motion.path
              d="M 205 330 C 300 250, 430 170, 590 130"
              fill="none"
              stroke="#8B0010"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, delay: 0.5, ease: "easeInOut" }}
            />
            <motion.path
              d="M 590 130 C 480 250, 360 320, 245 348"
              fill="none"
              stroke="#8B0010"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, delay: 2.2, ease: "easeInOut" }}
            />

            {/* Pins — drop in matching the route timing */}
            <Pin x={205} y={330} delay={0.3} year="2018" label="University of Virginia" note="Where it all began" labelSide="left" />
            <Pin x={590} y={130} delay={1.9} year="2025" label="Brooklyn, New York" note="She said yes" labelSide="right" />
            <Pin x={245} y={348} delay={3.6} year="2027" label="The Forum Hotel" note="Forever starts here" labelSide="right" />

            {/* Heart at the final stop */}
            <motion.path
              d="M 245 296 c -5 -8 -16 -5 -16 3 c 0 7 9 12 16 17 c 7 -5 16 -10 16 -17 c 0 -8 -11 -11 -16 -3 Z"
              fill="#CC1428"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: [0, 1.25, 1], opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 4.2, duration: 0.6 }}
              style={{ transformOrigin: "245px 305px" }}
            />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
