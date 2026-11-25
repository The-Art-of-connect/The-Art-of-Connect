import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { validUrl } from "@/lib/env";

/**
 * Refreshes the auth session cookie and returns the current user (if any).
 * Never throws: a misconfiguration or an auth outage degrades to "signed out"
 * (private areas then redirect to sign-in) instead of breaking every page.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = validUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response, user: null };

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    return { response, user: data.user };
  } catch {
    return { response, user: null };
  }
}
