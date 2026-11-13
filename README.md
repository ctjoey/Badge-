# Nuke30 — Nuclear UA & Outage Tracker

Nuke30 is a local-first, offline-capable PWA for nuclear outage workers, traveling contractors and plant staff. It tracks:

- your unescorted access (UA) status
- the **30-day continuous access window** (NRC 10 CFR § 73.56)
- past, active and upcoming outages
- a PHQ-ready history of your work and the gaps between jobs

> Nuke30 is a personal planning aid, not an official access determination. Your licensee's access authorization program has final say.

## Privacy
- **100% on-device.** Data is stored in `localStorage` under `nuke30_data_v1`. There is no backend, no analytics and no network calls with your data.
- **No sensitive personal info.** The app never asks for SSNs, driver's license or badge numbers, badge photos or site security details.
- **You hold the backup.** Use Data → Export/Import Backup (`nuke30-backup-YYYY-MM-DD.json`) to move data between devices. Imports are validated, and unknown fields are dropped.

## Features
| View | What it does |
|---|---|
| **Status** | Toggle between Active UA and the Gap Clock. Shows a 30-day countdown with color urgency (green 0–15, amber 16–25, red 26–30, terminated 31+), the exact Day-30 deadline, a preview of the next outage with a bridge/exceed projection, 365-day and 5-year/3-year screening timers, and an `.ics` export (`nuke30-reminders.ics`) with alarms on Day 20, 25, 28 and 29. |
| **Outages** | Add, edit and delete outages (Upcoming / Active / Completed), with utility presets plus a custom name. Each outage shows its duration, and the gap between outages is shown with 30-day warnings and overlap detection. Active outages have a one-click **Mark Outage Complete**. |
| **PHQ** | A chronological history of completed and active outages and the gaps between them. Gaps over 30 days are flagged. Copy it as text or download `nuke30-phq-history.csv`. Upcoming outages are left out. |
| **Data** | Backup/restore, **Load Demo Outage Data** and **Clear All Data**. |

Training & qualification tracking is planned for v2. It shows as a disabled tab.

## Date rules
- All dates are calendar dates set to **local midnight**. Day counts use `differenceInCalendarDays`, so daylight-saving changes and time of day never cause off-by-one errors.
- The deactivation date is **Day 0**. **Day 30 is the last valid day.** Day 31 means continuous access has ended.
- "Gap" between outages is the number of days since deactivation on the next in-processing date. This is the same number the 30-day rule uses.

## Development
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest unit tests (src/utils/*.test.ts)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # production build (service worker registers in production only)
npm run icons      # re-render PNG/ICO icons from public/icon.svg
```

## Structure
```
public/            icon.svg (master) + generated PNG/ICO icons, manifest.json, sw.js
scripts/           generate-icons.mjs (@resvg/resvg-js + png-to-ico)
src/types/         data model
src/utils/         dateLogic.ts, icsGenerator.ts, phq.ts, storage.ts, uaState.ts, demoData.ts
src/hooks/         useAppData (localStorage state), useToday (midnight rollover)
src/components/    App shell, dashboard/, outages/, phq/, data/, ui primitives
```
