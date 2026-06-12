"use client";

import Image from "next/image";
import Reveal from "./Reveal";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      layerRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // -0.5 .. 0.5 as the photo travels through the viewport center
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
                <div className="aspect-square overflow-hidden relative group">
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
                    <p className="font-serif italic text-rose-blush text-sm">{p.caption}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center font-sans text-bark/60 text-sm">
            Photos coming soon.
          </p>
        )}
      </div>
    </section>
  );
}
