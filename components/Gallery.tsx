"use client";

import Image from "next/image";
import Reveal from "./Reveal";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const photos = [
  {
    src: "/photo-walking.jpg",
    alt: "Jeffrey and Katie walking together",
    caption: "Where we wander",
  },
  {
    src: "/photo-proposal.jpg",
    alt: "The proposal — Brooklyn Bridge",
    caption: "The question — Brooklyn, NY",
  },
];

export default function Gallery() {
  // Inner layers that drift as you scroll, alternating direction per photo
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);

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
        const offset = progress * 26 * direction;
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

  // Esc closes the lightbox
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <section id="gallery" className="py-24 px-6 bg-rose-soft/20">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2 className="section-title">Gallery</h2>
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
                  onClick={() => setActive(i)}
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
                      src={p.src}
                      alt={p.alt}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[150] bg-crimson-darkest/90 backdrop-blur-md flex flex-col items-center justify-center p-6 cursor-zoom-out"
          >
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
                className="object-contain"
                sizes="90vw"
                priority
              />
            </motion.div>
            <p className="font-script text-3xl text-gold mb-1">
              {photos[active].caption}
            </p>
            <p className="font-sans text-rose-blush/40 text-xs tracking-widest uppercase">
              Click anywhere to close
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
