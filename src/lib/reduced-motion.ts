/** Decorative motion stays still when the visitor asks for less movement. */

export function prefersReducedMotion(matches: boolean | null | undefined) {
  return matches === true;
}

export function decorativeMotion(reducedMotion: boolean): "still" | "move" {
  return prefersReducedMotion(reducedMotion) ? "still" : "move";
}
