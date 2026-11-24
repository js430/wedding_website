import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Katie & Jeffrey",
};

/** Shown for any address that isn't a page on the site. */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-rose-blush flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-gold text-xl mb-4" aria-hidden="true">✦</p>
        <h1 className="font-script text-5xl sm:text-6xl text-bark leading-tight">Katie &amp; Jeffrey</h1>
        <p className="mt-6 font-serif text-xl text-bark">We couldn&apos;t find that page.</p>
        <p className="mt-2 font-sans text-sm text-bark/70 leading-relaxed">
          The link may be mistyped or out of date.
        </p>
        <Link href="/" className="btn-primary inline-block mt-8">
          Back to the wedding site
        </Link>
      </div>
    </main>
  );
}
