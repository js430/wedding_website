"use client";

import Image from "next/image";
import Reveal from "./Reveal";
import SparkleTitle from "./SparkleTitle";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Gallery photos, in display order. Add a photo: put it in public/, add an
// entry here, then run `node scripts/make-thumbnails.mjs`. Optional
// `position` (CSS object-position) moves the square crop, e.g. "center 15%"
// for a tall photo with faces near the top.
const photos = [
  {
    src: "/photo-proposal.jpg",
    alt: "The proposal — Brooklyn Bridge",
    caption: "The question — Brooklyn, NY",
  },
  {
    src: "/proposal-yes.jpg",
    alt: "Jeffrey on one knee slipping the ring onto Katie's finger beneath the Brooklyn Bridge",
    caption: "She said yes",
  },
  {
    src: "/proposal-ring.jpg",
    alt: "Katie's hand with her engagement ring, holding a bouquet of dahlias and roses",
    caption: "The ring",
    // Show more of the bouquet above the ring in the square crop.
    position: "center 40%",
  },
  {
    src: "/proposal-arch.jpg",
    alt: "Katie and Jeffrey sitting in a brick archway, smiling",
    caption: "Framed in brick",
  },
  {
    src: "/photo-walking.jpg",
    alt: "Katie and Jeffrey walking together",
    caption: "Where we wander",
  },
  {
    src: "/photoshoot-1.jpg",
    alt: "Katie and Jeffrey standing together in a meadow below the hills",
    caption: "The long view",
  },
  {
    src: "/photoshoot.jpg",
    alt: "Katie in a field of zinnias, a flower tucked behind her ear",
    caption: "Among the zinnias",
  },
  {
    src: "/photoshoot-3.jpg",
    alt: "Katie and Jeffrey sitting in the grass of a peach orchard",
    caption: "An afternoon in the orchard",
  },
  {
    src: "/photoshoot-2.jpg",
    alt: "Katie resting in Jeffrey's lap between the rows of peach trees",
    caption: "Between the rows",
  },
  {
    src: "/photoshoot-4.jpg",
    alt: "Katie and Jeffrey beneath the peach trees in late summer",
    caption: "Late summer",
  },
  {
    src: "/celebration-smile.jpg",
    alt: "Katie and Jeffrey smiling at a small table with a vase of white flowers",
    caption: "All smiles",
  },
  {
    src: "/celebration-ring.jpg",
    alt: "Katie and Jeffrey standing together, Katie's hand with her ring on Jeffrey's chest",
    caption: "Ring on",
    // Tall photo with the faces near the top: keep them in the square crop.
    position: "center 15%",
  },
  {
    src: "/celebration-kiss.jpg",
    alt: "Katie and Jeffrey sharing a kiss at a small table",
    caption: "Sealed with a kiss",
  },
];

// Grid thumbnails live in /thumbs (made by scripts/make-thumbnails.mjs).
// next/image is `unoptimized` here: the optimizer's internal fetch of the
// source file carries no cookie and would be bounced by the invite gate.
const thumbOf = (src: string) => src.replace(/^\/(.*)\.[^.]+$/, "/thumbs/$1.webp");

export default function Gallery() {
  // Inner layers that drift as you scroll, alternating direction per photo
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  // The thumbnail that opened the lightbox, to give focus back on close.
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const touchX = useRef<number | null>(null);

  /** Next (+1) or previous (-1) photo, wrapping around. */
  function step(d: number) {
    setActive((a) => (a === null ? a : (a + d + photos.length) % photos.length));
  }

  function open(i: number) {
    openerRef.current = document.activeElement as HTMLElement | null;
    setActive(i);
  }

  function close() {
    setActive(null);
    // After the exit animation starts; the thumbnail is still in the page.
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        const direction = i % 2 === 0 ? 1 : -1;
        // The layer is scaled 1.14, so it overhangs the tile by 7% of its
        // height on each side. Keep the drift inside that, or small tiles
        // (phones) show their edges.
        const maxDrift = Math.min(26, rect.height * 0.06);
        const offset = Math.max(-1, Math.min(1, progress)) * maxDrift * direction;
        el.style.transform = `translateY(${offset}px) scale(1.14)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Esc closes the lightbox, the arrow keys move between photos; focus
  // starts on the close button and Tab cycles through the lightbox's buttons.
  const isOpen = active !== null;
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Tab") {
        e.preventDefault();
        const order = [closeRef.current, prevRef.current, nextRef.current].filter(Boolean) as HTMLElement[];
        const at = order.indexOf(document.activeElement as HTMLElement);
        order[(at + (e.shiftKey ? -1 : 1) + order.length) % order.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // Hold the page still behind the photo.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = previous;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section id="gallery" className="py-24 px-6 bg-rose-soft/20">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SparkleTitle text="Gallery" />
          <div className="section-divider">
            <span className="text-gold text-xl">✦</span>
          </div>
        </Reveal>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <Reveal key={i} delay={i * 120}>
                <button
                  type="button"
                  onClick={() => open(i)}
                  className="block w-full aspect-square overflow-hidden relative group cursor-zoom-in"
                  aria-label={`View ${p.alt}`}
                >
                  {/* Parallax layer — oversized so the drift never shows edges */}
                  <div
                    ref={(el) => { layerRefs.current[i] = el; }}
                    className="absolute inset-0 will-change-transform"
                    style={{ transform: "scale(1.14)" }}
                  >
                    <Image
                      src={thumbOf(p.src)}
                      alt={p.alt}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      style={{ objectPosition: p.position ?? "center" }}
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  {/* Caption overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-crimson-darkest/70 to-transparent pt-10 pb-3 px-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <p className="font-serif italic text-rose-blush text-sm text-left">{p.caption}</p>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center font-sans text-bark/60 text-sm">
            Photos coming soon.
          </p>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              // A sideways swipe moves between photos instead of closing.
              const start = touchX.current;
              touchX.current = null;
              const end = e.changedTouches[0]?.clientX;
              if (start === null || end === undefined || Math.abs(end - start) < 50) return;
              e.preventDefault();
              step(end < start ? 1 : -1);
            }}
            role="dialog"
            data-lenis-prevent
            aria-modal="true"
            aria-label={photos[active].caption}
            className="fixed inset-0 z-[150] bg-crimson-darkest/90 backdrop-blur-md flex flex-col items-center justify-center p-6 cursor-zoom-out"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); close(); }}
              aria-label="Close photo"
              className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-rose-blush/80 hover:text-rose-blush text-3xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-blush"
            >
              <span aria-hidden="true">×</span>
            </button>
            <button
              ref={prevRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              aria-label="Previous photo"
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-crimson-darkest/40 text-rose-blush/80 hover:text-rose-blush text-3xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-blush"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); step(1); }}
              aria-label="Next photo"
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-crimson-darkest/40 text-rose-blush/80 hover:text-rose-blush text-3xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-blush"
            >
              <span aria-hidden="true">›</span>
            </button>
            <motion.div
              initial={{ scale: 0.92, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 210, damping: 26 }}
              className="relative w-full max-w-3xl flex-1 max-h-[78vh] my-4"
            >
              <Image
                src={photos[active].src}
                alt={photos[active].alt}
                fill
                unoptimized
                className="object-contain"
                sizes="90vw"
                priority
              />
            </motion.div>
            <p className="font-script text-3xl text-gold mb-1">
              {photos[active].caption}
            </p>
            <p className="font-sans text-rose-blush/60 text-xs tracking-widest uppercase text-center">
              {active + 1} of {photos.length} · Swipe or use the arrows · Tap to close
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
