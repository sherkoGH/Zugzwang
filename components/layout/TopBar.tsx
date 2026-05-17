"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

const MOBILE_NAV = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/profile", label: "Profile" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function TopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const username = useAuthStore((s) => s.username);
  const elo = useAuthStore((s) => s.stats.elo);
  const email = useAuthStore((s) => s.email);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-earth-line bg-obsidian/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
      <button
        type="button"
        aria-label="Toggle navigation"
        className="rounded-md p-2 text-muted outline-none duration-150 ease-out hover:bg-earth-hover hover:text-ivory focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-sm font-semibold tracking-tight">Zugzwang</span>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href="/play"
          className="hidden rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-obsidian outline-none duration-150 ease-out hover:bg-accent-bright focus-visible:ring-2 focus-visible:ring-accent-bright sm:inline-flex"
        >
          New Game
        </Link>
        <Link
          href={email ? "/profile" : "/login"}
          className="flex items-center gap-2 rounded-md border border-earth-line bg-earth-card px-2 py-1.5 outline-none duration-150 ease-out hover:bg-earth-hover focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-accent text-sm font-semibold text-obsidian">
            {username.charAt(0).toUpperCase()}
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-xs font-semibold text-ivory">{username}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              {elo} ELO
            </span>
          </span>
        </Link>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-earth-line bg-earth-card lg:hidden">
          <ul className="flex flex-col p-2">
            {MOBILE_NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={[
                      "block rounded-md px-3 py-2.5 text-sm font-medium duration-150 ease-out",
                      active ? "bg-earth-hover text-ivory" : "text-muted hover:bg-earth-hover hover:text-ivory",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
