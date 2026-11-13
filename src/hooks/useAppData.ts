"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData, ISODate, Outage, Profile } from "@/types";
import { latestCompletedEndDate } from "@/utils/dateLogic";
import { buildDemoData } from "@/utils/demoData";
import { emptyData, loadData, newId, saveData, STORAGE_KEY } from "@/utils/storage";

export type OutageInput = Omit<Outage, "id" | "createdAt" | "updatedAt">;

export interface AppActions {
  addOutage: (input: OutageInput) => void;
  updateOutage: (id: string, input: Partial<OutageInput>) => void;
  deleteOutage: (id: string) => void;
  markOutageComplete: (id: string, today: ISODate) => void;
  setCurrentlyBadged: (active: boolean, today: ISODate) => void;
  setDeactivationOverride: (date: ISODate | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  loadDemo: (today: ISODate) => void;
  clearAll: () => void;
  replaceAll: (data: AppData) => void;
}

/** Local-first app state persisted to localStorage (`nuke30_data_v1`). */
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

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const addOutage = useCallback(
    (input: OutageInput) =>
      update((d) => {
        const now = new Date().toISOString();
        const outages = [...d.outages, { ...input, id: newId(), createdAt: now, updatedAt: now }];
        return { ...d, outages, profile: input.status === "active" ? { ...d.profile, manualActive: false } : d.profile };
      }),
    [update],
  );

  const updateOutage = useCallback(
    (id: string, input: Partial<OutageInput>) =>
      update((d) => ({
        ...d,
        outages: d.outages.map((o) => (o.id === id ? { ...o, ...input, updatedAt: new Date().toISOString() } : o)),
      })),
    [update],
  );

  const deleteOutage = useCallback(
    (id: string) => update((d) => ({ ...d, outages: d.outages.filter((o) => o.id !== id) })),
    [update],
  );

  const markOutageComplete = useCallback(
    (id: string, today: ISODate) =>
      update((d) => ({
        ...d,
        profile: { ...d.profile, manualActive: false, deactivationOverride: null },
        outages: d.outages.map((o) =>
          o.id === id ? { ...o, status: "completed", endDate: today, updatedAt: new Date().toISOString() } : o,
        ),
      })),
    [update],
  );

  const setCurrentlyBadged = useCallback(
    (active: boolean, today: ISODate) =>
      update((d) => {
        if (active) return { ...d, profile: { ...d.profile, manualActive: true } };
        const stamp = new Date().toISOString();
        const outages = d.outages.map((o) =>
          o.status === "active" ? { ...o, status: "completed" as const, endDate: today, updatedAt: stamp } : o,
        );
        const latest = latestCompletedEndDate(outages);
        return {
          ...d,
          outages,
          profile: { ...d.profile, manualActive: false, deactivationOverride: latest === today ? null : today },
        };
      }),
    [update],
  );

  const setDeactivationOverride = useCallback(
    (date: ISODate | null) => update((d) => ({ ...d, profile: { ...d.profile, deactivationOverride: date } })),
    [update],
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } })),
    [update],
  );

  const loadDemo = useCallback((today: ISODate) => setData(buildDemoData(today)), []);
  const clearAll = useCallback(() => setData(emptyData()), []);
  const replaceAll = useCallback((next: AppData) => setData(next), []);

  return {
    data,
    hydrated,
    actions: {
      addOutage,
      updateOutage,
      deleteOutage,
      markOutageComplete,
      setCurrentlyBadged,
      setDeactivationOverride,
      updateProfile,
      loadDemo,
      clearAll,
      replaceAll,
    },
  };
}
