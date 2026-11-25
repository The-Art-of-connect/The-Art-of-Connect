import { NextResponse, type NextRequest } from "next/server";
import { INSIDE_PREVIEW_COOKIE, INSIDE_PREVIEW_ENABLED } from "@/lib/inside-preview";

/** Starts (or ends) the temporary member-area preview, then opens the requested page. */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const to = url.searchParams.get("to") ?? "/app";
  const exit = url.searchParams.get("exit") === "1";
  const safe = /^\/app(\/[a-z0-9/-]*)?$/.test(to) ? to : "/app";
  url.search = "";
  url.pathname = exit || !INSIDE_PREVIEW_ENABLED ? "/inside-preview" : safe;
  const res = NextResponse.redirect(url);
  if (exit || !INSIDE_PREVIEW_ENABLED) res.cookies.delete(INSIDE_PREVIEW_COOKIE);
  else res.cookies.set(INSIDE_PREVIEW_COOKIE, "1", { maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  return res;
}
