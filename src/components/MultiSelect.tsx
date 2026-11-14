"use client";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cx, inputClass } from "./ui";

export interface Option {
  value: string;
  label: string;
  detail?: string;
}

/** Dropdown with checkboxes: pick any number of options. */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
  summary,
  searchable,
  icon,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  summary: (selected: Option[]) => string;
  searchable?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? options.filter((o) => `${o.label} ${o.detail ?? ""}`.toLowerCase().includes(n)) : options;
  }, [options, q]);
  const chosen = options.filter((o) => selected.includes(o.value));
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative">
      <p className="mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">{label}</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          inputClass,
          "flex items-center justify-between gap-2 py-3 text-left font-semibold",
          open && "border-magenta-500 ring-2 ring-magenta-500/30",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className={cx("truncate", chosen.length === 0 && "font-normal text-zinc-400")}>
            {chosen.length ? summary(chosen) : placeholder}
          </span>
        </span>
        <ChevronDown className={cx("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 left-0 z-30 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {searchable && (
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
              <label className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  className={cx(inputClass, "pl-9")}
                  placeholder="Search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label={`Search ${label}`}
                />
              </label>
            </div>
          )}
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto">
            {shown.map((o) => {
              const on = selected.includes(o.value);
              return (
                <li key={o.value} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(o.value)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <span
                      className={cx(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                        on ? "border-magenta-500 bg-magenta-500 text-white" : "border-zinc-400 dark:border-zinc-600",
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{o.label}</span>
                      {o.detail && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{o.detail}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-3 py-4 text-center text-sm text-zinc-500">No matches.</li>}
          </ul>
          <div className="flex justify-between border-t border-zinc-200 p-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-yellow-300 px-4 py-1.5 text-sm font-semibold text-black"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
