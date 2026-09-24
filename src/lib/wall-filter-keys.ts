import type { WallWeekChip } from "@/lib/wall-week-chips";
import { WALL_WEEK_CHIPS } from "@/lib/wall-week-chips";

export type FeelingBound = "min" | "max";

export type WallFilterKeyAction =
  | { type: "week"; chip: WallWeekChip }
  | { type: "feeling"; feelingMin: number | null; feelingMax: number | null };

/**
 * Steps a 1–5 feeling bound.
 * Up from empty starts at 1. Down from 1, or down from empty, clears the side.
 * The top of the scale stays at 5.
 */
export function stepFeelingBound(current: number | null, direction: -1 | 1): number | null {
  if (direction > 0) {
    if (current == null) return 1;
    if (current >= 5) return 5;
    return current + 1;
  }
  if (current == null || current <= 1) return null;
  return current - 1;
}

/** If the two sides cross, they meet on the number that just moved. */
export function applyFeelingStep(
  feelingMin: number | null,
  feelingMax: number | null,
  bound: FeelingBound,
  direction: -1 | 1,
): { feelingMin: number | null; feelingMax: number | null } {
  if (bound === "min") {
    const nextMin = stepFeelingBound(feelingMin, direction);
    const nextMax =
      nextMin != null && feelingMax != null && nextMin > feelingMax ? nextMin : feelingMax;
    return { feelingMin: nextMin, feelingMax: nextMax };
  }
  const nextMax = stepFeelingBound(feelingMax, direction);
  const nextMin =
    nextMax != null && feelingMin != null && nextMax < feelingMin ? nextMax : feelingMin;
  return { feelingMin: nextMin, feelingMax: nextMax };
}

export function nextWallWeekChip(current: WallWeekChip, key: string): WallWeekChip | null {
  const index = WALL_WEEK_CHIPS.indexOf(current);
  if (index < 0) return null;
  if (key === "Home") return WALL_WEEK_CHIPS[0];
  if (key === "End") return WALL_WEEK_CHIPS[WALL_WEEK_CHIPS.length - 1];
  if (key === "ArrowRight" || key === "ArrowDown") {
    return WALL_WEEK_CHIPS[(index + 1) % WALL_WEEK_CHIPS.length];
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return WALL_WEEK_CHIPS[(index - 1 + WALL_WEEK_CHIPS.length) % WALL_WEEK_CHIPS.length];
  }
  return null;
}

/** `[` `]` move the floor. `{` `}` or Shift with those brackets move the ceiling. */
export function feelingKeyStep(
  key: string,
  shiftKey: boolean,
): { bound: FeelingBound; direction: -1 | 1 } | null {
  const left = key === "[" || key === "{";
  const right = key === "]" || key === "}";
  if (!left && !right) return null;
  const shifted = key === "{" || key === "}" || shiftKey;
  return {
    bound: shifted ? "max" : "min",
    direction: right ? 1 : -1,
  };
}

export function wallFilterKeyAction(input: {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  typing: boolean;
  weekChipsFocused: boolean;
  weekChip: WallWeekChip;
  feelingMin: number | null;
  feelingMax: number | null;
}): WallFilterKeyAction | null {
  if (input.repeat) return null;
  if (input.metaKey || input.ctrlKey || input.altKey) return null;

  if (input.weekChipsFocused && !input.typing) {
    const chip = nextWallWeekChip(input.weekChip, input.key);
    if (!chip) return null;
    return { type: "week", chip };
  }

  if (input.typing || input.weekChipsFocused) return null;

  const step = feelingKeyStep(input.key, Boolean(input.shiftKey));
  if (!step) return null;
  const next = applyFeelingStep(input.feelingMin, input.feelingMax, step.bound, step.direction);
  if (next.feelingMin === input.feelingMin && next.feelingMax === input.feelingMax) return null;
  return { type: "feeling", ...next };
}
