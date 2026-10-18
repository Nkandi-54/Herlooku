"use client";

import React from "react";

interface NinjaAvatarProps {
  /** Tailwind classes for the outer container box, e.g. "w-10 h-10 rounded-2xl". */
  className?: string;
  /** Tailwind class for the inner SVG glyph size. */
  glyphClassName?: string;
  /** Accessible label. */
  label?: string;
  /** Enables the headband ribbon breathing animation. */
  animated?: boolean;
}

/**
 * Herlooku Task Ninja — redesigned brand mark.
 *
 * Dark obsidian base, proper shinobi balaclava with fabric fold lines,
 * dual-eye slit with radial sky glow, dynamic headband with trailing
 * ribbon strands, ghost shuriken easter-egg in the background.
 *
 * All gradient IDs are namespaced via React.useId() so multiple
 * instances on a single page never collide inside the SVG defs tree.
 */
export const NinjaAvatar: React.FC<NinjaAvatarProps> = ({
  className = "w-10 h-10 rounded-2xl",
  glyphClassName = "w-6 h-6",
  label = "Herlooku Task Ninja",
  animated = false,
}) => {
  const rawId = React.useId();
  const uid = rawId.replace(/:/g, "");

  const bgId    = `n-bg-${uid}`;
  const fabId   = `n-fab-${uid}`;
  const bandId  = `n-band-${uid}`;
  const eyebgId = `n-ey-${uid}`;
  const eyeLId  = `n-eL-${uid}`;
  const eyeRId  = `n-eR-${uid}`;
  const sheenId = `n-sh-${uid}`;
  const filterId = `n-glow-${uid}`;

  return (
    <div
      role="img"
      aria-label={label}
      className={`${className} shrink-0 relative flex items-center justify-center overflow-hidden`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className={`${glyphClassName} relative`}
      >
        <defs>
          {/* Background: obsidian-to-midnight */}
          <linearGradient id={bgId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>

          {/* Balaclava fabric */}
          <linearGradient id={fabId} x1="6" y1="4" x2="26" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e3a5f" />
            <stop offset="0.5" stopColor="#0c2340" />
            <stop offset="1" stopColor="#071526" />
          </linearGradient>

          {/* Headband: sky-to-blue */}
          <linearGradient id={bandId} x1="4" y1="10" x2="28" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.5" stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>

          {/* Eye slit interior */}
          <linearGradient id={eyebgId} x1="8" y1="14" x2="24" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0a1628" />
            <stop offset="1" stopColor="#071020" />
          </linearGradient>

          {/* Left eye radial glow */}
          <radialGradient id={eyeLId} cx="12.5" cy="15.1" r="2.2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7dd3fc" />
            <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.65" />
            <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>

          {/* Right eye radial glow (shadow side, dimmer) */}
          <radialGradient id={eyeRId} cx="20.8" cy="15.1" r="1.9" gradientUnits="userSpaceOnUse">
            <stop stopColor="#bae6fd" />
            <stop offset="0.55" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>

          {/* Top-left surface sheen */}
          <linearGradient id={sheenId} x1="8" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glow blur filter for eyes */}
          <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="0.75" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Background tile ───────────────────── */}
        <rect width="32" height="32" rx="7" fill={`url(#${bgId})`} />

        {/* ── Ghost shuriken (easter egg) ──────── */}
        <g opacity="0.07" transform="translate(16,16)">
          <polygon points="0,-9 2,-2 9,0 2,2 0,9 -2,2 -9,0 -2,-2" fill="#38bdf8" />
          <polygon points="0,-9 2,-2 9,0 2,2 0,9 -2,2 -9,0 -2,-2" fill="#38bdf8" transform="rotate(45)" />
        </g>

        {/* ── Surface sheen ────────────────────── */}
        <rect width="32" height="32" rx="7" fill={`url(#${sheenId})`} />

        {/* ── Balaclava head silhouette ─────────── */}
        <path
          d="M16 3.5
             c5.8 0 9.5 3.8 9.5 9.2
             c0 2.8-.4 5.3-1.2 7.4
             c-.5 1.3-1.1 2.4-1.8 3.1
             c-.5.5-1 .8-1.5.8
             h-2.2c-.4 0-.7-.3-.7-.7
             v-.9c0-.4-.3-.7-.7-.7
             h-2.8c-.4 0-.7.3-.7.7
             v.9c0 .4-.3.7-.7.7
             h-2.2c-.6 0-1-.3-1.5-.8
             c-.7-.7-1.3-1.8-1.8-3.1
             c-.8-2.1-1.2-4.6-1.2-7.4
             C6.5 7.3 10.2 3.5 16 3.5Z"
          fill={`url(#${fabId})`}
        />

        {/* Nose-bridge crease */}
        <line x1="16" y1="18" x2="16" y2="21.5" stroke="#1a3a5c" strokeWidth="0.65" strokeLinecap="round" opacity="0.55" />

        {/* Fabric wrap stitching lines (lower face) */}
        <path d="M10.5 20.2 Q16 21.2 21.5 20.2" stroke="#1e3a5c" strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M11.5 22.0 Q16 22.8 20.5 22.0" stroke="#1e3a5c" strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.3" />

        {/* ── Headband ─────────────────────────── */}
        <rect x="5.5" y="9" width="21" height="2.6" rx="1.3" fill={`url(#${bandId})`} opacity="0.95" />
        <rect x="5.5" y="10.6" width="21" height="0.55" rx="0.27" fill="#0c4a6e" opacity="0.3" />
        <circle cx="16" cy="10.3" r="1.6" fill="#0369a1" />
        <circle cx="16" cy="10.3" r="0.7" fill="#e0f2fe" opacity="0.9" />
        <circle cx="15.62" cy="9.9" r="0.22" fill="#ffffff" opacity="0.75" />

        {/* ── Trailing ribbon strands ──────────── */}
        <g className={animated ? "ninja-band-tail" : undefined}>
          <path
            d="M6.5 10.3
               L2.5 7.8
               c-.7-.45-1.5.4-.9 1.1
               l2.6 3.1
               c.35.4.35 1.05-.05 1.45
               L2.4 15.0
               c-.6.6-.1 1.6.8 1.4
               l4.5-.85"
            fill={`url(#${bandId})`}
            opacity="0.8"
          />
          <path
            d="M6.2 11.2 L3 14.2
               c-.55.55-.05 1.5.7 1.35
               l3.1-.6"
            stroke={`url(#${bandId})`}
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
        </g>

        {/* ── Eye slit ─────────────────────────── */}
        <rect x="7" y="13.0" width="18" height="4.2" rx="2.1" fill={`url(#${eyebgId})`} />
        <rect x="7" y="13.0" width="18" height="0.5" rx="0.25" fill="#1e3a5c" opacity="0.45" />
        <rect x="7" y="16.7" width="18" height="0.5" rx="0.25" fill="#071526" opacity="0.5" />

        {/* Left eye — dominant, bright sky */}
        <circle cx="12.5" cy="15.1" r="1.55" fill={`url(#${eyeLId})`} filter={`url(#${filterId})`} />
        <circle cx="12.5" cy="15.1" r="0.72" fill="#7dd3fc" opacity="0.97" />
        <circle cx="12.18" cy="14.76" r="0.27" fill="#ffffff" opacity="0.92" />

        {/* Right eye — secondary */}
        <circle cx="20.8" cy="15.1" r="1.3" fill={`url(#${eyeRId})`} filter={`url(#${filterId})`} />
        <circle cx="20.8" cy="15.1" r="0.58" fill="#bae6fd" opacity="0.9" />
        <circle cx="20.5" cy="14.82" r="0.21" fill="#ffffff" opacity="0.82" />
      </svg>
    </div>
  );
};
