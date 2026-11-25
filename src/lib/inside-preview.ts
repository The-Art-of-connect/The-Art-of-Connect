/**
 * TEMPORARY — owner review of the signed-in member area on the live site.
 *
 * A visitor who opens /inside-preview gets a cookie that lets them browse the
 * member pages as an empty, read-only "preview member". The preview viewer has
 * no account and no session: every database request runs anonymously, so row
 * security returns no member data, and every save, payment or form submission
 * is refused (see middleware). Remove this file, the /inside-preview route and
 * the references to INSIDE_PREVIEW_* to retire the preview.
 */
export const INSIDE_PREVIEW_ENABLED = true;
/**
 * Anonymous browsing of the member area is OFF: previews are for the owner
 * (and executives) only, signed in with MFA. Members' private information
 * is never shown and paid features stay locked either way.
 */
export const ANONYMOUS_PREVIEW_ENABLED = false;
export const INSIDE_PREVIEW_COOKIE = "aoc_inside_preview";
export const INSIDE_PREVIEW_ID = "00000000-0000-0000-0000-000000000000";
