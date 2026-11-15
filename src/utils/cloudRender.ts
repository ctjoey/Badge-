/**
 * Paints the mushroom cloud into a <canvas> at the screen's real pixel density.
 *
 * iOS draws SVG filters (feTurbulence / feDisplacementMap) at low resolution and stretches
 * them, which made the filtered cloud blurry on iPhones. This does the same job by hand:
 * a density field of overlapping puffs is warped with fractal noise, then shaded per pixel
 * with a crisp edge, so the result is sharp on any screen.
 *
 * All geometry is in the blast's 400×700 scene units; `ppu` is device pixels per scene unit.
 */

/** [cx, cy, rx, ry] in scene units. */
export type Puff = [number, number, number, number];

export interface CloudSpec {
  /** Area of the scene this canvas covers. */
  box: { x: number; y: number; w: number; h: number };
  /** Smoke body. */
  smoke: Puff[];
  /** Glowing core. */
  hot: Puff[];
  /** Dark, shadowed smoke (also adds to the body). */
  dark: Puff[];
  /** How far the noise pushes the outline around, in scene units. */
  warp: number;
  /** Strength of each smoke puff (0–1). */
  density: number;
  /** Strength of each core puff (0–1). */
  heat: number;
  /** How much brighter the top is than the bottom (0 = even). */
  topLight: number;
  seed: number;
}

const circle = ([x, y, r]: [number, number, number]): Puff => [x, y, r, r];

export const CAP: CloudSpec = {
  box: { x: 16, y: 136, w: 368, h: 226 },
  smoke: (
    [
      [92, 273, 34], [129, 284, 36], [171, 290, 38], [229, 290, 38], [271, 284, 36], [308, 273, 34],
      [76, 253, 32], [324, 253, 32], [100, 232, 36], [300, 232, 36], [134, 215, 38], [266, 215, 38],
      [174, 204, 40], [226, 204, 40], [200, 198, 38], [116, 260, 40], [284, 260, 40], [200, 282, 40],
      [62, 262, 28], [338, 262, 28], [74, 236, 26], [326, 236, 26], [96, 214, 28], [304, 214, 28],
    ] as [number, number, number][]
  ).map(circle),
  hot: (
    [
      [162, 243, 40], [238, 243, 40], [200, 229, 44], [200, 256, 42],
      [138, 250, 30], [262, 250, 30], [182, 217, 30], [220, 217, 30],
    ] as [number, number, number][]
  ).map(circle),
  dark: ([[113, 296, 33], [164, 305, 35], [236, 305, 35], [287, 296, 33], [200, 308, 33]] as [number, number, number][]).map(circle),
  warp: 7,
  density: 1,
  heat: 0.62,
  topLight: 0.5,
  seed: 7,
};

export const STEM: CloudSpec = {
  box: { x: 126, y: 276, w: 148, h: 304 },
  smoke: (
    [
      [550, 50, 26], [530, 40, 30], [508, 33, 32], [486, 30, 32], [464, 28, 32], [442, 27, 32],
      [420, 27, 32], [398, 28, 32], [376, 30, 32], [354, 33, 32], [332, 40, 30], [312, 50, 26],
    ] as [number, number, number][]
  ).map(([y, rx, ry]): Puff => [200, y, rx, ry]),
  hot: [[200, 430, 13, 120]],
  dark: [],
  warp: 4,
  density: 1,
  heat: 0.75,
  topLight: 0,
  seed: 4,
};

/** Seeded, tileable value noise in [0, 1]. */
export function makeNoise(seed: number): (x: number, y: number) => number {
  const table = new Float32Array(65536);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < table.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    table[i] = s / 4294967296;
  }
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const x0 = xi & 255;
    const x1 = (xi + 1) & 255;
    const y0 = (yi & 255) << 8;
    const y1 = ((yi + 1) & 255) << 8;
    const a = table[y0 | x0];
    const b = table[y0 | x1];
    const c = table[y1 | x0];
    const d = table[y1 | x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/**
 * Seeded cellular noise shaped into domes: 1 at the middle of each cell's lump, falling to 0 in
 * the creases between lumps. This is what gives the cloud its rounded "cauliflower" puffs.
 */
export function makeDomes(seed: number): (x: number, y: number) => number {
  const jx = new Float32Array(65536);
  const jy = new Float32Array(65536);
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = 0; i < 65536; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    jx[i] = s / 4294967296;
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    jy[i] = s / 4294967296;
  }
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let best = 9;
    for (let j = yi - 1; j <= yi + 1; j++) {
      const row = (j & 255) << 8;
      for (let i = xi - 1; i <= xi + 1; i++) {
        const k = row | (i & 255);
        const ddx = i + jx[k] - x;
        const ddy = j + jy[k] - y;
        const dist = ddx * ddx + ddy * ddy;
        if (dist < best) best = dist;
      }
    }
    // best = squared distance to the nearest lump centre; ~0.9 cells is the far edge of a lump
    const t = best / 0.81;
    return t >= 1 ? 0 : Math.sqrt(1 - t);
  };
}

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
};

