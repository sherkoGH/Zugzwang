// components/ui/hover-glow-button.tsx — radial cursor-tracking glow.
"use client";

import React, { useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

interface HoverButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  glowColor?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
}

export function HoverButton({
  children,
  onClick,
  className = "",
  disabled = false,
  glowColor = "#81b64c",
  backgroundColor = "#21201d",
  textColor = "#eeeed2",
  hoverTextColor = "#81b64c",
}: HoverButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setGlow({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative inline-block cursor-pointer overflow-hidden rounded-lg border-none px-6 py-3 text-base font-semibold transition-colors duration-300 ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      style={{
        backgroundColor,
        color: hovered ? hoverTextColor : textColor,
      }}
    >
      <div
        className={`pointer-events-none absolute h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 transition-transform duration-300 ease-out ${hovered ? "scale-100" : "scale-0"}`}
        style={{
          left: `${glow.x}px`,
          top: `${glow.y}px`,
          background: `radial-gradient(circle, ${glowColor} 10%, transparent 70%)`,
          zIndex: 0,
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
