"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const WEDDING_PALETTE = [
  { hex: "#FEE8EC", label: "Blush" },
  { hex: "#FFB3C4", label: "Pink" },
  { hex: "#CC1428", label: "Crimson" },
  { hex: "#8B0010", label: "Burgundy" },
  { hex: "#1E0008", label: "Maroon" },
] as const;

const DARK_TEXT = "#1E0008";
const LIGHT_TEXT = "#FEE8EC";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function textColorFor(hex: string): string {
  const l = luminance(hexToRgb(hex));
  const dark = contrast(l, luminance(hexToRgb(DARK_TEXT)));
  const light = contrast(l, luminance(hexToRgb(LIGHT_TEXT)));
  return dark >= light ? DARK_TEXT : LIGHT_TEXT;
}

export default function ColorPalette() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = WEDDING_PALETTE.find((c) => c.hex === selected) ?? null;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    setCopied(false);
  }, [selected]);

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently: the value is on screen to copy by hand.
    }
  }

  return (
    <div className="bg-white rounded p-3 mt-3">
      {/* Wraps instead of overflowing: five 44px tap targets cannot fit one
          row on a 320px phone, and a second row beats a sideways-scrolling page. */}
      <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-3 sm:gap-x-3">
        {WEDDING_PALETTE.map(({ hex, label }) => {
          const isSelected = selected === hex;
          return (
            <button
              key={hex}
              type="button"
              aria-label={`${label}, ${hex}`}
              aria-pressed={isSelected}
              aria-expanded={isSelected}
              onClick={() => setSelected(isSelected ? null : hex)}
              className="group flex flex-col items-center gap-1 cursor-pointer focus:outline-none"
            >
              <span
                className={`block w-11 h-11 sm:w-14 sm:h-14 border border-gray-200 motion-safe:transition-all motion-safe:duration-150 motion-safe:group-hover:scale-[1.15] motion-safe:group-focus-visible:scale-[1.15] group-hover:shadow-lg group-focus-visible:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-rose-deep group-focus-visible:ring-offset-2 ${
                  isSelected ? "ring-2 ring-offset-2 ring-gold" : ""
                }`}
                style={{ backgroundColor: hex }}
              />
              <span className="font-sans text-gray-500 text-xs">{label}</span>
            </button>
          );
        })}
      </div>

      {!active && (
        <p className="font-sans text-gray-400 text-xs mt-3">
          Tap a colour to see it larger.
        </p>
      )}

      <div aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {active && (
            <motion.div
              key={active.hex}
              data-testid="palette-panel"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="mt-4"
            >
              <div
                className="w-full h-32 border border-gray-200 flex flex-col items-center justify-center gap-1"
                style={{
                  backgroundColor: active.hex,
                  color: textColorFor(active.hex),
                }}
              >
                <span data-testid="palette-name" className="font-serif text-2xl">
                  {active.label}
                </span>
                <span
                  data-testid="palette-hex"
                  className="font-sans text-sm tracking-widest uppercase"
                >
                  {active.hex.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3">
                <p className="font-sans text-gray-500 text-xs">
                  RGB {hexToRgb(active.hex).join(", ")}
                </p>
                <button
                  type="button"
                  onClick={() => copyHex(active.hex)}
                  className="font-sans text-xs tracking-widest uppercase border border-rose-deep text-rose-deep hover:bg-rose-deep hover:text-rose-blush px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {copied ? "Copied ✓" : "Copy hex"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
