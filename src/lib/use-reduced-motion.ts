import { prefersReducedMotion } from "@/lib/reduced-motion";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

/** Server and the first hydrated paint assume motion is welcome. CSS stills the first frame. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => prefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    () => false,
  );
}
