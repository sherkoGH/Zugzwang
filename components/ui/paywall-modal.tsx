// components/ui/paywall-modal.tsx — Pro upsell intercept.
// Used when a free user tries to access a Pro-only feature.
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Crown, X } from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  /** The Pro-only feature the user just tried to use. */
  feature: string;
  /** One-line benefit copy specific to that feature. */
  benefit?: string;
}

export function PaywallModal({ open, onClose, feature, benefit }: PaywallModalProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-accent/30 bg-earth-deep p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted hover:bg-earth-medium hover:text-ivory"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
          <Crown className="h-6 w-6 text-accent" />
        </div>

        <h2 className="font-display text-2xl tracking-tightest text-ivory">
          {feature} is a Pro feature
        </h2>
        {benefit && <p className="mt-2 text-sm text-muted">{benefit}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/upgrade"
            className="block rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-obsidian transition hover:brightness-110"
          >
            See Pro plans
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-center text-sm text-ivory transition hover:bg-earth-medium"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
