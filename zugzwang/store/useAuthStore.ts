// store/useAuthStore.ts — User session, profile stats, and demo seed data.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Badge, ProfileStats, Puzzle, Variant, Board } from "@/types/game";
import { createEmptyBoard, isDarkSquare } from "@/lib/engine";

interface AuthState {
  email: string | null;
  username: string;
  isPro: boolean;
  stats: ProfileStats;
  /** Category-split Elo ratings — Step 4 of roadmap. */
  ratings: {
    bullet: number;
    blitz: number;
    rapid: number;
    puzzle: number;
  };
  /** Daily tactics streak (consecutive days with ≥ 1 puzzle solved). */
  puzzleStreak: {
    current: number;
    longest: number;
    lastSolvedDate: string | null; // YYYY-MM-DD
  };
  setUser: (email: string | null, username?: string) => void;
  upgrade: () => void;
  recordResult: (
    result: "win" | "loss" | "draw",
    eloDelta: number,
    category?: "bullet" | "blitz" | "rapid"
  ) => void;
  recordPuzzleSolved: (puzzleId: string, ratingDelta?: number) => void;
  unlockBadge: (badgeId: string) => void;
  /** Called by game store after each move with capture count + final status + variant. */
  reportMoveOutcome: (info: {
    captures: number;
    promoted: boolean;
    variant: Variant;
    didWin: boolean;
    boardClearedOpponent: boolean;
  }) => void;
}

const SEED_BADGES: readonly Badge[] = [
  { id: "first-blood", title: "First Blood", description: "Win your first game.", icon: "🩸" },
  { id: "double-kill", title: "Double Kill", description: "Capture two pieces in one turn.", icon: "⚔️" },
  { id: "king-me", title: "King Me", description: "Promote your first man.", icon: "👑" },
  { id: "impossible", title: "Impossible is Possible", description: "Win a Giveaway game.", icon: "🌟" },
  { id: "blitz-streak", title: "Blitz Streak", description: "Win 3 Blitz games in a row.", icon: "⚡" },
  { id: "city-champ", title: "City Champion", description: "Top 10 in your city.", icon: "🏙️" },
];

const seedEloHistory = (): readonly { date: string; elo: number }[] => {
  const today = new Date();
  const points: { date: string; elo: number }[] = [];
  let elo = 1150;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    elo += Math.round((Math.random() - 0.45) * 22);
    points.push({ date: d.toISOString().slice(0, 10), elo });
  }
  return points;
};

const DEFAULT_STATS: ProfileStats = {
  username: "Guest",
  elo: 1234,
  wins: 18,
  losses: 11,
  draws: 4,
  streak: 3,
  city: "Almaty",
  badges: SEED_BADGES.slice(0, 3).map((b) => ({
    ...b,
    unlockedAt: new Date().toISOString(),
  })),
  eloHistory: seedEloHistory(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      email: null,
      username: "Guest",
      isPro: false,
      stats: DEFAULT_STATS,
      ratings: { bullet: 1180, blitz: 1234, rapid: 1290, puzzle: 1340 },
      puzzleStreak: { current: 0, longest: 0, lastSolvedDate: null },

      setUser: (email, username) => {
        set({
          email,
          username: username ?? email?.split("@")[0] ?? "Guest",
          stats: { ...get().stats, username: username ?? email?.split("@")[0] ?? "Guest" },
        });
      },

      upgrade: () => set({ isPro: true }),

      recordResult: (result, eloDelta, category) => {
        const s = get().stats;
        const newElo = s.elo + eloDelta;
        const today = new Date().toISOString().slice(0, 10);
        const newHistory = [...s.eloHistory.slice(-29), { date: today, elo: newElo }];
        // Mirror the delta into the time-control bucket if one was passed.
        const ratings = { ...get().ratings };
        if (category) ratings[category] = ratings[category] + eloDelta;
        set({
          ratings,
          stats: {
            ...s,
            elo: newElo,
            wins: s.wins + (result === "win" ? 1 : 0),
            losses: s.losses + (result === "loss" ? 1 : 0),
            draws: s.draws + (result === "draw" ? 1 : 0),
            streak: result === "win" ? s.streak + 1 : 0,
            eloHistory: newHistory,
          },
        });
        if (result === "win" && s.wins === 0) {
          get().unlockBadge("first-blood");
        }
      },

      recordPuzzleSolved: (_puzzleId, ratingDelta = 8) => {
        const today = new Date().toISOString().slice(0, 10);
        const st = get().puzzleStreak;
        let current = st.current;
        if (st.lastSolvedDate === today) {
          // Already counted today.
        } else {
          // Check if the last solved date was exactly yesterday.
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yString = yesterday.toISOString().slice(0, 10);
          current = st.lastSolvedDate === yString ? st.current + 1 : 1;
        }
        const longest = Math.max(st.longest, current);
        const ratings = { ...get().ratings, puzzle: get().ratings.puzzle + ratingDelta };
        set({
          puzzleStreak: { current, longest, lastSolvedDate: today },
          ratings,
        });
      },

      unlockBadge: (badgeId) => {
        const seed = SEED_BADGES.find((b) => b.id === badgeId);
        if (!seed) return;
        const s = get().stats;
        if (s.badges.find((b) => b.id === badgeId)) return;
        set({
          stats: {
            ...s,
            badges: [...s.badges, { ...seed, unlockedAt: new Date().toISOString() }],
          },
        });
      },

      reportMoveOutcome: (info) => {
        // ⚔️ Double Kill — ≥ 2 captures in one move.
        if (info.captures >= 2) get().unlockBadge("double-kill");
        // 👑 King Me — first promotion.
        if (info.promoted) get().unlockBadge("king-me");
        // 🌟 Impossible is Possible — win a Giveaway game.
        if (info.didWin && info.variant === "giveaway") {
          get().unlockBadge("impossible");
        }
      },
    }),
    {
      name: "zugzwang-auth-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({
          getItem: () => null, setItem: () => undefined, removeItem: () => undefined,
          clear: () => undefined, key: () => null, length: 0,
        } as Storage)
      ),
    }
  )
);

