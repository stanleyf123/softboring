/** Whether the timezone checklist step is done after a settings patch. */
export function nextOnboardingTimezoneSet(
  current: boolean,
  patch: { onboardingTimezoneSet?: boolean; timezone?: string },
) {
  if (patch.onboardingTimezoneSet !== undefined) return patch.onboardingTimezoneSet;
  if (patch.timezone !== undefined) return true;
  return current;
}
