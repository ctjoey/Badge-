/** Nuke30 logo mark — same design as public/icon.svg, inline for crisp header rendering. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} role="img" aria-label="Nuke30 logo">
      <rect width="512" height="512" rx="112" fill="#0f172a" />
      <circle
        cx="256"
        cy="256"
        r="196"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="34"
        strokeDasharray="33 8.0491"
        transform="rotate(-87.6 256 256)"
      />
      <circle
        cx="256"
        cy="256"
        r="196"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="34"
        strokeDasharray="33 1198.5"
        transform="rotate(-87.6 256 256)"
      />
      <g fill="#f8fafc">
        <rect x="142" y="171" width="100" height="28" rx="6" />
        <rect x="172" y="242" width="70" height="28" rx="6" />
        <rect x="142" y="313" width="100" height="28" rx="6" />
        <rect x="214" y="171" width="28" height="170" rx="6" />
        <rect x="270" y="171" width="100" height="28" rx="6" />
        <rect x="270" y="313" width="100" height="28" rx="6" />
        <rect x="270" y="171" width="28" height="170" rx="6" />
        <rect x="342" y="171" width="28" height="170" rx="6" />
      </g>
    </svg>
  );
}
