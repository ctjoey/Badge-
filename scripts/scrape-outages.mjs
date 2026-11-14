// Weekly job (.github/workflows/outages.yml): download NRC daily reactor power reports,
// detect each unit's refueling outages and project the next 5 years → src/data/outages.json.
// Usage: node scripts/scrape-outages.mjs [--from-dir <dir with .txt files>]
import { readFile, readdir, writeFile } from "node:fs/promises";
import { buildOutageData } from "../src/utils/outageModel.mjs";

const BASE = "https://www.nrc.gov/reading-rm/doc-collections/event-status/reactor-status";
const plants = JSON.parse(await readFile(new URL("../src/data/plants.json", import.meta.url), "utf8"));
const today = new Date().toISOString().slice(0, 10);
const year = Number(today.slice(0, 4));

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "nuke30-outage-projector" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  if (!text.includes("|")) throw new Error(`unexpected content from ${url}`);
  return text;
}

async function firstOk(urls) {
  for (const u of urls) {
    try {
      const t = await get(u);
      console.log(`ok   ${u} (${t.split("\n").length} lines)`);
      return t;
    } catch (e) {
      console.log(`miss ${e.message}`);
    }
  }
  return null;
}

let texts = [];
const fromDir = process.argv.indexOf("--from-dir");
if (fromDir > -1) {
  const dir = process.argv[fromDir + 1];
  for (const f of await readdir(dir)) if (f.endsWith(".txt")) texts.push(await readFile(`${dir}/${f}`, "utf8"));
} else {
  const recent = await firstOk([
    `${BASE}/powerreactorstatusforlast365days.txt`,
    `${BASE}/PowerReactorStatusForLast365Days.txt`,
  ]);
  if (!recent) throw new Error("Could not download the NRC 365-day report");
  texts.push(recent);
  // Older years give each unit at least two refuelings, so its cycle length can be measured.
  for (const y of [year - 1, year - 2, year - 3]) {
    const t = await firstOk([
      `${BASE}/${y}/${y}PowerStatus.txt`,
      `${BASE}/${y}/${y}powerstatus.txt`,
      `${BASE}/${y}/${y}Powerstatus.txt`,
    ]);
    if (t) texts.push(t);
  }
}

const data = buildOutageData(texts, plants, today);
const matched = new Set(data.units.map((u) => `${u.plantId}#${u.unit}`));
const missing = plants.flatMap((p) => p.units.filter((u) => !matched.has(`${p.id}#${u}`)).map((u) => `${p.name} ${u}`));
console.log(`units matched: ${data.units.length}, projected outages: ${data.outages.length}, latest report: ${data.latestReport}`);
if (data.unmatched.length) console.log(`::warning::NRC unit names not matched to a plant: ${data.unmatched.join(", ")}`);
if (missing.length) console.log(`::warning::plants with no NRC data: ${missing.join(", ")}`);
if (data.units.length < 50) throw new Error("Too few units parsed — refusing to overwrite outages.json");

await writeFile(new URL("../src/data/outages.json", import.meta.url), JSON.stringify(data, null, 1) + "\n");
console.log("wrote src/data/outages.json");
