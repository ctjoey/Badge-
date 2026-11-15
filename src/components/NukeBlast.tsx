"use client";
import { useEffect, useState } from "react";

// Cloud geometry [x, y, r] / stem [y, rx, ry] in the 400×700 viewBox.
// Many overlapping soft puffs + a turbulence filter read as one billowing cloud, not separate balls.
const SMOKE: [number, number, number][] = [
  [92, 273, 34], [129, 284, 36], [171, 290, 38], [229, 290, 38], [271, 284, 36], [308, 273, 34], [76, 253, 32], [324, 253, 32], [100, 232, 36], [300, 232, 36], [134, 215, 38], [266, 215, 38], [174, 204, 40], [226, 204, 40], [200, 198, 38], [116, 260, 40], [284, 260, 40], [200, 282, 40],
];
const EDGE: [number, number, number][] = [
  [62, 262, 28], [338, 262, 28], [74, 236, 26], [326, 236, 26], [96, 214, 28], [304, 214, 28],
];
const HOT: [number, number, number][] = [
  [162, 243, 40], [238, 243, 40], [200, 229, 44], [200, 256, 42], [138, 250, 30], [262, 250, 30], [182, 217, 30], [220, 217, 30],
];
const UNDER: [number, number, number][] = [
  [113, 296, 33], [164, 305, 35], [236, 305, 35], [287, 296, 33], [200, 308, 33],
];
const STEM: [number, number, number][] = [
  [550, 50, 26], [530, 40, 30], [508, 33, 32], [486, 30, 32], [464, 28, 32], [442, 27, 32], [420, 27, 32], [398, 28, 32], [376, 30, 32], [354, 33, 32], [332, 40, 30], [312, 50, 26],
];

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
              {/* Soft puffs: bright core fading to transparent so overlapping puffs blend into one cloud */}
              <radialGradient id="nk-hot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff6c8" stopOpacity="1" />
                <stop offset="35%" stopColor="#ffc14a" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#f0661c" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#a8320c" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nk-smoke" cx="50%" cy="45%" r="50%">
                <stop offset="0%" stopColor="#e8782a" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#a8441a" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#3a160a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nk-dark" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2a0e06" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#2a0e06" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nk-fire" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#fffbe6" />
                <stop offset="30%" stopColor="#ffd54a" />
                <stop offset="65%" stopColor="#ff7a1a" />
                <stop offset="100%" stopColor="#7a1e05" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nk-dust" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c46a2a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3a1a0c" stopOpacity="0" />
              </radialGradient>
              {/* Billowing edges: fractal noise displaces the puffs, slowly churning */}
              <filter id="nk-billow" x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7" result="noise">
                  <animate attributeName="baseFrequency" values="0.03;0.036;0.03" dur="7s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="0.7" />
              </filter>
              <filter id="nk-billow-soft" x="-40%" y="-10%" width="180%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="noise">
                  <animate attributeName="baseFrequency" values="0.045;0.05;0.045" dur="6s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="0.8" />
              </filter>
              <filter id="nk-haze" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            {/* ground dust ring */}
            <ellipse className="nuke-dust" cx="200" cy="560" rx="190" ry="34" fill="url(#nk-dust)" />
            {/* shockwave */}
            <ellipse className="nuke-wave" cx="200" cy="560" rx="40" ry="8" fill="none" stroke="#fff3c4" strokeWidth="3" />

            {/* stem: stacked soft puffs, billowed */}
            <g className="nuke-stem" filter="url(#nk-billow-soft)">
              {STEM.map(([y, rx, ry], i) => (
                <ellipse key={i} cx="200" cy={y} rx={rx} ry={ry} fill="url(#nk-smoke)" />
              ))}
              <ellipse cx="200" cy="430" rx="14" ry="125" fill="url(#nk-hot)" opacity="0.5" />
            </g>

            {/* condensation ring around the stem */}
            <ellipse className="nuke-ring" cx="200" cy="400" rx="64" ry="12" fill="none" stroke="#ffd8a8" strokeOpacity="0.55" strokeWidth="9" filter="url(#nk-haze)" />

            {/* mushroom cap */}
            <g className="nuke-cap">
              <g filter="url(#nk-billow)">
                {/* rolling dark underside */}
                {UNDER.map(([x, y, r], i) => (
                  <circle key={`u${i}`} cx={x} cy={y} r={r} fill="url(#nk-dark)" />
                ))}
                {/* outer smoke puffs */}
                {SMOKE.map(([x, y, r], i) => (
                  <circle key={`s${i}`} cx={x} cy={y} r={r} fill="url(#nk-smoke)" />
                ))}
                {EDGE.map(([x, y, r], i) => (
                  <circle key={`e${i}`} cx={x} cy={y} r={r} fill="url(#nk-smoke)" />
                ))}
                {/* glowing core puffs */}
                {HOT.map(([x, y, r], i) => (
                  <circle key={`h${i}`} cx={x} cy={y} r={r} fill="url(#nk-hot)" />
                ))}
              </g>
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
