import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ANONYMOUS_PREVIEW_ENABLED, INSIDE_PREVIEW_COOKIE, INSIDE_PREVIEW_ENABLED } from "@/lib/inside-preview";
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

  // Temporary owner review: read-only member-area preview without an account.
  const insidePreview = INSIDE_PREVIEW_ENABLED && ANONYMOUS_PREVIEW_ENABLED && !user && request.cookies.get(INSIDE_PREVIEW_COOKIE)?.value === "1";
  if (insidePreview && request.method !== "GET" && request.method !== "HEAD" && (pathname.startsWith("/app") || pathname.startsWith("/api"))) {
    return new NextResponse("Preview only — nothing can be saved.", { status: 403 });
  }

  if (isPrivate && !user && !(insidePreview && pathname.startsWith("/app"))) {
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
