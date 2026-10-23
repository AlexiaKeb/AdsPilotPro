import { useId } from "react";

/** Monogramme AK : le A (sommet / courbe de croissance) et le K (flèche qui monte). */
export function AKLogo({ className = "h-9 w-auto" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 50 48" className={className} fill="none" role="img" aria-label="Alexia Kebir">
      <defs>
        <linearGradient id={id} x1="0" y1="48" x2="50" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6C63FF" />
          <stop offset="1" stopColor="#00E5A0" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 40 L18 8 L31 40" />
        <path d="M10.5 29 H25.5" />
        <path d="M37 8 V40" />
        <path d="M46 8 L37 24" />
        <path d="M40 21 L46 40" />
      </g>
    </svg>
  );
}
