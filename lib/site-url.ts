import { headers } from "next/headers";

/**
 * Resolves the current deployment's base URL for building absolute links
 * (e.g. the email-confirmation redirect). Prefers an explicit env var so
 * behavior is predictable in production; falls back to request headers
 * for local development and preview deployments.
 */
export async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
