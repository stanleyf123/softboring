/**
 * Account timezone edits stay pending until the member confirms.
 * Reminders and the monthly digest follow the saved clock.
 */
export function timezoneChangePending(saved: string, selected: string) {
  const current = saved.trim();
  const next = selected.trim();
  return next.length > 0 && next !== current;
}