// Palette (r, g, b)
const RIM = [74, 24, 8];
const OUTER = [172, 66, 18];
const BODY = [228, 104, 26];
const GLOW = [255, 190, 70];
const CORE = [255, 246, 208];
const EDGE_AT = 0.2; // density where the cloud's outline sits
const EDGE_WIDTH = 0.03; // small = crisp outline
const LUMP_EDGE = 0.5; // how much the lumps scallop the outline

/** Paint `spec` into `canvas`. Returns false if the browser can't provide a 2D canvas. */
export function renderCloud(canvas: HTMLCanvasElement, spec: CloudSpec, ppu: number): boolean {
  const { box } = spec;
  const W = Math.max(1, Math.round(box.w * ppu));
  const H = Math.max(1, Math.round(box.h * ppu));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  // 1. Density field at half resolution (it is smooth, so this loses nothing):
  //    red = smoke, green = heat, blue = shadow.
  const FW = Math.ceil(W / 2) + 1;
  const FH = Math.ceil(H / 2) + 1;
  const fieldCanvas = document.createElement("canvas");
  fieldCanvas.width = FW;
  fieldCanvas.height = FH;
  const f = fieldCanvas.getContext("2d", { willReadFrequently: true });
  if (!f) return false;
  f.fillStyle = "#000";
  f.fillRect(0, 0, FW, FH);
  f.globalCompositeOperation = "lighter";
  const fs = ppu / 2;
  const blob = (p: Puff, rgb: string, strength: number) => {
    const [cx, cy, rx, ry] = p;
    f.save();
    f.translate((cx - box.x) * fs, (cy - box.y) * fs);
    f.scale(rx * fs, ry * fs);
    const g = f.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(${rgb},${strength})`);
    g.addColorStop(0.55, `rgba(${rgb},${strength * 0.6})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    f.fillStyle = g;
    f.beginPath();
    f.arc(0, 0, 1, 0, Math.PI * 2);
    f.fill();
    f.restore();
  };
  for (const p of spec.smoke) blob(p, "255,0,0", spec.density);
  for (const p of spec.dark) {
    blob(p, "255,0,0", spec.density);
    blob(p, "0,0,255", 0.6);
  }
  for (const p of spec.hot) {
    blob(p, "255,0,0", spec.density);
    blob(p, "0,255,0", spec.heat);
  }
  const field = f.getImageData(0, 0, FW, FH).data;

  const noise = makeNoise(spec.seed);

  // 2. Warp vectors on a coarse grid (they vary slowly), in device pixels.
  const STEP = 4;
  const GW = Math.ceil(W / STEP) + 2;
  const GH = Math.ceil(H / STEP) + 2;
  const gdx = new Float32Array(GW * GH);
  const gdy = new Float32Array(GW * GH);
  const warpPx = spec.warp * ppu;
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const ux = box.x + (gx * STEP) / ppu;
      const uy = box.y + (gy * STEP) / ppu;
      let nx = 0;
      let ny = 0;
      let amp = 1;
      let freq = 0.028;
      let norm = 0;
      for (let o = 0; o < 4; o++) {
        nx += amp * (noise(ux * freq + 31.7, uy * freq + 11.3) - 0.5);
        ny += amp * (noise(ux * freq + 71.1, uy * freq + 53.9) - 0.5);
        norm += amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      gdx[gy * GW + gx] = (nx / norm) * 2.6 * warpPx;
      gdy[gy * GW + gx] = (ny / norm) * 2.6 * warpPx;
    }
  }

  // 3. Lump texture at full resolution: big rounded puffs with smaller ones on top.
  const domes = makeDomes(spec.seed);
  const billow = new Float32Array(W * H);
  const inv = 1 / ppu;
  for (let y = 0; y < H; y++) {
    const uy = box.y + y * inv;
    for (let x = 0; x < W; x++) {
      const ux = box.x + x * inv;
      const big = domes(ux / 40, uy / 40);
      const mid = domes(ux / 18 + 40.5, uy / 18 + 12.25);
      const small = domes(ux / 8 + 7.75, uy / 8 + 91.5);
      billow[y * W + x] = big * 0.52 + mid * 0.33 + small * 0.15;
    }
  }

  // 4. Shade every pixel.
  const out = ctx.createImageData(W, H);
  const px = out.data;
  const light = Math.max(1, Math.round(1.8 * ppu)); // emboss offset: lit from the upper left
  const FWm = FW - 1;
  const FHm = FH - 1;
  for (let y = 0; y < H; y++) {
    const gyf = y / STEP;
    const gy0 = Math.floor(gyf);
    const ty = gyf - gy0;
    for (let x = 0; x < W; x++) {
      const gxf = x / STEP;
      const gx0 = Math.floor(gxf);
      const tx = gxf - gx0;
      const i00 = gy0 * GW + gx0;
      const i10 = i00 + GW;
      const dx = (gdx[i00] * (1 - tx) + gdx[i00 + 1] * tx) * (1 - ty) + (gdx[i10] * (1 - tx) + gdx[i10 + 1] * tx) * ty;
      const dy = (gdy[i00] * (1 - tx) + gdy[i00 + 1] * tx) * (1 - ty) + (gdy[i10] * (1 - tx) + gdy[i10 + 1] * tx) * ty;
      const sx = x + dx;
      const sy = y + dy;

      // bilinear sample of the density field
      let fx = sx * 0.5;
      let fy = sy * 0.5;
      if (fx < 0 || fy < 0 || fx >= FWm || fy >= FHm) continue;
      const fx0 = fx | 0;
      const fy0 = fy | 0;
      fx -= fx0;
      fy -= fy0;
      const k = (fy0 * FW + fx0) * 4;
      const k2 = k + FW * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const raw = (field[k] * w00 + field[k + 4] * w10 + field[k2] * w01 + field[k2 + 4] * w11) / 255;
      if (raw <= 0.02) continue;

      // lumps follow the warp, so they move with the outline
      const bx = sx < 0 ? 0 : sx >= W ? W - 1 : sx | 0;
      const by = sy < 0 ? 0 : sy >= H ? H - 1 : sy | 0;
      const bil = billow[by * W + bx];
      // each lump pushes the outline out a little, the creases pull it in: a scalloped edge
      const d = raw + LUMP_EDGE * (bil - 0.45) * (1 - raw);
      if (d <= EDGE_AT) continue;
      const h = (field[k + 1] * w00 + field[k + 5] * w10 + field[k2 + 1] * w01 + field[k2 + 5] * w11) / 255;
      const u = (field[k + 2] * w00 + field[k + 6] * w10 + field[k2 + 2] * w01 + field[k2 + 6] * w11) / 255;

      const lx = bx - light < 0 ? 0 : bx - light;
      const ly = by - light < 0 ? 0 : by - light;
      const relief = bil - billow[ly * W + lx];

      const depth = (d - EDGE_AT) / (1 - EDGE_AT);
      const body = smoothstep(0, 0.55, depth);
      let shade = 0.34 + 0.8 * bil + 1.7 * relief;
      shade = shade < 0.22 ? 0.22 : shade > 1.5 ? 1.5 : shade;
      // lit from above: the top of the cloud is brighter than its underside
      shade *= (1 - 0.6 * u) * (1 + spec.topLight * (0.5 - y / H));
      // smoke is a darker burnt orange away from the core, brighter near it
      const warm = smoothstep(0, 0.7, h);
      const cr = OUTER[0] + (BODY[0] - OUTER[0]) * warm;
      const cg = OUTER[1] + (BODY[1] - OUTER[1]) * warm;
      const cb = OUTER[2] + (BODY[2] - OUTER[2]) * warm;
      let r = (RIM[0] + (cr - RIM[0]) * body) * shade;
      let g = (RIM[1] + (cg - RIM[1]) * body) * shade;
      let b = (RIM[2] + (cb - RIM[2]) * body) * shade;
      if (shade > 1) {
        // highlights lean toward yellow instead of just a brighter orange
        const hi = (shade - 1) * body;
        r += (GLOW[0] - r) * hi;
        g += (GLOW[1] - g) * hi;
        b += (GLOW[2] - b) * hi;
      }

      // the glowing heart: lump tops glow yellow, fire shows white-hot through the creases
      const hot = h * (1 - 0.5 * u);
      const lit = 0.78 + 0.3 * bil + 1.2 * relief;
      const glow = smoothstep(0.22, 0.7, hot * (1.3 - 0.6 * bil));
      r += (GLOW[0] * lit - r) * glow;
      g += (GLOW[1] * lit - g) * glow;
      b += (GLOW[2] * lit - b) * glow;
      const core = smoothstep(0.6, 1, hot * (1.4 - 0.75 * bil));
      r += (CORE[0] - r) * core;
      g += (CORE[1] - g) * core;
      b += (CORE[2] - b) * core;

      const o = (y * W + x) * 4;
      px[o] = r > 255 ? 255 : r;
      px[o + 1] = g > 255 ? 255 : g;
      px[o + 2] = b > 255 ? 255 : b;
      px[o + 3] = 255 * smoothstep(EDGE_AT, EDGE_AT + EDGE_WIDTH, d);
    }
  }
  ctx.putImageData(out, 0, 0);
  return true;
}
