"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CAP, renderCloud, STEM, type CloudSpec } from "@/utils/cloudRender";

const SCENE_W = 400;
const SCENE_H = 700;

/** Where a cloud canvas sits inside the scene (scene units → CSS px via `u`). */
const place = (spec: CloudSpec, u: number): CSSProperties => ({
  position: "absolute",
  left: spec.box.x * u,
  top: spec.box.y * u,
  width: spec.box.w * u,
  height: spec.box.h * u,
});

/**
 * Full-screen "badge expired" mushroom-cloud animation.
 * The cloud is painted into canvases at the screen's real pixel density (see cloudRender.ts),
 * so it stays sharp on iPhones; the rest is CSS and a little SVG. No image files, no filters.
 * Tap anywhere to close. With Reduce Motion on, it skips the blast and just shows the message.
 */
export function NukeBlast({ sites, onClose }: { sites: string[]; onClose: () => void }) {
  const [showText, setShowText] = useState(false);
  // Scene scale: CSS px per scene unit, and where the 400×700 scene sits (bottom-centered, covering the screen).
  const [geo, setGeo] = useState<{ u: number; left: number; top: number } | null>(null);
  const capRef = useRef<HTMLCanvasElement>(null);
  const stemRef = useRef<HTMLCanvasElement>(null);
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const t = window.setTimeout(() => setShowText(true), reduce ? 0 : 2600);
    try {
      navigator.vibrate?.([80, 40, 200]);
    } catch {
      /* not supported */
    }
    if (!reduce) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const u = Math.max(vw / SCENE_W, vh / SCENE_H);
      setGeo({ u, left: (vw - SCENE_W * u) / 2, top: vh - SCENE_H * u });
    }
    return () => window.clearTimeout(t);
  }, [reduce]);

  // Paint the cloud once its canvases exist. Device pixels per scene unit, capped at 3× screens.
  useEffect(() => {
    if (!geo) return;
    const ppu = geo.u * Math.min(window.devicePixelRatio || 1, 3);
    if (stemRef.current) renderCloud(stemRef.current, STEM, ppu);
    if (capRef.current) renderCloud(capRef.current, CAP, ppu);
  }, [geo]);

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
          {geo && (
            <div
              aria-hidden
              style={
                {
                  position: "absolute",
                  left: geo.left,
                  top: geo.top,
                  width: SCENE_W * geo.u,
                  height: SCENE_H * geo.u,
                  "--u": `${geo.u}px`,
                } as CSSProperties
              }
            >
              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
                <defs>
                  <radialGradient id="nk-dust" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c46a2a" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#3a1a0c" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse className="nuke-dust" cx="200" cy="560" rx="190" ry="34" fill="url(#nk-dust)" />
                <ellipse className="nuke-wave" cx="200" cy="560" rx="40" ry="8" fill="none" stroke="#fff3c4" strokeWidth="3" />
              </svg>

              <canvas ref={stemRef} className="nuke-stemc" style={place(STEM, geo.u)} />

              {/* warm light the cloud throws on the sky behind it */}
              <div
                className="nuke-halo"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 90 * geo.u,
                  width: SCENE_W * geo.u,
                  height: 320 * geo.u,
                }}
              />

              <canvas ref={capRef} className="nuke-capc" style={place(CAP, geo.u)} />

              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
                <defs>
                  <radialGradient id="nk-fire" cx="50%" cy="45%" r="60%">
                    <stop offset="0%" stopColor="#fffbe6" />
                    <stop offset="30%" stopColor="#ffd54a" />
                    <stop offset="65%" stopColor="#ff7a1a" />
                    <stop offset="100%" stopColor="#7a1e05" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* condensation ring around the stem */}
                <g className="nuke-ring">
                  <ellipse cx="200" cy="400" rx="64" ry="12" fill="none" stroke="#ffe2bd" strokeOpacity="0.2" strokeWidth="9" />
                  <ellipse cx="200" cy="400" rx="64" ry="12" fill="none" stroke="#fff0dc" strokeOpacity="0.4" strokeWidth="3" />
                </g>
                <circle className="nuke-ball" cx="200" cy="540" r="40" fill="url(#nk-fire)" />
              </svg>
            </div>
          )}
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
