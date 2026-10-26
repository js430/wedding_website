"use client";

import { motion } from "framer-motion";

// Gold glints that pop around the heading as the letters land
const SPARKLES = [
  { left: "14%", top: "-16%", delay: 0.4, size: "text-sm" },
  { left: "30%", top: "72%", delay: 0.6, size: "text-xs" },
  { left: "48%", top: "-30%", delay: 0.8, size: "text-base" },
  { left: "65%", top: "64%", delay: 0.95, size: "text-xs" },
  { left: "80%", top: "-12%", delay: 1.1, size: "text-sm" },
  { left: "91%", top: "42%", delay: 1.25, size: "text-xs" },
];

export default function SparkleTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/*
        Animated as one element, not per letter.

        .section-title paints a gradient clipped to the text. A child span
        carrying a transform or opacity gets its own compositing layer, and the
        parent's clipped gradient does not paint into it — the letter renders
        transparent and simply disappears. Framer leaves sub-pixel residual
        transforms on individual letters, so a staggered per-letter entrance
        dropped random letters ("Registry" rendering as "Re stry").
      */}
      <motion.h2
        className="section-title"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", damping: 15, stiffness: 180, delay: 0.1 }}
      >
        {text}
      </motion.h2>

      {SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className={`absolute text-gold pointer-events-none ${s.size}`}
          style={{ left: s.left, top: s.top }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          whileInView={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], rotate: 90 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: s.delay, duration: 1.0, ease: "easeOut" }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}
