"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Gold ring that trails the cursor with a soft lerp, blooming over
 * interactive elements. Desktop pointers only; never on touch.
 */
export default function Cursor() {
  const posRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let mx = -100, my = -100;
    let rx = -100, ry = -100;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const interactive = !!(e.target as HTMLElement).closest(
        "a, button, [role='button'], input, select, textarea, label"
      );
      ringRef.current?.classList.toggle("cursor-ring-active", interactive);
    };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (posRef.current) {
        posRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={posRef}
      aria-hidden="true"
      className="fixed top-0 left-0 z-[999] pointer-events-none"
    >
      <div ref={ringRef} className="cursor-ring" />
    </div>
  );
}
