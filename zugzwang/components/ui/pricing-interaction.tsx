// components/ui/pricing-interaction.tsx — animated 3-tier plan picker.
// Adapted from uploaded 21st.dev pricing widget. Dark Zugzwang theme,
// number animation done with CSS counter rather than @number-flow/react.
"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PricingProps {
  freeLabel?: string;
  starterMonth: number;
  starterAnnual: number;
  proMonth: number;
  proAnnual: number;
  /** Called with the selected tier label after the user clicks Get Started. */
  onCheckout?: (tier: "free" | "starter" | "pro") => void;
}

const TIERS = ["free", "starter", "pro"] as const;
type Tier = (typeof TIERS)[number];

export function PricingInteraction({
  freeLabel = "Free",
  starterMonth,
  starterAnnual,
  proMonth,
  proAnnual,
  onCheckout,
}: PricingProps) {
  const [active, setActive] = React.useState<Tier>("starter");
  const [period, setPeriod] = React.useState<0 | 1>(0); // 0 = monthly, 1 = yearly

  const starterPrice = period === 0 ? starterMonth : starterAnnual;
  const proPrice = period === 0 ? proMonth : proAnnual;

  const activeIndex = TIERS.indexOf(active);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[28px] border border-white/10 bg-earth p-3 shadow-lg">
      {/* Monthly / Yearly toggle */}
      <div className="relative flex w-full items-center rounded-full bg-obsidian/60 p-1.5">
        <button
          className="z-20 w-full rounded-full p-1.5 text-sm font-semibold text-ivory"
          onClick={() => setPeriod(0)}
        >
          Monthly
        </button>
        <button
          className="z-20 w-full rounded-full p-1.5 text-sm font-semibold text-ivory"
          onClick={() => setPeriod(1)}
        >
          Yearly
        </button>
        <div
          className="absolute inset-0 z-10 flex w-1/2 justify-center p-1.5"
          style={{
            transform: `translateX(${period * 100}%)`,
            transition: "transform 0.3s",
          }}
        >
          <div className="h-full w-full rounded-full bg-accent shadow-sm" />
        </div>
      </div>

      {/* Plan cards */}
      <div className="relative flex w-full flex-col items-center justify-center gap-3">
        <PlanRow
          name={freeLabel}
          tag={null}
          price={0}
          active={active === "free"}
          onClick={() => setActive("free")}
        />
        <PlanRow
          name="Starter"
          tag="Popular"
          price={starterPrice}
          active={active === "starter"}
          onClick={() => setActive("starter")}
        />
        <PlanRow
          name="Pro"
          tag={null}
          price={proPrice}
          active={active === "pro"}
          onClick={() => setActive("pro")}
        />

        {/* Sliding accent ring around active tier */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-[78px] w-full rounded-2xl border-2 border-accent"
          style={{
            transform: `translateY(${activeIndex * 78 + 12 * activeIndex}px)`,
            transition: "transform 0.3s",
          }}
        />
      </div>

      <button
        className={cn(
          "w-full rounded-full bg-accent p-3 text-base font-semibold text-obsidian",
          "transition-transform duration-300 active:scale-95 hover:brightness-110"
        )}
        onClick={() => onCheckout?.(active)}
      >
        {active === "free" ? "Continue Free" : `Upgrade to ${active === "pro" ? "Pro" : "Starter"}`}
      </button>
    </div>
  );
}

function PlanRow({
  name,
  tag,
  price,
  active,
  onClick,
}: {
  name: string;
  tag: string | null;
  price: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-white/10 p-4 transition-colors hover:border-white/20"
    >
      <div className="flex flex-col items-start">
        <p className="flex items-center gap-2 text-lg font-semibold text-ivory">
          {name}
          {tag && (
            <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
              {tag}
            </span>
          )}
        </p>
        <p className="flex items-center text-sm text-muted">
          <span className="font-medium text-ivory">
            ${price.toFixed(2)}
          </span>
          <span className="ml-1">/month</span>
        </p>
      </div>
      <div
        className={cn(
          "mt-0.5 flex size-6 items-center justify-center rounded-full border-2 p-1 transition-colors",
          active ? "border-accent" : "border-muted/40"
        )}
      >
        <div
          className="size-3 rounded-full bg-accent transition-opacity"
          style={{ opacity: active ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
