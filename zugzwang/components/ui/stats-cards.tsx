// components/ui/stats-cards.tsx — Zugzwang-themed stat tile with optional CTA.
"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface StatCardItem {
  readonly name: string;
  readonly value: string;
  readonly change?: string;
  readonly changeType?: "positive" | "negative" | "neutral";
  readonly href?: string;
  readonly hrefLabel?: string;
}

interface StatCardProps {
  item: StatCardItem;
  className?: string;
}

export function StatCard({ item, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0 rounded-xl border border-white/5 bg-earth shadow-sm",
        className
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm text-muted">{item.name}</span>
          {item.change && (
            <span
              className={cn(
                "text-sm font-medium",
                item.changeType === "positive" && "text-accent",
                item.changeType === "negative" && "text-red-400",
                (!item.changeType || item.changeType === "neutral") && "text-muted"
              )}
            >
              {item.change}
            </span>
          )}
        </div>
        <div className="mt-1 text-3xl font-semibold text-ivory">{item.value}</div>
      </div>
      {item.href && (
        <div className="flex justify-end border-t border-white/5">
          <Link
            href={item.href}
            className="px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:text-accent/80"
          >
            {item.hrefLabel ?? "View more →"}
          </Link>
        </div>
      )}
    </div>
  );
}

interface StatCardGridProps {
  items: readonly StatCardItem[];
  /** Columns at lg breakpoint. */
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatCardGrid({ items, columns = 3, className }: StatCardGridProps) {
  const colClass =
    columns === 4
      ? "lg:grid-cols-4"
      : columns === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-3";
  return (
    <dl className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", colClass, className)}>
      {items.map((item) => (
        <StatCard key={item.name} item={item} />
      ))}
    </dl>
  );
}
