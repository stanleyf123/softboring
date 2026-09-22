export const DEFAULT_GA_MEASUREMENT_ID = "G-MFQ9J6B9DH";

/** The id public pages may load. Empty env keeps the usual id. This does not start analytics. */
export function gaMeasurementId() {
  const configured = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return configured || DEFAULT_GA_MEASUREMENT_ID;
}
