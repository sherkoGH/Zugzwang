"use client";

import { useMemo, useState } from "react";
import { CITY_OPTIONS, generateLeaderboard } from "@/store/useAuthStore";

export default function LeaderboardPage() {
  const [city, setCity] = useState<string>("All");
  const entries = useMemo(() => generateLeaderboard(city), [city]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tightest">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">
          Top players by ELO. Filter by city to find local rivals.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CITY_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCity(c)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-semibold outline-none duration-150 ease-out",
              "focus-visible:ring-2 focus-visible:ring-accent",
              city === c
                ? "bg-accent text-obsidian"
                : "border border-earth-line text-ivory hover:bg-earth-hover",
            ].join(" ")}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-earth-line bg-earth-card">
        <table className="w-full text-sm">
          <thead className="bg-earth">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 text-right font-semibold">W / L</th>
              <th className="px-4 py-3 text-right font-semibold">ELO</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={`${e.username}-${e.rank}`}
                className="border-t border-earth-line duration-150 ease-out hover:bg-earth-hover"
              >
                <td className="px-4 py-3 font-mono text-muted">{e.rank}</td>
                <td className="px-4 py-3 font-semibold">{e.username}</td>
                <td className="px-4 py-3 text-muted">{e.city}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  <span className="text-accent">{e.wins}</span>
                  <span className="text-muted"> / </span>
                  <span className="text-muted">{e.losses}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-ivory">
                  {e.elo}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No players found for this city.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
