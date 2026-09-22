export type SoftShortcutSurface = "review" | "wall" | "other";

export type SoftShortcutAction = "toggle-help" | "close-help" | "quiet-writing" | "wall-search";

export function softShortcutSurface(pathname: string): SoftShortcutSurface {
  if (pathname === "/review" || pathname.startsWith("/review/")) return "review";
  if (pathname === "/wall" || pathname.startsWith("/wall/")) return "wall";
  return "other";
}

export function isSoftShortcutPath(pathname: string) {
  return softShortcutSurface(pathname) !== "other";
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Keys the help sheet teaches. They stay quiet while someone is typing,
 * and `q` / `/` only apply on the page that can use them.
 */
export function softShortcutAction(input: {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  typing: boolean;
  surface: SoftShortcutSurface;
  helpOpen: boolean;
}): SoftShortcutAction | null {
  if (input.repeat) return null;
  if (input.surface === "other") return null;

  if (input.key === "Escape" && input.helpOpen) return "close-help";
  if (input.typing) return null;
  if (input.metaKey || input.ctrlKey || input.altKey) return null;

  if (input.key === "?" || (input.key === "/" && input.shiftKey)) return "toggle-help";
  if (input.helpOpen) return null;

  if (input.surface === "review" && (input.key === "q" || input.key === "Q")) {
    return "quiet-writing";
  }
  if (input.surface === "wall" && input.key === "/" && !input.shiftKey) {
    return "wall-search";
  }
  return null;
}
