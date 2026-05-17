// lib/supabase.ts — Browser-side Supabase client.
// Falls back to a no-op stub if env vars aren't set so the UI still runs locally.

import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project")) return null;
  cached = createBrowserClient(url, key, {
    cookies: {
      get(name: string) {
        const match = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${name}=`));
        return match ? decodeURIComponent(match.split("=")[1]) : undefined;
      },
      set(name: string, value: string, options: CookieOptions) {
        const parts = [`${name}=${encodeURIComponent(value)}`, "path=/"];
        if (options.maxAge) parts.push(`max-age=${options.maxAge}`);
        if (options.domain) parts.push(`domain=${options.domain}`);
        if (options.sameSite) parts.push(`samesite=${options.sameSite}`);
        if (options.secure) parts.push("secure");
        document.cookie = parts.join("; ");
      },
      remove(name: string) {
        document.cookie = `${name}=; path=/; max-age=0`;
      },
    },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("your-project"));
}
