# Soft print week, wall color preference, onboarding checklist

No new environment variables. Stripe and email are not required.

## Soft print / PDF of one week (client)

Soft+ history detail keeps the cream/blush **PNG postcard**, and adds **Print this week** — browser print with a soft postcard layout and print-friendly CSS (`soft-week-print`). Choose “Save as PDF” in the print dialog. Free / signed-out do not see the controls.

## Soft Wall preferred note color

Soft+ can pick a preferred sticky color when pinning a week to Soft Wall. The choice is stored on `user_settings.preferred_wall_color` and remembered for the next share. Free still shares without a color picker (server falls back to the rotating palette).

## Soft onboarding checklist polish

After welcome, a dismissible checklist appears only on **Home** and **Account** (not across every page). Steps: nickname, first review, Soft Wall peek, and Soft+ invite when eligible. Completed steps show a quiet “Done”; finishing all steps tucks the card away without nagging.
