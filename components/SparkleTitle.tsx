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
      <motion.h2
        className="section-title"
        aria-label={text}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.045, delayChildren: 0.15 } },
        }}
      >
        {Array.from(text).map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: 18, rotate: 6 },
              visible: {
                opacity: 1,
                y: 0,
                rotate: 0,
                transition: { type: "spring", damping: 13, stiffness: 220 },
              },
            }}
          >
            {ch === " " ? " " : ch}
          </motion.span>
        ))}
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
