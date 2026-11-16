import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GatePage from "@/components/GatePage";
import { SESSION_COOKIE, verifySession } from "@/lib/invite-crypto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katie & Jeffrey — March 27, 2027",
};

/** Same-site paths only: "/x" yes; "//evil", "/\evil" and anything with "://" no. */
function safeNext(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return "/";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.includes("://")) return "/";
  return v;
}

export default async function Gate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The site is open: nobody should sit on a gate.
  if (process.env.INVITE_GATE !== "on") redirect("/");

  // Already recognised on this device.
  const jar = await cookies();
  if (await verifySession(jar.get(SESSION_COOKIE)?.value)) redirect("/");

  const params = await searchParams;
  const reason = params.invalid ? "invalid" : params.blocked ? "blocked" : "none";

  return <GatePage reason={reason} next={safeNext(params.next)} />;
}
