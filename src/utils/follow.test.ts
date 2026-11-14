import { describe, expect, it } from "vitest";
import { isFollowed, toggleFollow } from "./follow";

describe("following outages", () => {
  const o = { plantId: "perry", unit: 1, start: "2027-03-17" };
  it("toggles on and off", () => {
    const on = toggleFollow(o, []);
    expect(on).toEqual([o]);
    expect(isFollowed(o, on)).toBe(true);
    expect(toggleFollow(o, on)).toEqual([]);
  });
  it("still matches after the weekly refresh nudges the date", () => {
    const followed = [o];
    expect(isFollowed({ ...o, start: "2027-04-20" }, followed)).toBe(true);
    expect(isFollowed({ ...o, start: "2029-03-17" }, followed)).toBe(false);
    expect(isFollowed({ ...o, unit: 2 }, followed)).toBe(false);
  });
});
