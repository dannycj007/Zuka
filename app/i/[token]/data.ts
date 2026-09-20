import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getInvite, type InviteData } from "@/lib/get-invite";

/**
 * page.tsx, generateMetadata, and opengraph-image.tsx all need the same
 * invite lookup for one request. react's cache() memoizes per-request so
 * that's one DB round trip, not three.
 */
export const loadInvite = cache(
  async (token: string): Promise<InviteData | null> => {
    const supabase = await createClient();
    return getInvite(supabase, token);
  },
);
