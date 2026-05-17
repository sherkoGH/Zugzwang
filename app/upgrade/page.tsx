"use client";

import { useState } from "react";
import { Check, Crown, Zap } from "lucide-react";
import { PricingInteraction } from "@/components/ui/pricing-interaction";
import { useAuthStore } from "@/store/useAuthStore";
import { isSupabaseConfigured } from "@/lib/supabase";

const PRO_FEATURES = [
  "Unlimited post-match AI Coach reviews",
  "Engine analysis at depth 8 (premium accuracy)",
  "Full opening-book explorer (200k positions)",
  "Custom puzzle creator + private puzzle sets",
  "Hide your rating from public leaderboards",
  "Pro-only tournaments and arenas",
  "Priority Realtime channels (lower latency)",
  "Profile badge: 👑 Pro member",
] as const;

export default function UpgradePage() {
  const isPro = useAuthStore((s) => s.isPro);
  const upgrade = useAuthStore((s) => s.upgrade);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const supaReady = isSupabaseConfigured();

  async function handleCheckout(tier: "free" | "starter" | "pro") {
    setErr(null);
    if (tier === "free") return;

    // Production: call /api/checkout to create a Stripe session and redirect
    // to session.url. The webhook will then flip is_pro=true after payment.
    // For the demo (no Stripe configured), just flip the local flag.
    setBusy(true);
    try {
      // const res = await fetch("/api/checkout", { method: "POST", body: JSON.stringify({ tier }) });
      // const { url } = await res.json();
      // window.location.href = url;
      await new Promise((r) => setTimeout(r, 600));
      upgrade();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (isPro) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-8 text-center">
          <Crown className="mx-auto h-12 w-12 text-accent" />
          <h1 className="mt-4 font-display text-3xl text-ivory">You&apos;re a Pro member.</h1>
          <p className="mt-2 text-muted">Thank you for supporting Zugzwang. All features are unlocked.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent">
          <Zap className="h-3 w-3" /> Upgrade
        </div>
        <h1 className="font-display text-4xl tracking-tightest text-ivory">Play deeper with Pro</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Unlimited Coach reviews, deeper engine analysis, and the opening explorer. Cancel any time.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-white/5 bg-earth-deep p-8">
          <h2 className="font-display text-xl text-ivory">What you get</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-ivory">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center">
          <PricingInteraction
            starterMonth={4}
            starterAnnual={3}
            proMonth={9}
            proAnnual={7}
            onCheckout={handleCheckout}
          />
          {busy && <p className="mt-3 text-xs text-muted">Processing…</p>}
          {err && <p className="mt-3 text-xs text-rose-400">{err}</p>}
          {!supaReady && (
            <p className="mt-3 max-w-xs text-center text-[11px] text-amber-300/80">
              Demo mode: clicking upgrade flips your local Pro flag. Wire Stripe + Supabase to charge real cards.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
