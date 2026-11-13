import type { Urgency } from "@/types";

export interface UrgencyStyle {
  label: string;
  /** Card ring / border + background */
  panel: string;
  /** Big number color */
  text: string;
  /** Progress bar fill */
  bar: string;
  pill: string;
}

export const URGENCY_STYLES: Record<Urgency, UrgencyStyle> = {
  active: {
    label: "Active UA",
    panel: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  green: {
    label: "In Window",
    panel: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  amber: {
    label: "Caution",
    panel: "border-amber-500/50 bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  },
  red: {
    label: "Critical",
    panel: "border-red-500/60 bg-red-50 dark:bg-red-950/50",
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    pill: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  },
  expired: {
    label: "Terminated",
    panel: "border-zinc-400/60 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/60",
    text: "text-zinc-600 dark:text-zinc-300",
    bar: "bg-zinc-500",
    pill: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  },
  unknown: {
    label: "No Data",
    panel: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
    text: "text-zinc-500",
    bar: "bg-zinc-400",
    pill: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};
