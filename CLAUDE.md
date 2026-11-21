# Working on Nuke30

## Owner preferences
- **Always ship to TestFlight after an app change.** Once a change is committed and pushed, run the
  `iOS` workflow (`.github/workflows/ios.yml`) with `testflight: true` on the working branch.
  Don't ask first. Then check the run until it finishes (look for "UPLOAD SUCCEEDED" / "No errors
  uploading" in the "Upload to TestFlight" step) and report the build number.
  Docs-only changes (README, CLAUDE.md, marketing text) don't need a build.
- Explain steps for the owner click-by-click, in plain language. Show screenshots of UI changes.
- Don't push again while a TestFlight run is in progress: a push to the same branch cancels it.

## Project state
- Repo `ctjoey/Badge-` (public), working branch `claude/nuke30-outage-tracker-9b6wbp` (also the default branch).
- App: Next.js static export (`out/`) wrapped with Capacitor 8 for iOS (`ios/`). Bundle id
  `com.capozza.nuke30`. iPhone-only, portrait-only, privacy manifest `ios/App/App/PrivacyInfo.xcprivacy`.
- Version comes from `package.json` (`1.1.1`); the build number is the workflow run number.
- **App Store:** version 1.1.0 (build 47) submitted for review on 2026-11-15; rejected 2026-11-16 (Guideline 2.1 "Information Needed", not a bug),
  resubmitted 2026-11-16 with notes from `marketing/app-review-notes.md` + a screen-recording link. Any App Store update
  needs a new `package.json` version (e.g. 1.1.1) and a new submission in App Store Connect.
- Signing: repo secrets `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (key must be **Admin**),
  variable `BUNDLE_ID_PREFIX=com.capozza`. `scripts/normalize-p8.sh` repairs pasted keys.
- Support email: `Nuke30app@outlook.com` (`src/utils/contact.ts`).
- Privacy/support pages: `docs/privacy.html`, `docs/index.html`, served by GitHub Pages at
  `https://ctjoey.github.io/Badge-/` (Pages source: this branch, `/docs`).
- Live on the App Store: https://apps.apple.com/us/app/nuke30-badge-reminder/id6834612799 (`APP_LINK` in `src/utils/share.ts`).

## App structure
- Tabs: **Status** (one card per picked plant: On Site / 30 Day Badge Reminder + date, days left,
  Remove from Status), **Outages** (My sites / All sites / Following, star to follow, pencil + Add / Update
  for the user's own dates, current + upcoming only), **Settings** (instructions, plant dropdown,
  reminder-days dropdown 1–15, iPhone alerts panel + Send test alert, Share Nuke30, Help & outage updates).
- Local data only: `localStorage` key `nuke30_data_v2` (`src/utils/storage.ts`).
- Alerts: `@capacitor/local-notifications`, 8 AM on chosen days + the last day; same-day catch-up
  (`src/utils/reminders.ts`, `src/utils/notifications.ts`). Tapping an alert opens Status.
- Expired (Day 31+) sites play the mushroom-cloud blast on every open (`src/components/NukeBlast.tsx`,
  cloud painted on canvas in `src/utils/cloudRender.ts`, daytime sky in `src/app/globals.css`).
- Outage data: `src/data/outages.json`, refreshed weekly (Mondays) by `.github/workflows/outages.yml`
  from NRC daily power reports (`scripts/scrape-outages.mjs`, `src/utils/outageModel.mjs`).
  Upcoming dates are the FIRST day of a 6-week forecast window (owner wants the start, not the middle):
  model cycle date minus 21 days (`WINDOW_LEAD_DAYS`). `src/data/outageCorrections.json` holds nuclearhustle.com/outages
  window starts (checked 2026-11-21) for 83 units, re-applied on every weekly refresh until NRC reports show that outage.
  A projected outage whose window has opened shows "Due now" for 42 days. To re-check against that site, run the
  "Fetch nuclearhustle outages" workflow: it commits a copy of the page to `data-raw/nuclearhustle/` (delete it after use).
  Plants list: `src/data/plants.json` (55 sites, 95 units).

## Checks and tools
- `npm test` (vitest), `npm run lint`, `npm run typecheck`, `npm run build`.
- `npm run screenshots` regenerates App Store screenshots (`marketing/store-screenshots/`, plus the
  1206×2622 set App Store Connect currently asks for). Listing text: `marketing/app-store-copy.md`;
  submission steps: `marketing/app-store-checklist.md`.
- This cloud workspace can't reach nrc.gov or github.io; GitHub Actions can.
