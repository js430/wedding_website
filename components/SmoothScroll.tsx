"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide inertia smooth scrolling. Also routes same-page anchor
 * clicks through Lenis so they glide instead of jumping.
 * Skipped entirely for reduced-motion users.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest(
        'a[href^="#"], a[href^="/#"]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      // Cross-page anchors (e.g. /#story from /registry) navigate normally
      if (href.startsWith("/#") && window.location.pathname !== "/") return;

      const hash = href.startsWith("/#") ? href.slice(1) : href;
      const el = document.querySelector(hash);
      if (!el) return;

      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -64, duration: 1.6 });
    }
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
