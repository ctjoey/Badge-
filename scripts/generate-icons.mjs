// Icon generator: renders scripts/icon-source.png (1254x1254 master artwork)
// to all PWA / iOS / browser icon sizes. Usage: npm run icons
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const SRC = new URL("./icon-source.png", import.meta.url).pathname;
const out = (p) => new URL(`../${p}`, import.meta.url).pathname;

const png = (size) =>
  sharp(SRC).resize(size, size, { kernel: "lanczos3" }).flatten({ background: "#000000" }).png({ compressionLevel: 9 });

for (const [path, size] of [
  ["public/icon-192x192.png", 192],
  ["public/icon-512x512.png", 512],
  ["assets/app-icon-1024.png", 1024], // App Store / native wrapper master (not served)
  ["public/apple-touch-icon.png", 180],
  ["public/logo-96.png", 96], // header mark
]) {
  await png(size).toFile(out(path));
  console.log(`wrote ${path}`);
}

// Maskable: artwork scaled to the 80% safe zone on a black field.
const inner = await png(410).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 3, background: "#000000" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(out("public/icon-maskable-512x512.png"));
console.log("wrote public/icon-maskable-512x512.png");

const ico = await pngToIco(await Promise.all([16, 32, 48].map((s) => png(s).toBuffer())));
await writeFile(out("public/favicon.ico"), ico);
console.log("wrote public/favicon.ico");
