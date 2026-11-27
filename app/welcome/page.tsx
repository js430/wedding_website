import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import { SESSION_COOKIE, verifySession } from "@/lib/invite-crypto";
import { displayHost } from "@/lib/invite-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome — Katie & Jeffrey",
};

export default async function Welcome() {
  const jar = await cookies();
  if (!(await verifySession(jar.get(SESSION_COOKIE)?.value))) redirect("/gate");

  const password = (process.env.SITE_PASSWORD ?? "").trim();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  let origin = configured;
  if (!origin) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
  }
  const host = origin ? displayHost(origin) : "";

  const btn =
    "inline-flex items-center justify-center px-5 py-2.5 font-sans text-xs tracking-widest uppercase transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-deep focus-visible:ring-offset-2";

  return (
    <main id="main" className="min-h-screen bg-rose-blush flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-gold text-xl mb-4" aria-hidden="true">✦</p>
        <h1 className="font-script text-6xl sm:text-7xl text-bark leading-tight break-words">
          Katie &amp; Jeffrey
        </h1>
        <p className="mt-3 font-sans text-xs tracking-widest uppercase text-bark/60">
          March 27, 2027 · Charlottesville, Virginia
        </p>

        <h2 className="mt-8 font-serif text-3xl text-rose-deep">You&rsquo;re in</h2>
        <p className="mt-2 font-serif italic text-lg text-bark/80">
          This device is all set &mdash; it&rsquo;ll stay signed in.
        </p>

        <div className="my-8 flex items-center justify-center gap-3 text-gold" aria-hidden="true">
          <span className="h-px w-12 bg-gold/40" />
          <span>✦</span>
          <span className="h-px w-12 bg-gold/40" />
        </div>

        <p className="font-sans text-sm text-bark leading-relaxed">
          To open the website on another device, like a computer:
        </p>
        <ol className="mt-4 space-y-3 font-sans text-sm text-bark leading-relaxed">
          <li>
            1. Go to <strong className="break-all">{host}</strong>
          </li>
          <li>2. Enter the password:</li>
        </ol>

        <p
          className="mt-3 bg-white/80 border border-rose-soft/60 px-3 py-4 font-serif text-2xl sm:text-3xl tracking-widest text-bark break-words select-all"
          aria-label="Password"
        >
          {password}
        </p>
        <div className="mt-3">
          <CopyButton
            text={password}
            label="Copy password"
            className={`${btn} border border-rose-deep/50 text-rose-deep hover:bg-rose-soft/20`}
          />
        </div>

        <p className="mt-6 font-sans text-xs text-bark/60 leading-relaxed">
          Please keep the password just for our guests.
        </p>

        <div className="mt-8">
          <Link href="/" className={`${btn} bg-rose-deep text-rose-blush hover:bg-crimson-dark`}>
            Continue to the website
          </Link>
        </div>
      </div>
    </main>
  );
}
