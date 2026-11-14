"use client";
import { Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PLANTS, PLANTS_BY_ID } from "@/data";
import type { ISODate, UserOutage } from "@/types";
import { addDaysISO, formatDisplayDate } from "@/utils/dateLogic";
import { Button, Card, cx, Field, inputClass } from "./ui";

export interface EditorSeed {
  /** Existing user entry being edited. */
  userId?: string;
  plantId: string;
  unit: number;
  start: ISODate;
  days: number;
  /** Projected outage being corrected. */
  replaces: UserOutage["replaces"];
}

export function OutageEditor({
  seed,
  today,
  onSave,
  onDelete,
  onCancel,
}: {
  seed: EditorSeed | null;
  today: ISODate;
  onSave: (o: UserOutage) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const plants = useMemo(() => [...PLANTS].sort((a, b) => a.name.localeCompare(b.name)), []);
  const [plantId, setPlantId] = useState(seed?.plantId ?? "");
  const plant = PLANTS_BY_ID.get(plantId);
  const [unit, setUnit] = useState<number>(seed?.unit ?? plant?.units[0] ?? 1);
  const [start, setStart] = useState<ISODate>(seed?.start ?? "");
  const [days, setDays] = useState<string>(String(seed?.days ?? 30));
  const [error, setError] = useState<string | null>(null);

  const correcting = !!seed?.replaces && !seed.userId;
  const editing = !!seed?.userId;
  const title = editing ? "Update your dates" : correcting ? "Update dates" : "Add an outage";
  const n = Number(days);
  const end = start && Number.isInteger(n) && n >= 1 ? addDaysISO(start, n - 1) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!plant) return setError("Pick a power plant.");
    if (!plant.units.includes(unit)) return setError("Pick a unit.");
    if (!start) return setError("Enter the start date.");
    if (!Number.isInteger(n) || n < 1 || n > 365) return setError("Length must be 1–365 days.");
    if (end && end < today) return setError("That outage has already ended — only current and upcoming outages are listed.");
    onSave({
      id: seed?.userId ?? `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      plantId,
      unit,
      start,
      days: n,
      replaces: seed?.replaces ?? null,
    });
  };

  return (
    <Card className="border-2 border-yellow-300">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <h3 className="text-lg font-bold">{title}</h3>
        {correcting && seed && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Projected: {formatDisplayDate(seed.start)} · ~{seed.days} days. Your dates replace this one.
          </p>
        )}
        <Field label="Power plant" htmlFor="oe-plant">
          <select
            id="oe-plant"
            className={inputClass}
            value={plantId}
            disabled={correcting || editing}
            onChange={(e) => {
              setPlantId(e.target.value);
              setUnit(PLANTS_BY_ID.get(e.target.value)?.units[0] ?? 1);
            }}
          >
            <option value="">Select a plant…</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.state})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit" htmlFor="oe-unit">
            <select
              id="oe-unit"
              className={inputClass}
              value={unit}
              disabled={!plant || correcting || editing}
              onChange={(e) => setUnit(Number(e.target.value))}
            >
              {(plant?.units ?? [1]).map((u) => (
                <option key={u} value={u}>
                  Unit {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Length (days)" htmlFor="oe-days">
            <input
              id="oe-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              className={inputClass}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Start date" htmlFor="oe-start" hint={end ? `Ends ${formatDisplayDate(end)}` : undefined}>
          <input id="oe-start" type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-500/15 dark:text-red-200">
            {error}
          </p>
        )}
        <div className={cx("flex items-center gap-2", onDelete ? "justify-between" : "justify-end")}>
          {onDelete && (
            <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> {seed?.replaces ? "Use projected dates" : "Delete"}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Saved on this phone only.</p>
      </form>
    </Card>
  );
}
