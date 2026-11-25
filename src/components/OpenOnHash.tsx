"use client";
import { useEffect } from "react";

/** Opens the <details> lesson a link points to (e.g. "Next lesson"), then scrolls to it. */
export function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el instanceof HTMLDetailsElement) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
