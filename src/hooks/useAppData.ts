"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, SiteBadge } from "@/types";
import { toggleFollow } from "@/utils/follow";
import { emptyData, loadData, saveData, STORAGE_KEY } from "@/utils/storage";

export interface AppActions {
  togglePlant: (id: string) => void;
  clearPlants: () => void;
  setBadge: (id: string, badge: SiteBadge) => void;
  setPlants: (ids: string[]) => void;
  setReminderDays: (days: number[]) => void;
  toggleFollowOutage: (o: { plantId: string; unit: number; start: string }) => void;
}

/** Local-first state persisted to localStorage (`nuke30_data_v2`). */
export function useAppData(): { data: AppData; hydrated: boolean; actions: AppActions } {
  const [data, setData] = useState<AppData>(emptyData);
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    setData(loadData());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        skipSave.current = true;
        setData(loadData());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveData(data);
  }, [data, hydrated]);

  const togglePlant = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        selectedPlantIds: d.selectedPlantIds.includes(id)
          ? d.selectedPlantIds.filter((x) => x !== id)
          : [...d.selectedPlantIds, id],
      })),
    [],
  );
  const clearPlants = useCallback(() => setData((d) => ({ ...d, selectedPlantIds: [] })), []);
  const setBadge = useCallback(
    (id: string, badge: SiteBadge) => setData((d) => ({ ...d, badges: { ...d.badges, [id]: badge } })),
    [],
  );

  const setPlants = useCallback((ids: string[]) => setData((d) => ({ ...d, selectedPlantIds: [...new Set(ids)] })), []);
  const setReminderDays = useCallback(
    (days: number[]) => setData((d) => ({ ...d, reminderDays: [...new Set(days)].sort((a, b) => b - a) })),
    [],
  );

  const toggleFollowOutage = useCallback(
    (o: { plantId: string; unit: number; start: string }) => setData((d) => ({ ...d, followed: toggleFollow(o, d.followed) })),
    [],
  );

  return {
    data,
    hydrated,
    actions: { togglePlant, clearPlants, setBadge, setPlants, setReminderDays, toggleFollowOutage },
  };
}
