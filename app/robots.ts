import type { MetadataRoute } from "next";

/**
 * Ask every crawler to stay away. The site is public so guests don't need
 * accounts, but it shouldn't be findable by searching the couple's names.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
