import { describe, expect, it } from "vitest";
import { APP_LINK, appInviteText } from "./share";

describe("share text", () => {
  it("invites with the App Store link", () => {
    expect(APP_LINK).toMatch(/^https:\/\/apps\.apple\.com\/.+\/id\d+$/);
    expect(appInviteText()).toContain("Nuke30");
    expect(appInviteText()).toContain(`Get it here: ${APP_LINK}`);
  });
});
