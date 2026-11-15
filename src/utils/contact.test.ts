import { describe, expect, it } from "vitest";
import { HELP_MAILTO, mailto, OUTAGE_UPDATE_MAILTO, SUPPORT_EMAIL } from "./contact";

describe("contact links", () => {
  it("build mailto links to the support address", () => {
    expect(SUPPORT_EMAIL).toBe("Nuke30app@outlook.com");
    expect(HELP_MAILTO).toBe("mailto:Nuke30app@outlook.com?subject=Nuke30%20help");
    expect(mailto("A & B", "line 1\nline 2")).toBe("mailto:Nuke30app@outlook.com?subject=A%20%26%20B&body=line%201%0Aline%202");
    expect(decodeURIComponent(OUTAGE_UPDATE_MAILTO)).toContain("Plant: \nUnit: \nOutage start date: ");
  });
});
