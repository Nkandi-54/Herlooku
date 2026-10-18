"use client";

import React, { useState } from "react";
import { UserRound } from "lucide-react";

interface AvatarProps {
  src?: string;
  name: string;
  /** Any Tailwind size/padding classes for the box, e.g. "w-14 h-14 rounded-2xl". */
  className?: string;
  /** Tailwind text size for the initials fallback, e.g. "text-lg". */
  textClassName?: string;
}

/**
 * Image avatar with a graceful initials fallback.
 * If the remote photo 404s, is blocked, or is missing, the user still gets a
 * legible monogram instead of an empty box.
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  className = "w-14 h-14 rounded-2xl",
  textClassName = "text-lg",
}) => {
  const [failed, setFailed] = useState(false);

  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  if (!src || failed) {
    return (
      <div
        aria-label={name}
        role="img"
        className={`${className} shrink-0 bg-gradient-to-br from-brand-100 via-sky-100 to-brand-50 text-brand-700 flex items-center justify-center font-black border border-brand-200/70 ${textClassName}`}
      >
        {initials || <UserRound size={18} />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover shrink-0`}
    />
  );
};
