import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Apple's limits are hard: App Store Connect refuses anything longer.
const doc = readFileSync(new URL("../../marketing/app-store-copy.md", import.meta.url), "utf8");
const fields = [...doc.matchAll(/^## (.+?) \((\d+)\)\n\n```\n([\s\S]*?)\n```/gm)].map((m) => ({
  name: m[1],
  limit: Number(m[2]),
  text: m[3],
}));

describe("App Store copy", () => {
  it("has every field", () => {
    expect(fields.map((f) => f.name)).toEqual([
      "Name",
      "Subtitle",
      "Promotional text",
      "Keywords",
      "Description",
      "App Review notes",
    ]);
  });
  it.each(fields)("$name fits Apple's $limit-character limit", ({ text, limit }) => {
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThanOrEqual(limit);
  });
  it("keywords don't repeat words Apple already indexes from the name and subtitle", () => {
    const text = (n: string) => fields.find((f) => f.name === n)!.text.toLowerCase();
    const indexed = new Set(`${text("Name")} ${text("Subtitle")}`.split(/[^a-z0-9]+/).filter(Boolean));
    const keywords = text("Keywords").split(",");
    expect(keywords.every((k) => k === k.trim() && k.length > 0)).toBe(true);
    expect(keywords.filter((k) => indexed.has(k))).toEqual([]);
    expect(new Set(keywords).size).toBe(keywords.length);
  });
});
