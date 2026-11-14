# Nuke30 — Nuclear UA & Outage Tracker

Nuke30 is a local-first, offline-capable PWA for nuclear outage workers, traveling contractors and plant staff. It tracks:

- your unescorted access (UA) status
- the **30-day continuous access window** (NRC 10 CFR § 73.56)
- past, active and upcoming outages
- a PHQ-ready history of your work and the gaps between jobs

> Nuke30 is a personal planning aid, not an official access determination. Your licensee's access authorization program has final say.

## Privacy
- **100% on-device.** Data is stored in `localStorage` under `nuke30_data_v2`. There is no backend, no analytics and no network calls with your data.
- **No sensitive personal info.** The app never asks for SSNs, driver's license or badge numbers, badge photos or site security details.

## Features
| Tab | What it does |
|---|---|
| **Status** | One card for each site you picked. It shows **Active UA** while you're on site, or the days left in the 30-day window after you badge out, colored by urgency (green 0–15, amber 16–25, red 26–30, expired 31+). It also shows the date you must in-process by. The calendar reminder (`.ics`) has alarms on Day 20, 25, 28 and 29. |
| **Outages** | Refueling outages for the next 5 years, with start dates and lengths, for your sites or all sites. These are **projected** from NRC daily reactor power reports and each unit's measured refueling cycle. The list is refreshed weekly by `.github/workflows/outages.yml` (`scripts/scrape-outages.mjs` → `src/data/outages.json`). |
| **Settings** | Every operating US nuclear plant (`src/data/plants.json`). Tick the ones you work at. |

## Date rules
- All dates are calendar dates set to **local midnight**. Day counts use `differenceInCalendarDays`, so daylight-saving changes and time of day never cause off-by-one errors.
- The deactivation date is **Day 0**. **Day 30 is the last valid day.** Day 31 means continuous access has ended.

## Development
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest unit tests (src/utils/*.test.ts)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # production build (service worker registers in production only)
npm run icons      # re-render PNG/ICO icons from scripts/icon-source.png
```

## Structure
```
public/            generated PNG/ICO icons, manifest.json, sw.js
assets/            app-icon-1024.png (App Store size, not served)
scripts/           icon-source.png (master artwork) + generate-icons.mjs (sharp + png-to-ico)
src/types/         data model
src/data/          plants.json, outages.json (generated weekly)
src/utils/         dateLogic.ts, outageModel.mjs, icsGenerator.ts, storage.ts
src/hooks/         useAppData (localStorage state), useToday (midnight rollover)
src/components/    App shell, StatusView, OutagesView, SettingsView, ui primitives
```

## iOS app & TestFlight
The iOS app is a [Capacitor](https://capacitorjs.com) wrapper (`ios/`) around the static web build (`out/`). It works fully offline because everything ships inside the app.

`.github/workflows/ios.yml` builds it on GitHub's macOS runners, so no Mac is needed. It uses the same pipeline as GameDial:
- **Every push** that touches the app runs the web tests, lint and typecheck, plus an unsigned Simulator build.
- **Actions → iOS → Run workflow → `testflight: true`** archives the app, signs it with the App Store Connect API key, and uploads it to TestFlight. The build number is the workflow run number. The version comes from `package.json`.

One-time setup (in this repo's Settings → Secrets and variables → Actions):
- Variable `BUNDLE_ID_PREFIX`. The bundle id becomes `<prefix>.nuke30`.
- Secrets `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_KEY_P8`. The API key must have **Admin** access (App Manager keys fail with "Cloud signing permission error"). Paste the whole `.p8` file; `scripts/normalize-p8.sh` repairs pasting mistakes.
- In App Store Connect, create the **Nuke30** app record with that bundle id.

Local: `npm run ios:sync` rebuilds the web app and copies it into `ios/`. `npm run icons` regenerates every icon and the iOS launch screen.
