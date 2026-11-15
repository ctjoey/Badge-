# Nuke30 — App Store submission checklist

Everything to paste is in [`app-store-copy.md`](app-store-copy.md). The six screenshots are in
[`store-screenshots/`](store-screenshots/). All steps are at **appstoreconnect.apple.com → Apps → Nuke30**.

## Before you start

- [ ] The privacy and support pages are live on the web (Apple checks both links).
      Turn on GitHub Pages once: github.com/ctjoey/Badge- → **Settings** → **Pages** →
      Source **Deploy from a branch** → Branch `claude/nuke30-outage-tracker-9b6wbp`, folder **/docs** → **Save**.
      After a minute or two both links below should open:
  - Support: https://ctjoey.github.io/Badge-/
  - Privacy: https://ctjoey.github.io/Badge-/privacy.html
- [ ] The newest build has finished processing in TestFlight.

## 1. App Information (left menu, under General)

- [ ] **Name:** paste from "Name"
- [ ] **Subtitle:** paste from "Subtitle"
- [ ] **Category:** Primary **Productivity**, Secondary **Business**
- [ ] **Content Rights:** choose "No, it does not contain, show, or access third-party content"
- [ ] **Age Rating:** click Edit, answer **None / No** to every question. Result: **4+**
- [ ] Click **Save**

## 2. Pricing and Availability (left menu)

- [ ] **Price:** Free ($0.00)
- [ ] **Availability:** all countries (or United States only, your choice)

## 3. App Privacy (left menu)

- [ ] **Privacy Policy URL:** `https://ctjoey.github.io/Badge-/privacy.html`
- [ ] Click **Get Started** → choose **"No, we do not collect data from this app"** → **Save** → **Publish**

## 4. The version page (left menu: "1.0 Prepare for Submission")

- [ ] **Screenshots:** under "iPhone 6.9-inch Display", drag in the six PNG files, in number order
- [ ] **Promotional Text**, **Description**, **Keywords:** paste each from the copy file
- [ ] **Support URL:** `https://ctjoey.github.io/Badge-/`
- [ ] **Version:** change to **1.1.0** (it must match the build)
- [ ] **Copyright:** `2026` followed by your name or company
- [ ] **Build:** click **+** (or "Add Build") and pick the newest one
- [ ] **App Review Information:**
  - untick **Sign-in required**
  - fill in your contact name and phone
  - **Email:** `Nuke30app@outlook.com`
  - **Notes:** paste from "App Review notes"
- [ ] **Version Release:** "Automatically release this version"
- [ ] Click **Save**

## 5. Submit

- [ ] Click **Add for Review**, then **Submit to App Review**
- Apple usually answers in 1–3 days. If they reject it, send the message to Claude.

## Regenerating screenshots

```bash
npm run screenshots   # builds the app, then writes marketing/store-screenshots/*.png (1290×2796)
```
