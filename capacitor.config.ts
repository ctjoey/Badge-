import type { CapacitorConfig } from "@capacitor/cli";

// The bundle id prefix is swapped in CI from the BUNDLE_ID_PREFIX repo variable (same as GameDial).
const config: CapacitorConfig = {
  appId: "com.yourcompany.nuke30",
  appName: "Nuke30",
  webDir: "out",
  backgroundColor: "#000000",
  ios: {
    contentInset: "never",
    backgroundColor: "#000000",
    scheme: "Nuke30",
  },
};

export default config;
