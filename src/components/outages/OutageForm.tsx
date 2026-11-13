"use client";
import { useId, useState, type FormEvent } from "react";
import type { ISODate, Outage, OutageStatus } from "@/types";
import type { OutageInput } from "@/hooks/useAppData";
import { UTILITY_PRESETS } from "@/utils/presets";
import { Button, Card, cx, Field, inputClass } from "../ui";

const STATUS_OPTIONS: { value: OutageStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming / Scheduled" },
  { value: "active", label: "Active (Currently Badged)" },
  { value: "completed", label: "Completed" },
];

const CUSTOM = "__custom__";

export function OutageForm({
  initial,
  today,
  onSubmit,
  onCancel,
}: {
  initial?: Outage;
  today: ISODate;
  onSubmit: (input: OutageInput) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const initialIsPreset = !initial || (UTILITY_PRESETS as readonly string[]).includes(initial.utility);
  const [status, setStatus] = useState<OutageStatus>(initial?.status ?? "upcoming");
  const [utilityChoice, setUtilityChoice] = useState<string>(
    initial ? (initialIsPreset ? initial.utility : CUSTOM) : UTILITY_PRESETS[0],
  );
  const [customUtility, setCustomUtility] = useState(initial && !initialIsPreset ? initial.utility : "");
  const [site, setSite] = useState(initial?.site ?? "");
  const [unitLabel, setUnitLabel] = useState(initial?.unitLabel ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [employer, setEmployer] = useState(initial?.employer ?? "");
  const [startDate, setStartDate] = useState<ISODate>(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState<ISODate>(initial?.endDate ?? "");
  const [ongoing, setOngoing] = useState<boolean>(initial ? initial.endDate === null : false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const endTBDAllowed = status !== "completed";
  const endIsTBD = endTBDAllowed && ongoing;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const utility = (utilityChoice === CUSTOM ? customUtility : utilityChoice).trim();
    if (!utility) return setError("Enter a utility / site name.");
    if (!startDate) return setError("In-processing / badge activation date is required.");
    const end = endIsTBD ? null : endDate || null;
    if (status === "completed" && !end) return setError("Completed outages need an out-processing date.");
    if (end && end < startDate) return setError("Out-processing date can't be before in-processing date.");
    if (status === "active" && startDate > today)
      return setError("An active outage can't start in the future — use Upcoming / Scheduled.");
    setError(null);
    onSubmit({
      status,
      utility,
      site: site.trim(),
      unitLabel: unitLabel.trim(),
      role: role.trim(),
      employer: employer.trim(),
      startDate,
      endDate: end,
      notes: notes.trim(),
    });
  };

  return (
    <Card className="border-magenta-500/50">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <h3 className="text-lg font-bold">{initial ? "Edit outage" : "Add outage"}</h3>

        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Status</legend>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cx(
                  "cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold",
                  status === opt.value
                    ? "border-magenta-500 bg-magenta-500/15 text-magenta-700 dark:text-magenta-300"
                    : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
                )}
              >
                <input
                  type="radio"
                  name={`${uid}-status`}
                  value={opt.value}
                  checked={status === opt.value}
                  onChange={() => {
                    setStatus(opt.value);
                    if (opt.value === "active" && !initial) setOngoing(true);
                  }}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Utility / Operator" htmlFor={`${uid}-utility`}>
            <select
              id={`${uid}-utility`}
              className={inputClass}
              value={utilityChoice}
              onChange={(e) => setUtilityChoice(e.target.value)}
            >
              {UTILITY_PRESETS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              <option value={CUSTOM}>Other (custom)…</option>
            </select>
            {utilityChoice === CUSTOM && (
              <input
                className={cx(inputClass, "mt-2")}
                placeholder="Utility / operator name"
                value={customUtility}
                onChange={(e) => setCustomUtility(e.target.value)}
                maxLength={120}
                aria-label="Custom utility name"
              />
            )}
          </Field>
          <Field label="Plant / Station (optional)" htmlFor={`${uid}-site`}>
            <input
              id={`${uid}-site`}
              className={inputClass}
              placeholder="e.g. plant name"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Outage / Unit Identifier (optional)" htmlFor={`${uid}-unit`}>
            <input
              id={`${uid}-unit`}
              className={inputClass}
              placeholder='e.g. "U2 Fall Outage", "Spring RFO"'
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Role / Craft (optional)" htmlFor={`${uid}-role`}>
            <input
              id={`${uid}-role`}
              className={inputClass}
              placeholder="e.g. Pipefitter, HP Tech"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Staffing Agency / Employer (optional)" htmlFor={`${uid}-employer`} hint="Helpful for PHQ reporting.">
            <input
              id={`${uid}-employer`}
              className={inputClass}
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              maxLength={120}
            />
          </Field>
          <div />
          <Field label="In-Processing / Badge Activation Date" htmlFor={`${uid}-start`}>
            <input
              id={`${uid}-start`}
              type="date"
              className={inputClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Out-Processing / Badge Deactivation Date" htmlFor={`${uid}-end`}>
            <input
              id={`${uid}-end`}
              type="date"
              className={inputClass}
              value={endIsTBD ? "" : endDate}
              min={startDate || undefined}
              disabled={endIsTBD}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {endTBDAllowed && (
              <label className="mt-1 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
                TBD / Ongoing
              </label>
            )}
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor={`${uid}-notes`} hint="Per diem, travel, shift notes. Do not enter badge numbers or security details.">
          <textarea
            id={`${uid}-notes`}
            className={cx(inputClass, "min-h-20")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-500/15 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initial ? "Save changes" : "Add outage"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
