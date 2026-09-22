/** Quiet count on this device. Off until someone asks for it. */
export const SOFT_COUNT_STORAGE_KEY = "softboring.softCount.v1";

export type SoftCount = {
  words: number;
  characters: number;
};

const CJK = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;
const WORDISH = /[\p{L}\p{N}]/u;

export function countSoftText(text: string): SoftCount {
  const normalized = text.normalize("NFC");
  const characters = Array.from(normalized.replace(/\s+/g, "")).length;
  const cjk = normalized.match(CJK) ?? [];
  const rest = normalized.replace(CJK, " ");
  const words = rest.split(/\s+/).filter((part) => WORDISH.test(part));
  return {
    words: cjk.length + words.length,
    characters,
  };
}

export function countSoftParts(parts: readonly unknown[]): SoftCount {
  const text = parts
    .filter((part): part is string => typeof part === "string")
    .join("\n");
  return countSoftText(text);
}

export function softCountEnabledFromStorage(raw: string | null | undefined): boolean {
  return raw === "1";
}

type CountStorage = {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

export function readSoftCountEnabled(storage: CountStorage | null | undefined): boolean {
  if (!storage) return false;
  try {
    return softCountEnabledFromStorage(storage.getItem(SOFT_COUNT_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function writeSoftCountEnabled(on: boolean, storage: CountStorage | null | undefined) {
  if (!storage?.setItem || !storage.removeItem) return;
  try {
    if (on) storage.setItem(SOFT_COUNT_STORAGE_KEY, "1");
    else storage.removeItem(SOFT_COUNT_STORAGE_KEY);
  } catch {
    // Ignore quota / private mode.
  }
}
