import { NextResponse } from "next/server";

/**
 * Behind Render's proxy, the server only knows its own internal address
 * (http://localhost:10000), and that is what `req.url` and
 * `req.nextUrl.origin` report — even for a request a guest made to
 * www.jeffandkatie2027.com. Anything built from them sends guests to an
 * address that doesn't exist. These helpers avoid both.
 *
 * Edge-safe: no Node imports, so middleware can use it too.
 */

/**
 * A 307 redirect with a relative Location (e.g. "/welcome"). The browser
 * resolves it against the address it is already on, so it lands on the
 * right domain no matter what the server believes its own address is.
 */
export function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

interface HasHeaders {
  headers: { get(name: string): string | null };
  nextUrl: { origin: string };
}

/**
 * The site's public address, for absolute links (texted invite links,
 * email links). NEXT_PUBLIC_SITE_URL wins; otherwise the address the
 * visitor actually used, from the proxy's forwarded headers; the server's
 * own address is only a last resort (local development).
 */
export function publicOrigin(req: HasHeaders): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (host) {
    const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}
