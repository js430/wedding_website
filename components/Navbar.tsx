"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const links = [
  { label: "Our Story", href: "#story" },
  { label: "Details",   href: "#details" },
  { label: "Gallery",   href: "#gallery" },
  { label: "Registry",  href: "/registry" },
  { label: "Guide",     href: "/guide" },
  { label: "FAQ",       href: "/faq" },
  { label: "RSVP",      href: "#rsvp" },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const pathname = usePathname();
  const onHome   = pathname === "/";

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
        <ul className="hidden md:flex gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a href={resolveHref(l.href)} className="nav-link">
                {l.label}
              </a>
            </li>
          ))}
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
            {links.map((l) => (
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
          </ul>
        </div>
      )}
    </nav>
  );
}
