/**
 * Canonical URL for redirects generated on the server.
 *
 * Production defines NEXT_PUBLIC_SITE_URL in Vercel. VERCEL_URL is retained as
 * a safe preview fallback, while localhost stays local-development only.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
