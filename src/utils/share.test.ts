import { describe, expect, it } from "vitest";
import { appInviteText } from "./share";

describe("share text", () => {
  it("invites without a link until one is set", () => {
    expect(appInviteText()).toContain("Nuke30");
    expect(appInviteText()).not.toContain("http");
  });
});
