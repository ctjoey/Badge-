import { describe, expect, it } from "vitest";
import { CAP, makeDomes, makeNoise, smoothstep, STEM } from "./cloudRender";

describe("cloud noise", () => {
  it("is deterministic per seed and stays in range", () => {
    const a = makeNoise(7);
    const b = makeNoise(7);
    const domes = makeDomes(7);
    for (let i = 0; i < 500; i++) {
      const x = i * 0.37 - 40;
      const y = i * 0.91 - 90;
      expect(a(x, y)).toBe(b(x, y));
      expect(a(x, y)).toBeGreaterThanOrEqual(0);
      expect(a(x, y)).toBeLessThanOrEqual(1);
      expect(domes(x, y)).toBeGreaterThanOrEqual(0);
      expect(domes(x, y)).toBeLessThanOrEqual(1);
    }
    expect(makeNoise(8)(1.5, 2.5)).not.toBe(a(1.5, 2.5));
  });
  it("smoothstep clamps and eases", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
  it("every puff fits inside its canvas box (with room for the warp)", () => {
    for (const spec of [CAP, STEM]) {
      for (const [x, y, rx, ry] of [...spec.smoke, ...spec.hot, ...spec.dark]) {
        expect(x - rx).toBeGreaterThanOrEqual(spec.box.x);
        expect(x + rx).toBeLessThanOrEqual(spec.box.x + spec.box.w);
        expect(y - ry).toBeGreaterThanOrEqual(spec.box.y);
        expect(y + ry).toBeLessThanOrEqual(spec.box.y + spec.box.h);
      }
    }
  });
});
