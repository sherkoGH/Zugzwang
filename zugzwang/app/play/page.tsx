import { GamePanel } from "@/components/game/GamePanel";

export default function PlayPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tightest">Play</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a variant, a clock, and an opponent. Captures are mandatory in every rule set.
        </p>
      </div>
      <GamePanel />
    </div>
  );
}
