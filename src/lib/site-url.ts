/**
 * Canonical URL for redirects generated on the server or in the browser.
 *
 * Resolves with the following priority:
 * 1. Incoming HTTP Request headers (Origin, X-Forwarded-Host, Host)
 * 2. Client-side browser window.location.origin
 * 3. NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL environment variable
 * 4. VERCEL_PROJECT_PRODUCTION_URL (Vercel system variable)
 * 5. VERCEL_URL (deployment preview URL)
 * 6. Canonical production fallback: https://herlooku.vercel.app (in production)
 * 7. Development fallback: http://localhost:3000
 */
export function getSiteUrl(req?: Request | Headers): string {
  // 1. Inspect request headers if provided
  if (req) {
    const headers = "headers" in req ? req.headers : req;

    // Origin header (typically sent on POST requests)
    const origin = headers.get("origin");
    if (origin && isValidHttpUrl(origin)) {
      return origin.replace(/\/+$/, "");
    }

    // Forwarded host / proto (standard on Vercel and reverse proxies)
    const forwardedHost =
      headers.get("x-forwarded-host") || headers.get("host");
    if (forwardedHost) {
      const proto =
        headers.get("x-forwarded-proto") ||
        (forwardedHost.includes("localhost") || forwardedHost.includes("127.0.0.1")
          ? "http"
          : "https");
      const url = `${proto}://${forwardedHost}`;
      if (isValidHttpUrl(url)) {
        return url.replace(/\/+$/, "");
      }
    }

    if ("url" in req && req.url) {
      try {
        const parsed = new URL(req.url);
        if (isValidHttpUrl(parsed.origin)) {
          return parsed.origin.replace(/\/+$/, "");
        }
      } catch {
        // ignore invalid URL
      }
    }
  }

  // 2. Browser window origin if running on client
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  // 3. Explicitly configured site URL env vars
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured && isValidHttpUrl(configured)) {
    return configured.replace(/\/+$/, "");
  }

  // 4. Vercel project canonical production URL (e.g. herlooku.vercel.app)
  const vercelProjectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProjectUrl) {
    const formatted = vercelProjectUrl.startsWith("http")
      ? vercelProjectUrl
      : `https://${vercelProjectUrl}`;
    if (isValidHttpUrl(formatted)) {
      return formatted.replace(/\/+$/, "");
    }
  }

  // 5. Vercel deployment URL (e.g. herlooku-xyz.vercel.app)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    const formatted = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    if (isValidHttpUrl(formatted)) {
      return formatted.replace(/\/+$/, "");
    }
  }

  // 6. Production fallback (never default to localhost in production)
  if (process.env.NODE_ENV === "production") {
    return "https://herlooku.vercel.app";
  }

  // 7. Local development fallback
  return "http://localhost:3000";
}

function isValidHttpUrl(candidate: string): boolean {
  try {
    const u = new URL(candidate);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
