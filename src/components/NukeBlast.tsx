"use client";
import { useEffect, useState } from "react";

/**
 * Full-screen "badge expired" mushroom-cloud animation (pure CSS + SVG, no images).
 * Tap anywhere to close. With Reduce Motion on, it skips the blast and just shows the message.
 */
export function NukeBlast({ sites, onClose }: { sites: string[]; onClose: () => void }) {
  const [showText, setShowText] = useState(false);
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const t = window.setTimeout(() => setShowText(true), reduce ? 0 : 2600);
    try {
      navigator.vibrate?.([80, 40, 200]);
    } catch {
      /* not supported */
    }
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Badge expired"
      onClick={onClose}
      className={reduce ? "nuke-root fixed inset-0 z-50 overflow-hidden" : "nuke-root nuke-shake fixed inset-0 z-50 overflow-hidden"}
    >
      {!reduce && (
        <>
          <div className="nuke-sky absolute inset-0" />
          <div className="nuke-ground absolute inset-x-0 bottom-0 h-[28%]" />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 400 700"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden
          >
            <defs>
              <radialGradient id="nk-fire" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#fffbe6" />
                <stop offset="30%" stopColor="#ffd54a" />
                <stop offset="65%" stopColor="#ff7a1a" />
                <stop offset="100%" stopColor="#7a1e05" />
              </radialGradient>
              <linearGradient id="nk-stem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff8a2a" />
                <stop offset="60%" stopColor="#8a3a14" />
                <stop offset="100%" stopColor="#3a1a0c" />
              </linearGradient>
              <radialGradient id="nk-dust" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c46a2a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3a1a0c" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* ground dust ring */}
            <ellipse className="nuke-dust" cx="200" cy="560" rx="190" ry="34" fill="url(#nk-dust)" />
            {/* shockwave */}
            <ellipse className="nuke-wave" cx="200" cy="560" rx="40" ry="8" fill="none" stroke="#fff3c4" strokeWidth="3" />
            {/* stem */}
            <path className="nuke-stem" d="M182 560 C186 470 176 380 188 300 L212 300 C224 380 214 470 218 560 Z" fill="url(#nk-stem)" />
            {/* skirt ring around the stem */}
            <ellipse className="nuke-ring" cx="200" cy="390" rx="46" ry="10" fill="none" stroke="#ffb15a" strokeOpacity="0.7" strokeWidth="6" />
            {/* mushroom cap */}
            <g className="nuke-cap">
              <ellipse cx="200" cy="270" rx="110" ry="62" fill="url(#nk-fire)" />
              <circle cx="140" cy="262" r="42" fill="url(#nk-fire)" />
              <circle cx="260" cy="262" r="42" fill="url(#nk-fire)" />
              <circle cx="175" cy="228" r="46" fill="url(#nk-fire)" />
              <circle cx="228" cy="226" r="48" fill="url(#nk-fire)" />
              <ellipse cx="200" cy="300" rx="96" ry="22" fill="#7a2a0c" opacity="0.55" />
            </g>
            {/* fireball */}
            <circle className="nuke-ball" cx="200" cy="540" r="40" fill="url(#nk-fire)" />
          </svg>
          <div className="nuke-flash pointer-events-none absolute inset-0 bg-white" />
        </>
      )}

      <div
        className={
          "absolute inset-x-4 bottom-[12%] mx-auto max-w-sm rounded-2xl border-2 border-yellow-300 bg-black/85 p-5 text-center text-white shadow-2xl transition-all duration-500 " +
          (showText ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")
        }
      >
        <p className="text-xs font-semibold tracking-[0.3em] text-yellow-300 uppercase">Nuke30</p>
        <p className="mt-1 text-3xl font-black italic">
          BADGE <span className="neon-magenta">EXPIRED</span>
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          Your 30-day window closed at <strong className="text-white">{sites.join(", ")}</strong>. Time to re-qualify.
        </p>
        <p className="mt-4 text-xs text-zinc-500">Tap anywhere to close</p>
      </div>
    </div>
  );
}