export const ALL_BADGES = SEED_BADGES;

// ----- Demo leaderboard data -----

export interface LeaderboardEntry {
  readonly rank: number;
  readonly username: string;
  readonly elo: number;
  readonly city: string;
  readonly wins: number;
  readonly losses: number;
}

const CITIES = ["Almaty", "Astana", "Taraz", "Shymkent", "Karaganda"] as const;
const NAMES = [
  "Aibek", "Dana", "Yerlan", "Madina", "Olzhas", "Aigerim", "Bauyrzhan", "Saltanat",
  "Timur", "Aizhan", "Nurlan", "Aliya", "Ruslan", "Botagoz", "Sanzhar", "Gulnaz",
  "Daniyar", "Kamila", "Zhanibek", "Aruzhan", "Murat", "Diana", "Kanat", "Aisha",
];

export function generateLeaderboard(city?: string): readonly LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < NAMES.length; i++) {
    const c = CITIES[i % CITIES.length];
    if (city && city !== "All" && c !== city) continue;
    entries.push({
      rank: 0,
      username: NAMES[i],
      city: c,
      elo: 2300 - i * 35 - Math.floor(Math.random() * 12),
      wins: 200 - i * 6,
      losses: 30 + i * 2,
    });
  }
  entries.sort((a, b) => b.elo - a.elo);
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export const CITY_OPTIONS: readonly string[] = ["All", ...CITIES];

// ----- Demo puzzles -----

function setPiece(board: Board, row: number, col: number, color: "white" | "black", kind: "man" | "king"): Board {
  if (!isDarkSquare(row, col)) return board;
  const next = board.map((r) => [...r]);
  next[row][col] = { id: `p${row}${col}`, color, kind };
  return next as Board;
}

function buildPuzzle1(): Board {
  let b = createEmptyBoard();
  b = setPiece(b, 5, 2, "white", "man");
  b = setPiece(b, 4, 3, "black", "man");
  b = setPiece(b, 4, 5, "black", "man");
  b = setPiece(b, 2, 5, "black", "man");
  return b;
}
function buildPuzzle2(): Board {
  let b = createEmptyBoard();
  b = setPiece(b, 6, 1, "white", "king");
  b = setPiece(b, 4, 3, "black", "man");
  b = setPiece(b, 2, 5, "black", "man");
  b = setPiece(b, 0, 7, "black", "king");
  return b;
}
function buildPuzzle3(): Board {
  let b = createEmptyBoard();
  b = setPiece(b, 5, 4, "white", "man");
  b = setPiece(b, 4, 5, "black", "man");
  b = setPiece(b, 6, 5, "white", "man");
  b = setPiece(b, 3, 4, "black", "king");
  return b;
}
function buildMasterPuzzle(): Board {
  let b = createEmptyBoard();
  b = setPiece(b, 5, 0, "white", "king");
  b = setPiece(b, 4, 1, "black", "man");
  b = setPiece(b, 4, 3, "black", "man");
  b = setPiece(b, 2, 3, "black", "man");
  b = setPiece(b, 2, 5, "black", "man");
  b = setPiece(b, 0, 5, "black", "king");
  return b;
}

const VARIANT_A: Variant = "american";
const VARIANT_R: Variant = "russian";

export const DAILY_PUZZLES: readonly Puzzle[] = [
  {
    id: "p1",
    variant: VARIANT_A,
    board: buildPuzzle1(),
    toMove: "white",
    rating: 1100,
    title: "Sharp Tactic",
    solution: [],
    isMaster: false,
  },
  {
    id: "p2",
    variant: VARIANT_R,
    board: buildPuzzle2(),
    toMove: "white",
    rating: 1450,
    title: "Flying King Net",
    solution: [],
    isMaster: false,
  },
  {
    id: "p3",
    variant: VARIANT_A,
    board: buildPuzzle3(),
    toMove: "white",
    rating: 1320,
    title: "Pin and Capture",
    solution: [],
    isMaster: false,
  },
];

export const MASTER_PUZZLE: Puzzle = {
  id: "master",
  variant: VARIANT_R,
  board: buildMasterPuzzle(),
  toMove: "white",
  rating: 2100,
  title: "Master Class: Multi-Jump Net",
  solution: [],
  isMaster: true,
};
