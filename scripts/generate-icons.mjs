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

// iOS (Capacitor) app icon: single opaque 1024px image.
const IOS_ASSETS = "ios/App/App/Assets.xcassets";
await png(1024).toFile(out(`${IOS_ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`));
console.log("wrote iOS AppIcon");

// iOS launch screen: icon centered on black, 2732x2732 (Capacitor's Splash.imageset).
const splashMark = await png(900).toBuffer();
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await sharp({ create: { width: 2732, height: 2732, channels: 3, background: "#000000" } })
    .composite([{ input: splashMark, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out(`${IOS_ASSETS}/Splash.imageset/${name}`));
}
console.log("wrote iOS splash images");

const ico = await pngToIco(await Promise.all([16, 32, 48].map((s) => png(s).toBuffer())));
await writeFile(out("public/favicon.ico"), ico);
console.log("wrote public/favicon.ico");
