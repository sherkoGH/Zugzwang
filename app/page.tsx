"use client";

import Link from "next/link";
import { Swords, Bot, Brain, Trophy } from "lucide-react";
import { DAILY_PUZZLES, MASTER_PUZZLE } from "@/store/useAuthStore";
import { DynamicSquareCard } from "@/components/ui/dynamic-square";
import { HoverButton } from "@/components/ui/hover-glow-button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Hero />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DynamicSquareCard
          title="Quick Play"
          tag="5+3"
          description="Pass & play locally on one screen."
          buttonText="Start →"
          buttonHref="/play?mode=local"
          icon={<Swords className="h-4 w-4" />}
        />
        <DynamicSquareCard
          title="Play vs Bot"
          tag="AI"
          description="6 personas, 700 – 2200 Elo."
          buttonText="Choose →"
          buttonHref="/play?mode=bot"
          icon={<Bot className="h-4 w-4" />}
        />
        <DynamicSquareCard
          title="Daily Puzzles"
          tag="🔥"
          description="3 tactics + 1 master, refreshed daily."
          buttonText="Solve →"
          buttonHref="/puzzles"
          icon={<Brain className="h-4 w-4" />}
        />
        <DynamicSquareCard
          title="Multiplayer"
          tag="Live"
          description="Create a room, share the 6-char code."
          buttonText="Open lobby →"
          buttonHref="/play/online"
          icon={<Trophy className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-earth-line bg-earth-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Daily Tactics</h2>
            <Link
              href="/puzzles"
              className="text-xs font-semibold uppercase tracking-wider text-accent hover:text-accent-bright"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {DAILY_PUZZLES.map((p) => (
              <Link
                key={p.id}
                href="/puzzles"
                className="rounded-md border border-earth-line bg-earth p-4 outline-none duration-150 ease-out hover:bg-earth-hover focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="text-xs uppercase tracking-wider text-muted">{p.variant}</div>
                <div className="mt-1.5 text-sm font-semibold tracking-tight">{p.title}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-earth-hover px-2 py-0.5 text-[11px] font-mono text-accent">
                  ★ {p.rating}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-accent/30 bg-gradient-to-br from-earth-card to-earth p-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Master Puzzle
          </div>
          <div className="text-base font-semibold tracking-tight">{MASTER_PUZZLE.title}</div>
          <p className="mt-2 text-xs text-muted">
            A multi-jump combination from grandmaster practice. Can you find the win?
          </p>
          <Link
            href="/puzzles"
            className="mt-4 inline-flex rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-obsidian outline-none hover:bg-accent-bright focus-visible:ring-2 focus-visible:ring-accent-bright"
          >
            Solve now
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-earth-line bg-earth-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Three rule sets, one place</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <RuleCard
            tag="American"
            title="Classic English Draughts"
            description="Forward men, forced captures, short-range kings. The original."
          />
          <RuleCard
            tag="Русские"
            title="Russian / Flying Kings"
            description="Backward jumps for men, long-range flying kings, mid-jump promotion."
          />
          <RuleCard
            tag="Поддавки"
            title="Giveaway / Antichess"
            description="Lose all your pieces to win. Mandatory captures still apply."
          />
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-earth-line bg-gradient-to-br from-earth-card via-earth to-obsidian-deep px-6 py-10 sm:px-10 sm:py-12">
      <div className="absolute inset-0 bg-grid-soft opacity-60" />
      <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Zugzwang
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tightest sm:text-5xl">
            Checkers, reimagined.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Three rule sets. Six AI opponents. Daily tactics, city leaderboards, and clocks down to the
            second. Built for speed, polish, and depth.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/play">
              <HoverButton glowColor="#81b64c" backgroundColor="#81b64c" textColor="#1c1a17" hoverTextColor="#1c1a17">
                Play now
              </HoverButton>
            </Link>
            <Link href="/puzzles">
              <HoverButton glowColor="#81b64c" backgroundColor="#302e2b" textColor="#eeeed2" hoverTextColor="#81b64c">
                Daily puzzles
              </HoverButton>
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <MiniBoardArt />
        </div>
      </div>
    </section>
  );
}

function MiniBoardArt() {
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const dark = (r + c) % 2 === 1;
      const hasPiece = (dark && r < 3) || (dark && r > 4);
      const color: "white" | "black" = r < 4 ? "black" : "white";
      squares.push(
        <div
          key={`${r}-${c}`}
          className={[
            "relative flex items-center justify-center",
            dark ? "bg-board-dark" : "bg-board-light",
          ].join(" ")}
        >
          {hasPiece && (
            <span
              className={[
                "h-[70%] w-[70%] rounded-full border-2 shadow-sm",
                color === "white"
                  ? "border-[#9a9a85] bg-[#f0f0e0]"
                  : "border-black bg-[#262422]",
              ].join(" ")}
            />
          )}
        </div>
      );
    }
  }
  return (
    <div
      className="ml-auto grid w-full max-w-[320px] overflow-hidden rounded-lg shadow-2xl"
      style={{ gridTemplateColumns: "repeat(8, 1fr)", aspectRatio: "1/1" }}
    >
      {squares}
    </div>
  );
}

function RuleCard({
  tag,
  title,
  description,
}: {
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-earth-line bg-earth p-4">
      <span className="inline-block rounded bg-earth-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
        {tag}
      </span>
      <h3 className="mt-2 text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
    </div>
  );
}
