// One-time icon generator: renders public/icon.svg to all PWA / browser icon sizes.
// Usage: npm run icons
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const svg = await readFile(new URL("../public/icon.svg", import.meta.url), "utf8");

function render(size) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size }, background: "rgba(0,0,0,0)" });
  return resvg.render().asPng();
}

const targets = [
  ["public/icon-192x192.png", 192],
  ["public/icon-512x512.png", 512],
  ["public/apple-touch-icon.png", 180],
];
for (const [path, size] of targets) {
  await writeFile(new URL(`../${path}`, import.meta.url), render(size));
  console.log(`wrote ${path} (${size}x${size})`);
}

const ico = await pngToIco([render(16), render(32), render(48)]);
await writeFile(new URL("../public/favicon.ico", import.meta.url), ico);
console.log("wrote public/favicon.ico (16/32/48)");
