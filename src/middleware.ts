import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ATTR_COOKIE, ATTR_MAX_AGE, REF_COOKIE, attributionFromUrl, referralFromUrl } from "@/lib/attribution";

/**
 * First line of defence for private areas. Each page and server action also
 * re-checks permissions on the server, and the database enforces row-level
 * security — so no single check is relied on alone.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isPrivate = pathname.startsWith("/admin") || pathname.startsWith("/app");

  if (isPrivate && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Campaign attribution (first-party cookies only). First campaign touch is
  // kept; the most recent referral code wins.
  const attr = attributionFromUrl(request.nextUrl);
  if (attr && !request.cookies.get(ATTR_COOKIE)) {
    response.cookies.set(ATTR_COOKIE, JSON.stringify(attr), { maxAge: ATTR_MAX_AGE, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  const ref = referralFromUrl(request.nextUrl);
  if (ref) {
    response.cookies.set(REF_COOKIE, ref, { maxAge: ATTR_MAX_AGE, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif)$).*)"],
};
