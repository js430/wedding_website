import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GatePage from "@/components/GatePage";
import { SESSION_COOKIE, verifySession } from "@/lib/invite-crypto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katie & Jeffrey",
};

const PROBE = "https://same-site.invalid";

/**
 * Same-site paths only: "/x" yes; "//evil", "/\evil" and anything with "://"
 * no. Control characters and whitespace are refused outright: browsers strip
 * tabs and newlines from URLs, so "/<TAB>/evil.com" would become "//evil.com"
 * once the browser navigates to it. The final check resolves the path the way
 * a browser would and insists it stays on this site.
 */
function safeNext(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return "/";
  if (/[\u0000-\u0020\u007f-\u009f]/.test(v)) return "/";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.includes("://")) return "/";
  try {
    if (new URL(v, PROBE).origin !== PROBE) return "/";
  } catch {
    return "/";
  }
  return v;
}

/** Seconds left on a wrong-guess block, from ?blocked=<seconds> (1 = legacy flag). */
function blockedSeconds(raw: string | string[] | undefined): number {
  const v = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(v) && v > 0 ? Math.min(Math.round(v), 2 * 86400) : 3600;
}

export default async function Gate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The site is open: nobody should sit on a gate.
  if (process.env.INVITE_GATE !== "on") redirect("/");

  const params = await searchParams;
  const next = safeNext(params.next);

  // Already recognised on this device (e.g. unlocked in another tab): go on
  // to where they were headed.
  const jar = await cookies();
  // Percent-encode anything outside plain ASCII: a raw "日本" can't go in the
  // Location header (it would be a server error).
  if (await verifySession(jar.get(SESSION_COOKIE)?.value)) {
    redirect(next.replace(/[^\x21-\x7e]/g, (c) => encodeURIComponent(c)));
  }

  const reason = params.invalid ? "invalid" : params.blocked ? "blocked" : "none";

  return (
    <GatePage
      reason={reason}
      next={next}
      blockedFor={reason === "blocked" ? blockedSeconds(params.blocked) : 0}
    />
  );
}
