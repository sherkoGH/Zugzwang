"use client";

import Link from "next/link";
import { useAuthStore, ALL_BADGES } from "@/store/useAuthStore";
import { StatCardGrid, type StatCardItem } from "@/components/ui/stats-cards";
import type { ProfileStats } from "@/types/game";

export default function ProfilePage() {
  const stats = useAuthStore((s) => s.stats);
  const username = useAuthStore((s) => s.username);
  const email = useAuthStore((s) => s.email);
  const isPro = useAuthStore((s) => s.isPro);
  const ratings = useAuthStore((s) => s.ratings);
  const streak = useAuthStore((s) => s.puzzleStreak);

  const winRate = totalRate(stats);

  const ratingCards: StatCardItem[] = [
    { name: "Bullet", value: String(ratings.bullet), change: "1+0 / 2+1", changeType: "neutral" },
    { name: "Blitz", value: String(ratings.blitz), change: "3+0 / 5+3", changeType: "neutral" },
    { name: "Rapid", value: String(ratings.rapid), change: "10+0", changeType: "neutral" },
    {
      name: "Puzzle",
      value: String(ratings.puzzle),
      change: `${streak.current}🔥`,
      changeType: "positive",
      href: "/puzzles",
      hrefLabel: "Solve today →",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-earth-line bg-earth-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-lg bg-accent text-2xl font-bold text-obsidian">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tightest">{username}</h1>
            <p className="text-sm text-muted">
              {email ?? "Not signed in"} • {stats.city}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-earth-hover px-2 py-0.5 text-xs font-mono text-accent">
                {stats.elo} ELO
              </span>
              {isPro ? (
                <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
                  Pro
                </span>
              ) : (
                <Link
                  href="/upgrade"
                  className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-obsidian outline-none duration-150 ease-out hover:bg-accent-bright focus-visible:ring-2 focus-visible:ring-accent-bright"
                >
                  Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          <Stat label="Wins" value={stats.wins} />
          <Stat label="Losses" value={stats.losses} />
          <Stat label="Draws" value={stats.draws} />
          <Stat label="Streak" value={`${stats.streak} 🔥`} />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
          Ratings by category
        </h2>
        <StatCardGrid items={ratingCards} columns={4} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-earth-line bg-earth-card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">ELO over 30 days</h2>
            <span className="text-xs text-muted">Win rate: {winRate}%</span>
          </div>
          <EloGraph history={stats.eloHistory} />
        </div>
        <div className="rounded-xl border border-earth-line bg-earth-card p-5">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Achievements</h2>
          <ul className="grid grid-cols-2 gap-2">
            {ALL_BADGES.map((b) => {
              const unlocked = stats.badges.find((sb) => sb.id === b.id);
              return (
                <li
                  key={b.id}
                  className={[
                    "rounded-md border p-3 transition-opacity",
                    unlocked
                      ? "border-accent/40 bg-accent/5"
                      : "border-earth-line bg-earth opacity-60",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-xs font-semibold tracking-tight">{b.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{b.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {!isPro && (
        <section className="rounded-xl border border-accent/30 bg-gradient-to-br from-earth-card to-earth p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Zugzwang Pro</h2>
              <p className="mt-1 text-sm text-muted">
                AI Coach analysis, custom piece skins, unlimited puzzle attempts, and tournament entry.
              </p>
            </div>
            <Link
              href="/upgrade"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian outline-none duration-150 ease-out hover:bg-accent-bright focus-visible:ring-2 focus-visible:ring-accent-bright"
            >
              Upgrade — $4.99/mo
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function totalRate(stats: ProfileStats): number {
  const total = stats.wins + stats.losses + stats.draws;
  if (total === 0) return 0;
  return Math.round((stats.wins / total) * 100);
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-earth-line bg-earth px-3 py-2 text-center">
      <div className="text-base font-bold tracking-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function EloGraph({
  history,
}: {
  history: readonly { date: string; elo: number }[];
}) {
  if (history.length === 0) return null;
  const W = 600;
  const H = 180;
  const padX = 20;
  const padY = 14;
  const min = Math.min(...history.map((h) => h.elo)) - 20;
  const max = Math.max(...history.map((h) => h.elo)) + 20;
  const span = Math.max(max - min, 1);
  const points = history.map((h, i) => {
    const x = padX + ((W - padX * 2) * i) / Math.max(history.length - 1, 1);
    const y = H - padY - ((h.elo - min) / span) * (H - padY * 2);
    return { x, y, elo: h.elo, date: h.date };
  });
  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x},${H - padY} L ${points[0].x},${
    H - padY
  } Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full">
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#81b64c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#81b64c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Horizontal grid */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={W - padX}
          y1={padY + (H - padY * 2) * t}
          y2={padY + (H - padY * 2) * t}
          stroke="#3d3b38"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      ))}
      <path d={areaPath} fill="url(#eloFill)" />
      <path d={linePath} fill="none" stroke="#81b64c" strokeWidth={2} strokeLinejoin="round" />
      {points
        .filter((_, i) => i === points.length - 1 || i === 0 || i % 7 === 0)
        .map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={3} fill="#9bce5a" />
          </g>
        ))}
    </svg>
  );
}
