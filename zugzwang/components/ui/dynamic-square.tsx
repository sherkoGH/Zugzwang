// components/ui/dynamic-square.tsx — animated tile-bg card.
// Adapted from the uploaded 21st.dev component, retuned to the Zugzwang
// (#1c1a17 / #81b64c) palette and emerald tile accent.
"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export interface DynamicSquareCardProps {
  title: string;
  tag: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  /** Optional icon rendered alongside the title. */
  icon?: ReactNode;
}

export function DynamicSquareCard({
  title,
  tag,
  description,
  buttonText,
  buttonHref,
  icon,
}: Readonly<DynamicSquareCardProps>) {
  return (
    <>
      <style>
        {`
        @keyframes zz-tiles {
          0%, 40%, 80% { opacity: 0; }
          20%, 60% { opacity: 0.55; }
        }
      `}
      </style>
      <div className="group relative flex w-full flex-col gap-6 overflow-hidden rounded-xl border border-white/5 bg-earth/50 px-6 py-5 shadow-sm transition-colors hover:border-accent/30">
        <DecorativeTilesBackground />
        <div className="relative z-20">
          <div className="flex items-center gap-2">
            {icon && <span className="text-accent">{icon}</span>}
            <h3 className="inline text-lg font-semibold text-ivory">{title}</h3>
            <span className="ml-1 inline rounded-sm border border-accent/60 px-1 text-[10px] font-medium uppercase tracking-tight text-accent">
              {tag}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Link
          href={buttonHref}
          className="relative z-20 inline-flex h-10 w-full items-center justify-center rounded-lg border border-accent/20 bg-accent/15 text-sm font-medium text-accent backdrop-blur-sm transition-colors hover:border-accent/40 hover:bg-accent/25"
        >
          {buttonText}
        </Link>
      </div>
    </>
  );
}

function DecorativeTilesBackground() {
  const rows = 16;
  const columns = 20;
  const animationDuration = 14;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 flex select-none flex-wrap"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`line-${rowIndex}`}
          className="flex h-[16px] w-full border-b border-dashed border-white/[0.04]"
        >
          {Array.from({ length: columns }).map((_, colIndex) => {
            // Deterministic delay (no random per-render reshuffle).
            const delay = ((rowIndex * 7 + colIndex * 3) % 14) + 0.5;
            return (
              <div
                key={`tile-${colIndex}`}
                className="relative h-[16px] w-[15px] border-r border-dashed border-white/[0.04]"
              >
                <div
                  className="inset-0 h-[16px] w-[15px] bg-accent/20"
                  style={{
                    opacity: 0,
                    animationName: "zz-tiles",
                    animationIterationCount: "infinite",
                    animationTimingFunction: "ease",
                    animationDelay: `${delay}s`,
                    animationDuration: `${animationDuration}s`,
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
