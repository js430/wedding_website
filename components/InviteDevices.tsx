"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useInvite } from "@/lib/use-invite";

const TRIGGER_TEXT = "Open on another device";

/**
 * The trigger button. Renders nothing unless this device's household is
 * recognised. Style it per placement with `className`.
 */
export function InviteDevicesTrigger({
  className = "",
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  const { status } = useInvite();
  if (status !== "ready") return null;
  return (
    <button type="button" onClick={onClick} className={className} aria-haspopup="dialog">
      {TRIGGER_TEXT}
    </button>
  );
}

type SendState = "idle" | "sending" | "sent" | "limited" | "error";

/**
 * The dialog. Rendered in a portal on <body> so it is never inside a <form>,
 * and never trapped by the navbar's backdrop-filter.
 * `fallbackFocus` receives focus on close if the opener has left the page
 * (for example a dropdown item that closes with the dropdown).
 */
export function InviteDevicesModal({
  open,
  onClose,
  fallbackFocus,
}: {
  open: boolean;
  onClose: () => void;
  fallbackFocus?: React.RefObject<HTMLElement | null>;
}) {
  const { status, name, url, hasEmail } = useInvite();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [send, setSend] = useState<SendState>("idle");
  const [qr, setQr] = useState("");

  const shown = open && status === "ready";

  useEffect(() => setMounted(true), []);

  // Remember the opener on open; give focus back on close.
  useEffect(() => {
    if (!shown) return;
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body && active !== document.documentElement ? active : null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      const opener = openerRef.current;
      const target = opener && opener.isConnected ? opener : fallbackFocus?.current;
      window.setTimeout(() => target?.focus(), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  // Fresh state each time it opens.
  useEffect(() => {
    if (shown) {
      setCopied(false);
      setSend("idle");
    }
  }, [shown]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, [href]"),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shown]);

  // QR code, generated in the browser from our own link.
  useEffect(() => {
    if (!shown || !url) return;
    let alive = true;
    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      color: { dark: "#1E0008", light: "#FFFFFF" },
    })
      .then((svg) => alive && setQr(svg))
      .catch(() => alive && setQr(""));
    return () => {
      alive = false;
    };
  }, [shown, url]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently: the link is in the field to copy by hand.
    }
  }, [url]);

  async function emailMe() {
    if (send === "sending") return;
    setSend("sending");
    try {
      const res = await fetch("/api/invite/send-self", { method: "POST" });
      setSend(res.ok ? "sent" : res.status === 429 ? "limited" : "error");
    } catch {
      setSend("error");
    }
  }

  if (!mounted) return null;

  const btn =
    "inline-flex items-center justify-center px-5 py-2.5 font-sans text-xs tracking-widest uppercase transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-deep focus-visible:ring-offset-2";
  const primary = `${btn} bg-rose-deep text-rose-blush hover:bg-crimson-dark`;
  const secondary = `${btn} border border-rose-deep/50 text-rose-deep hover:bg-rose-soft/20`;

  const message =
    send === "sent"
      ? "Sent — check your inbox."
      : send === "limited"
        ? "You've requested a few already — try again in a little while."
        : send === "error"
          ? "Sorry, we couldn't send that just now. Please copy the link instead."
          : "";

  return createPortal(
    <AnimatePresence>
      {shown && (
        <motion.div
          key="invite-devices"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bark/60 p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-full overflow-y-auto bg-rose-blush text-bark p-6 sm:p-8 shadow-2xl outline-none text-center"
          >
            <h2 id={titleId} className="font-serif text-2xl text-rose-deep mb-3">
              {TRIGGER_TEXT}
            </h2>
            <p className="font-sans text-sm text-bark/80 leading-relaxed mb-5">
              This is your household&apos;s personal link for {name}. It works on any device &mdash; open it once
              and that device stays in.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={url}
                aria-label="Your personal link"
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-white border border-rose-soft/60 px-3 py-2.5 font-sans text-sm text-bark focus:outline-none focus:ring-2 focus:ring-rose-deep"
              />
              <button type="button" onClick={copy} className={primary}>
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            </div>

            {hasEmail && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={emailMe}
                  disabled={send === "sending" || send === "sent"}
                  className={`${secondary} disabled:opacity-60`}
                >
                  {send === "sending" ? "Sending…" : "Email it to me"}
                </button>
                <p role="status" aria-live="polite" className="font-sans text-sm text-bark/80 mt-2 min-h-[1.25rem]">
                  {message}
                </p>
              </div>
            )}

            {qr && (
              <div className="mb-6">
                <div
                  className="mx-auto w-[168px] h-[168px] bg-white [&>svg]:block [&>svg]:w-full [&>svg]:h-full"
                  role="img"
                  aria-label="QR code of your personal link"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <p className="font-sans text-xs text-bark/70 mt-2">
                  On a computer? Scan this with your phone&apos;s camera.
                </p>
              </div>
            )}

            <button type="button" onClick={onClose} className={primary}>
              Done
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Trigger + modal in one piece, for placements that don't need to coordinate (the footer). */
export default function InviteDevices({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <InviteDevicesTrigger className={className} onClick={() => setOpen(true)} />
      <InviteDevicesModal open={open} onClose={close} />
    </>
  );
}
