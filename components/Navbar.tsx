"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { InviteDevicesTrigger, InviteDevicesModal } from "@/components/InviteDevices";

const primaryLinks = [
  { label: "Our Story", href: "#story" },
  { label: "Details",   href: "#details" },
  { label: "Gallery",   href: "#gallery" },
];

const moreLinks = [
  { label: "Registry", href: "/registry" },
  { label: "Guide to Charlottesville", href: "/guide" },
  { label: "FAQ",      href: "/faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";
  const moreRef = useRef<HTMLLIElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [devicesOpen, setDevicesOpen] = useState(false);
  // Where focus goes back to when the dialog closes (the menu item that
  // opened it disappears along with its menu).
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeDevices = useCallback(() => setDevicesOpen(false), []);

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

  // Close the "More" dropdown on outside click, and on Escape (focus goes
  // back to the button).
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // Hovering opens the menu. A click right after (a mouse click, or a tap on
  // a tablet, which fires a hover first) must keep it open, not toggle it shut.
  const hoverOpenedAt = useRef(0);

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
          K &amp; J
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
            onMouseEnter={() => {
              if (!moreOpen) hoverOpenedAt.current = Date.now();
              setMoreOpen(true);
            }}
            onMouseLeave={() => setMoreOpen(false)}
            onBlur={(e) => {
              // Tabbing out of the menu closes it.
              if (!moreRef.current?.contains(e.relatedTarget as Node | null)) setMoreOpen(false);
            }}
          >
            <button
              ref={moreBtnRef}
              type="button"
              onClick={() => setMoreOpen((v) => (Date.now() - hoverOpenedAt.current < 600 ? true : !v))}
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
                        className="block px-5 py-2.5 font-sans text-sm tracking-widest uppercase whitespace-nowrap text-bark/70 hover:text-rose-deep hover:bg-rose-soft/15 transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <InviteDevicesTrigger
                      onClick={() => {
                        returnFocusRef.current = moreBtnRef.current;
                        setMoreOpen(false);
                        setDevicesOpen(true);
                      }}
                      className="block w-full text-left px-5 py-2.5 font-sans text-sm tracking-widest uppercase text-bark/70 hover:text-rose-deep hover:bg-rose-soft/15 transition-colors whitespace-nowrap"
                    />
                  </li>
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
          ref={toggleRef}
          className="md:hidden text-bark"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
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
            <li>
              <InviteDevicesTrigger
                onClick={() => {
                  returnFocusRef.current = toggleRef.current;
                  setMenuOpen(false);
                  setDevicesOpen(true);
                }}
                className="font-sans text-sm tracking-widest uppercase text-bark/70 hover:text-rose-deep transition-colors"
              />
            </li>
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

      <InviteDevicesModal open={devicesOpen} onClose={closeDevices} fallbackFocus={returnFocusRef} />
    </nav>
  );
}
