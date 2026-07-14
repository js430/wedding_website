"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const primaryLinks = [
  { label: "Our Story", href: "#story" },
  { label: "Details",   href: "#details" },
  { label: "Gallery",   href: "#gallery" },
];

const moreLinks = [
  { label: "Registry", href: "/registry" },
  { label: "Guide",    href: "/guide" },
  { label: "FAQ",      href: "/faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";
  const moreRef = useRef<HTMLLIElement>(null);

  // Anchor links only work on the homepage — prefix with / when elsewhere
  function resolveHref(href: string) {
    if (href.startsWith("#") && !onHome) return `/${href}`;
    return href;
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the "More" dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-rose-blush/95 backdrop-blur shadow-sm py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        <a
          href={resolveHref("#top")}
          className="font-serif text-xl text-bark tracking-wide"
        >
          J &amp; K
        </a>

        {/* Desktop */}
        <ul className="hidden md:flex items-center gap-8">
          {primaryLinks.map((l) => (
            <li key={l.href}>
              <a href={resolveHref(l.href)} className="nav-link">
                {l.label}
              </a>
            </li>
          ))}

          {/* More dropdown */}
          <li
            ref={moreRef}
            className="relative"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="nav-link flex items-center gap-1"
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              More
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {moreOpen && (
              <ul className="absolute right-0 top-full pt-3">
                <div className="bg-rose-blush/95 backdrop-blur border border-rose-soft/40 shadow-lg py-2 min-w-[160px]">
                  {moreLinks.map((l) => (
                    <li key={l.href}>
                      <a
                        href={resolveHref(l.href)}
                        onClick={() => setMoreOpen(false)}
                        className="block px-5 py-2.5 font-sans text-sm tracking-widest uppercase text-bark/70 hover:text-rose-deep hover:bg-rose-soft/15 transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </div>
              </ul>
            )}
          </li>

          {/* RSVP — primary action */}
          <li>
            <a
              href={resolveHref("#rsvp")}
              className="inline-block bg-rose-deep text-rose-blush px-6 py-2 font-sans text-xs tracking-widest uppercase transition-colors duration-300 hover:bg-crimson-dark"
            >
              RSVP
            </a>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-bark"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-rose-blush backdrop-blur border-t border-rose-soft/40">
          <ul className="flex flex-col items-center gap-5 py-6">
            {[...primaryLinks, ...moreLinks].map((l) => (
              <li key={l.href}>
                <a
                  href={resolveHref(l.href)}
                  onClick={() => setMenuOpen(false)}
                  className="font-sans text-sm tracking-widest uppercase text-bark/70 hover:text-rose-deep transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-1">
              <a
                href={resolveHref("#rsvp")}
                onClick={() => setMenuOpen(false)}
                className="inline-block bg-rose-deep text-rose-blush px-8 py-2.5 font-sans text-xs tracking-widest uppercase"
              >
                RSVP
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
