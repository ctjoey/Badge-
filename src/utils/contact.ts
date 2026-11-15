/** Public contact address for help and outage-date updates. */
export const SUPPORT_EMAIL = "Nuke30app@outlook.com";

export function mailto(subject: string, body = ""): string {
  const q = [`subject=${encodeURIComponent(subject)}`, body ? `body=${encodeURIComponent(body)}` : ""].filter(Boolean);
  return `mailto:${SUPPORT_EMAIL}?${q.join("&")}`;
}

export const HELP_MAILTO = mailto("Nuke30 help");

export const OUTAGE_UPDATE_MAILTO = mailto(
  "Nuke30 outage update",
  ["Plant: ", "Unit: ", "Outage start date: ", "Length (days): ", "How you know (call-out, site notice, etc.): "].join("\n"),
);
