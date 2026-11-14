import type { OutageData, Plant } from "@/types";
import outagesJson from "./outages.json";
import plantsJson from "./plants.json";

export const PLANTS = plantsJson as Plant[];
export const PLANTS_BY_ID = new Map(PLANTS.map((p) => [p.id, p]));
/** Refreshed weekly by .github/workflows/outages.yml from NRC reports. */
export const OUTAGE_DATA = outagesJson as OutageData;
