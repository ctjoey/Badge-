// Builds the App Store screenshot set in marketing/store-screenshots/ (1290×2796, Apple's 6.9" size).
//
//   npm run build && node marketing/store-art/make-screenshots.cjs
//
// It serves the static build from out/, opens the real app in headless Chromium at iPhone size
// (pretending to be the iPhone app so the alert screens look like they do on a phone), captures
// each screen with sample data, and frames it with a headline. Needs Playwright installed.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "out");
const SHOTS = path.join(ROOT, "marketing/store-screenshots");
const NATIVE_BRIDGE = path.join(ROOT, "node_modules/@capacitor/ios/Capacitor/Capacitor/assets/native-bridge.js");
const outages = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/outages.json"), "utf8"));
const ICON = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "public/icon-192x192.png")).toString("base64");

const PT_W = 393, PT_H = 852; // iPhone 15/16 points
const SAFE_TOP = 54;

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const fmt = (s) => new Date(`${s}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const nextOutage = (plantId) => outages.outages.find((o) => o.plantId === plantId && o.status === "projected" && o.start > iso(new Date()));

const base = { version: 2, selectedPlantIds: ["perry", "surry", "vogtle"], reminderDays: [10, 5, 3, 1], followed: [], userOutages: [],
  badges: { perry: { active: false, outDate: daysAgo(9) }, surry: { active: false, outDate: daysAgo(27) }, vogtle: { active: true, outDate: null } } };
const perryNext = nextOutage("perry"), vogtleNext = nextOutage("vogtle"), surryNext = nextOutage("surry");
const surryLastDay = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return iso(d); })();

const SCENES = [
  { file: "01-badge-clock", head: 'Know your <b>30&#8209;day</b><br>badge clock', sub: "Days left at every plant you work", data: base, go: async () => {} },
  { file: "02-alerts", head: 'Alerts <b>before</b><br>it expires', sub: "Pick your reminder days. Get the last-day warning.", data: base,
    banner: { title: "3 days left at Surry", body: `Your 30-day badge window at Surry closes after ${fmt(surryLastDay)}. In-process by then to keep your access.` },
    go: async (p) => { await p.getByRole("button", { name: "Settings", exact: true }).click(); await p.getByText("iPhone alerts").scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 150)); } },
  { file: "03-outages", head: 'Every outage,<br><b>5 years</b> out', sub: "Projected refueling outages for your sites", data: base,
    go: async (p) => { await p.getByRole("button", { name: "Outages", exact: true }).click(); } },
  { file: "04-follow-and-fix", head: 'Follow outages.<br><b>Fix the dates.</b>', sub: "Star the ones you care about. Add what you know.",
    data: { ...base,
      followed: [perryNext, vogtleNext, surryNext, ...["browns-ferry", "watts-bar", "catawba", "palo-verde", "st-lucie"].map(nextOutage)].filter(Boolean).map(({ plantId, unit, start }) => ({ plantId, unit, start })),
      userOutages: perryNext ? [{ id: "u-demo", plantId: "perry", unit: perryNext.unit, start: iso(new Date(new Date(`${perryNext.start}T12:00:00`).getTime() - 9 * 864e5)), days: 38, replaces: { plantId: "perry", unit: perryNext.unit, start: perryNext.start } }] : [] },
    go: async (p) => { await p.getByRole("button", { name: "Outages", exact: true }).click(); await p.getByRole("tab", { name: /Following/ }).click(); } },
  { file: "05-pick-your-plants", head: 'All <b>55</b> U.S.<br>nuclear plants', sub: "Pick your sites in seconds", data: base,
    go: async (p) => { await p.getByRole("button", { name: "Settings", exact: true }).click(); const dd = p.getByRole("button", { name: /plants selected/ }); await dd.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 215)); await dd.click(); await p.getByRole("option", { name: /Palo Verde/ }).evaluate((el) => el.scrollIntoView({ block: "start" })); } },
  { file: "06-expired", head: 'Let it expire and…<br><b>boom</b>', sub: "A little fun when the clock runs out",
    data: { ...base, selectedPlantIds: ["perry"], badges: { perry: { active: false, outDate: daysAgo(31) } } }, wait: 5200, go: async () => {} },
];

// Pretend to be the iPhone app (Capacitor native bridge with notifications allowed).
const fakeIphone = () => {
  const m = ["schedule", "getPending", "cancel", "checkPermissions", "requestPermissions"].map((name) => ({ name, rtype: "promise" }));
  m.push({ name: "addListener", rtype: "callback" });
  window.Capacitor = { PluginHeaders: [{ name: "LocalNotifications", methods: m }, { name: "Share", methods: [{ name: "share", rtype: "promise" }] }] };
  window.__pending = [];
  window.webkit = { messageHandlers: { bridge: { postMessage(msg) {
    const o = msg.options || {}; let data = {};
    if (msg.methodName === "addListener") return;
    if (/Permissions/.test(msg.methodName)) data = { display: "granted" };
    if (msg.methodName === "getPending") data = { notifications: window.__pending };
    if (msg.methodName === "cancel") window.__pending = [];
    if (msg.methodName === "schedule") { window.__pending = o.notifications; data = { notifications: [] }; }
    setTimeout(() => window.Capacitor.fromNative({ callbackId: msg.callbackId, pluginId: msg.pluginId, methodName: msg.methodName, success: true, data }), 5);
  } } } };
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ico": "image/x-icon", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(OUT_DIR, p);
  if (!file.startsWith(OUT_DIR) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const W = 1290, H = 2796, PHONE_W = 968, BEZEL = 18;
const K = (PHONE_W - 2 * BEZEL) / PT_W; // compose px per iPhone point
function frame(scene, screenDataUrl) {
  const banner = scene.banner ? `
    <div class="banner"><img src="${ICON}"><div><div class="bt"><span>${scene.banner.title}</span><i>now</i></div><div class="bb">${scene.banner.body}</div></div></div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;background:#000;overflow:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#fff;position:relative}
  .glow{position:absolute;inset:0;background:radial-gradient(900px 700px at 50% 30%,rgba(251,3,165,.34),transparent 70%),radial-gradient(900px 600px at 50% 100%,rgba(253,224,71,.14),transparent 70%)}
  .stripe{position:absolute;left:0;right:0;height:44px;background:repeating-linear-gradient(-45deg,#fde047 0 30px,#000 30px 60px)}
  .head{position:absolute;top:150px;left:70px;right:70px;text-align:center}
  h1{white-space:nowrap;font-size:104px;line-height:1.02;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-2px;
     background:linear-gradient(180deg,#fff 0%,#d4d4d8 55%,#a1a1aa 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
  h1 b{color:#fb03a5;-webkit-text-fill-color:#fb03a5;text-shadow:0 0 34px rgba(251,3,165,.6)}
  .sub{margin-top:30px;font-size:50px;font-weight:600;color:#e4e4e7}
  .phone{position:absolute;top:606px;left:${(W - PHONE_W) / 2}px;width:${PHONE_W}px;border:${BEZEL}px solid #1b1b1f;border-radius:${Math.round(58 * K)}px;overflow:hidden;background:#000;
     box-shadow:0 0 0 3px #3f3f46,0 0 120px rgba(251,3,165,.45),0 40px 120px rgba(0,0,0,.8)}
  .phone img.screen{display:block;width:100%}
  .sb{position:absolute;top:0;left:0;right:0;height:${SAFE_TOP * K}px;font-weight:700;font-size:${17 * K}px}
  .sb .time{position:absolute;left:${52 * K}px;top:${17 * K}px}
  .sb .island{position:absolute;left:50%;top:${11 * K}px;width:${124 * K}px;height:${36 * K}px;margin-left:${-62 * K}px;border-radius:${18 * K}px;background:#000;border:2px solid #18181b}
  .sb svg{position:absolute;right:${30 * K}px;top:${19 * K}px;height:${13 * K}px}
  .banner{position:absolute;top:${(SAFE_TOP + 6) * K}px;left:${9 * K}px;right:${9 * K}px;display:flex;gap:${11 * K}px;align-items:center;padding:${13 * K}px ${14 * K}px;border-radius:${24 * K}px;
     background:rgba(44,44,48,.97);box-shadow:0 20px 60px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08)}
  .banner img{width:${40 * K}px;height:${40 * K}px;border-radius:${9 * K}px;flex:none}
  .bt{display:flex;justify-content:space-between;font-size:${15.5 * K}px;font-weight:700}
  .bt i{font-style:normal;font-weight:400;color:#a1a1aa;font-size:${13 * K}px}
  .bb{font-size:${14.5 * K}px;line-height:1.3;color:#e4e4e7;margin-top:${2 * K}px}
  </style></head><body>
  <div class="glow"></div><div class="stripe" style="top:0"></div><div class="stripe" style="bottom:0"></div>
  <div class="head"><h1>${scene.head}</h1><div class="sub">${scene.sub}</div></div>
  <div class="phone"><img class="screen" src="${screenDataUrl}">
    <div class="sb"><span class="time">9:41</span><div class="island"></div>
      <svg viewBox="0 0 78 13" fill="#fff"><rect x="0" y="8" width="3.4" height="5" rx="1"/><rect x="5" y="5.5" width="3.4" height="7.5" rx="1"/><rect x="10" y="3" width="3.4" height="10" rx="1"/><rect x="15" y="0" width="3.4" height="13" rx="1"/>
        <path d="M33 2.2c2.7 0 5.2 1 7 2.8l-1.3 1.4A8 8 0 0 0 33 4.100a8 8 0 0 0-5.700 2.300L26 5a10 10 0 0 1 7-2.800zm0 3.800c1.600 0 3.100.6 4.200 1.700L35.900 9A4 4 0 0 0 33 7.900 4 4 0 0 0 30.100 9l-1.300-1.300A6 6 0 0 1 33 6zm0 3.700 1.900 1.900L33 13.500l-1.900-1.900L33 9.700z"/>
        <rect x="48" y="0.700" width="25" height="11.600" rx="3.600" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.200"/><rect x="50" y="2.600" width="21" height="7.800" rx="2"/><rect x="74.500" y="4.300" width="1.800" height="4.400" rx=".9" fill-opacity=".5"/></svg>
    </div>${banner}
  </div></body></html>`;
}

(async () => {
  if (!fs.existsSync(path.join(OUT_DIR, "index.html"))) throw new Error("Run `npm run build` first (out/ is missing).");
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: PT_W, height: PT_H }, deviceScaleFactor: 3, colorScheme: "dark" });
  await ctx.addInitScript(fakeIphone);
  await ctx.addInitScript({ path: NATIVE_BRIDGE });
  const page = await ctx.newPage();
  const composer = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  fs.mkdirSync(SHOTS, { recursive: true });

  for (const scene of SCENES) {
    await page.goto(url);
    await page.evaluate((d) => { localStorage.setItem("nuke30_data_v2", JSON.stringify(d)); localStorage.removeItem("nuke30_theme"); }, scene.data);
    await page.reload();
    // room for the iPhone status bar (the real app gets this from the phone's safe area)
    await page.addStyleTag({ content: `header{padding-top:${SAFE_TOP}px!important} .nuke-root{cursor:default}` });
    await page.waitForTimeout(900);
    await scene.go(page);
    await page.waitForTimeout(scene.wait ?? 500);
    const shot = await page.screenshot({ type: "png" });
    await composer.setContent(frame(scene, "data:image/png;base64," + shot.toString("base64")), { waitUntil: "load" });
    await composer.waitForTimeout(150);
    const framed = await composer.screenshot({ type: "png" });
    // App Store Connect rejects screenshots with an alpha channel
    const file = path.join(SHOTS, `${scene.file}.png`);
    await sharp(framed).flatten({ background: "#000" }).removeAlpha().png({ compressionLevel: 9 }).toFile(file);
    const meta = await sharp(file).metadata();
    console.log(`${scene.file}.png  ${meta.width}x${meta.height}  channels=${meta.channels}`);
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
