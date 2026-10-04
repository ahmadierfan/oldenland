"use client";

import { useEffect, useState } from "react";
import { isLowPower } from "@/lib/device";

/**
 * Whether a section's WebGL stage should exist at all. On desktop it always does (no reload hitches);
 * on phones it is only mounted within about a screen of the viewport, so at most one or two GPU
 * contexts are alive at a time and memory is handed back as you scroll on.
 */
export function useStageMount(ref: React.RefObject<HTMLElement | null>) {
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !isLowPower()) return;
    const io = new IntersectionObserver(([e]) => setMounted(e.isIntersecting), { rootMargin: "120% 0px 120% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return mounted;
}
