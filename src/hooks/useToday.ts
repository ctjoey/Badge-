"use client";
import { useEffect, useState } from "react";
import { todayISO } from "@/utils/dateLogic";

/** Current local calendar date; refreshes on focus and every minute (midnight rollover). */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const tick = () => setToday(todayISO());
    tick();
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return today;
}
