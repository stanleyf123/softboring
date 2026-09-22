/** A cream bloom after saving a review. On until this device asks it to stay quiet. */
export const SOFT_BLOOM_STORAGE_KEY = "softboring.softBloom.v1";

export function softBloomEnabledFromStorage(raw: string | null | undefined): boolean {
  return raw !== "0";
}

type BloomStorage = {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
};

export function readSoftBloomEnabled(storage: BloomStorage | null | undefined): boolean {
  if (!storage) return true;
  try {
    return softBloomEnabledFromStorage(storage.getItem(SOFT_BLOOM_STORAGE_KEY));
  } catch {
    return true;
  }
}

/** Bloom classes stay off when the device asks for less motion. */
export function saveBloomClasses(enabled: boolean, reducedMotion: boolean) {
  const still = !enabled || reducedMotion;
  return {
    motion: still ? ("still" as const) : ("bloom" as const),
    wrap: still ? "" : "soft-save-bloom",
    card: still ? "" : "soft-save-bloom-card",
  };
}

export function writeSoftBloomEnabled(on: boolean, storage: BloomStorage | null | undefined) {
  if (!storage?.setItem) return;
  try {
    storage.setItem(SOFT_BLOOM_STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Ignore quota / private mode. The in-memory choice still holds for this view.
  }
}
