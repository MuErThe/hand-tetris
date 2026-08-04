import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games/registry";

// sitemap.ts compiles to a Route Handler, which `output: "export"` refuses to
// emit unless it is pinned static. Nothing here is request-dependent.
export const dynamic = "force-static";

const SITE_URL = "https://squint.mdzabeeh.com";

// Trailing slashes throughout, to match `trailingSlash: true` in
// next.config.ts — without them every URL here would 308 on the way in.
const url = (path: string) => `${SITE_URL}${path}${path.endsWith("/") ? "" : "/"}`;

/**
 * Generated from the game registry, so a new game is listed the moment it is
 * added. Replaces the hand-maintained public/sitemap.xml.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1.0 },
    { url: url("/warm-up"), changeFrequency: "monthly", priority: 0.9 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/focalism"), changeFrequency: "monthly", priority: 0.8 },
    ...GAMES.map((g) => ({
      url: url(g.path),
      changeFrequency: "monthly" as const,
      priority: g.sitemapPriority,
    })),
  ];
}
