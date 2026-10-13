"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-reads the page's server data on a timer, so a live score on the home page keeps moving without a manual reload. */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
