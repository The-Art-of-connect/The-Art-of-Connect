"use client";
import { useEffect } from "react";
import { moderatorHeartbeat } from "@/app/actions/circle";

/** While a moderator has the discussion open, members see "Authorized moderator present". */
export function ModeratorHeartbeat({ topicId }: { topicId: string }) {
  useEffect(() => {
    let alive = true;
    const beat = () => { if (alive && document.visibilityState === "visible") moderatorHeartbeat(topicId).catch(() => null); };
    beat();
    const t = setInterval(beat, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [topicId]);
  return null;
}
