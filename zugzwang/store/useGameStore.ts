// store/useGameStore.ts — Central client-side game state.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Board,
  Coord,
  Move,
  Piece,
  PieceColor,
  Variant,
  TimeControl,
  GameStatus,
  AnnotatedMove,
  BotPersona,
} from "@/types/game";
import {
  applyMove,
  chooseAiMove,
  createEmptyBoard,
  createInitialBoard,
  evaluateStatus,
  generateLegalMoves,
  legalDestinationsFrom,
  opposite,
} from "@/lib/engine";
import { playSfx } from "@/lib/sfx";

export const TIME_CONTROLS: readonly TimeControl[] = [
  { label: "Bullet 1+0", baseSeconds: 60, incrementSeconds: 0, category: "bullet" },
  { label: "Bullet 2+1", baseSeconds: 120, incrementSeconds: 1, category: "bullet" },
  { label: "Blitz 3+0", baseSeconds: 180, incrementSeconds: 0, category: "blitz" },
  { label: "Blitz 5+3", baseSeconds: 300, incrementSeconds: 3, category: "blitz" },
  { label: "Rapid 10+0", baseSeconds: 600, incrementSeconds: 0, category: "rapid" },
  { label: "Untimed", baseSeconds: 0, incrementSeconds: 0, category: "untimed" },
];

export const BOT_PERSONAS: readonly BotPersona[] = [
  { id: "lina", name: "Lina the Learner", elo: 700, depth: 1, aggression: 0.2, errorRate: 0.45, tagline: "Friendly and forgiving." },
  { id: "marco", name: "Marco the Methodical", elo: 1100, depth: 2, aggression: 0.3, errorRate: 0.25, tagline: "Patient and positional." },
  { id: "rook", name: "Rook the Raider", elo: 1400, depth: 3, aggression: 0.8, errorRate: 0.15, tagline: "Loves trading pieces." },
  { id: "zara", name: "Zara the Surgeon", elo: 1700, depth: 4, aggression: 0.5, errorRate: 0.06, tagline: "Precise tactical eye." },
  { id: "ivar", name: "Ivar the Iron", elo: 1950, depth: 5, aggression: 0.6, errorRate: 0.02, tagline: "Solid and stubborn." },
  { id: "nyx", name: "Nyx the Nightmare", elo: 2200, depth: 6, aggression: 0.7, errorRate: 0.0, tagline: "Show no mercy." },
];

interface ClockState {
  readonly white: number; // seconds remaining
  readonly black: number;
}

export interface GameSnapshot {
  readonly board: Board;
  readonly toMove: PieceColor;
}

interface GameState {
  // Setup
  variant: Variant;
  timeControl: TimeControl;
  vsBot: BotPersona | null;
  // Live state
  board: Board;
  toMove: PieceColor;
  status: GameStatus;
  selected: Coord | null;
  legalMovesCache: readonly Move[];
  history: readonly AnnotatedMove[];
  snapshots: readonly GameSnapshot[]; // for undo (one per move, pre-state)
  clock: ClockState;
  lastTick: number | null; // epoch ms of last tick
  showHints: boolean;
  // Actions
  newGame: (params: { variant?: Variant; timeControl?: TimeControl; vsBot?: BotPersona | null }) => void;
  selectSquare: (coord: Coord) => void;
  attemptMove: (to: Coord) => boolean;
  tick: () => void;
  toggleHints: () => void;
  undo: () => void;
  resign: (color: PieceColor) => void;
  triggerBotIfNeeded: () => void;
  // Sandbox-only actions
  sandboxPlace: (coord: Coord, piece: Piece | null) => void;
  sandboxClear: () => void;
  sandboxReset: () => void;
}

function freshClock(tc: TimeControl): ClockState {
  return { white: tc.baseSeconds, black: tc.baseSeconds };
}

const DEFAULT_TC: TimeControl = TIME_CONTROLS[3]; // Blitz 5+3
const DEFAULT_VARIANT: Variant = "american";

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      variant: DEFAULT_VARIANT,
      timeControl: DEFAULT_TC,
      vsBot: null,
      board: createInitialBoard(),
      toMove: "white",
      status: "active",
      selected: null,
      legalMovesCache: generateLegalMoves(createInitialBoard(), "white", DEFAULT_VARIANT),
      history: [],
      snapshots: [],
      clock: freshClock(DEFAULT_TC),
      lastTick: null,
      showHints: true,

      newGame: ({ variant, timeControl, vsBot }) => {
        const v = variant ?? get().variant;
        const tc = timeControl ?? get().timeControl;
        const board = createInitialBoard();
        set({
          variant: v,
          timeControl: tc,
          vsBot: vsBot ?? null,
          board,
          toMove: "white",
          status: "active",
          selected: null,
          legalMovesCache: generateLegalMoves(board, "white", v),
          history: [],
          snapshots: [],
          clock: freshClock(tc),
          lastTick: tc.baseSeconds > 0 ? Date.now() : null,
        });
      },

      selectSquare: (coord) => {
        const { board, toMove, selected, legalMovesCache } = get();
        const piece = board[coord.row][coord.col];

        // If clicking own piece, select it (or toggle off).
        if (piece && piece.color === toMove) {
          if (selected && selected.row === coord.row && selected.col === coord.col) {
            set({ selected: null });
          } else {
            set({ selected: coord });
          }
          return;
        }

        // If a piece is selected and this is a legal destination, attempt move.
        if (selected) {
          const destinations = legalDestinationsFrom(legalMovesCache, selected);
          const target = destinations.find(
            (m) => m.to.row === coord.row && m.to.col === coord.col
          );
          if (target) {
            performMove(target, set, get);
            return;
          }
        }
        set({ selected: null });
      },

      attemptMove: (to) => {
        const { selected, legalMovesCache } = get();
        if (!selected) return false;
        const destinations = legalDestinationsFrom(legalMovesCache, selected);
        const target = destinations.find(
          (m) => m.to.row === to.row && m.to.col === to.col
        );
        if (!target) return false;
        performMove(target, set, get);
        return true;
      },

      tick: () => {
        const { status, toMove, clock, lastTick, timeControl } = get();
        if (status !== "active" || timeControl.baseSeconds === 0) return;
        const now = Date.now();
        if (lastTick === null) {
          set({ lastTick: now });
          return;
        }
        const elapsed = (now - lastTick) / 1000;
        const remaining = clock[toMove] - elapsed;
        if (remaining <= 0) {
          set({
            clock: { ...clock, [toMove]: 0 },
            status: toMove === "white" ? "black-wins" : "white-wins",
            lastTick: null,
          });
          return;
        }
        set({
          clock: { ...clock, [toMove]: remaining },
          lastTick: now,
        });
      },

      toggleHints: () => set((s) => ({ showHints: !s.showHints })),

      undo: () => {
        const { snapshots, history } = get();
        if (snapshots.length === 0) return;
        const target = snapshots[snapshots.length - 1];
        const newHistory = history.slice(0, -1);
        set({
          board: target.board,
          toMove: target.toMove,
          status: "active",
          selected: null,
          legalMovesCache: generateLegalMoves(target.board, target.toMove, get().variant),
          history: newHistory,
          snapshots: snapshots.slice(0, -1),
        });
      },

      resign: (color) => {
        set({
          status: color === "white" ? "black-wins" : "white-wins",
          lastTick: null,
        });
      },

      triggerBotIfNeeded: () => {
        const { vsBot, toMove, status, board, variant } = get();
        if (!vsBot || status !== "active") return;
        if (toMove !== "black") return; // Bot always plays black for now
        // Defer to next tick so UI can render the human's move first.
        setTimeout(() => {
          const fresh = get();
          if (fresh.status !== "active" || fresh.toMove !== "black") return;
          const move = chooseAiMove(fresh.board, "black", fresh.variant, {
            depth: vsBot.depth,
            aggression: vsBot.aggression,
            errorRate: vsBot.errorRate,
          });
          if (!move) return;
          performMove(move, set, get);
        }, 350);
        void board;
        void variant;
      },

      sandboxPlace: (coord, piece) => {
        const { board, variant, toMove } = get();
        // Only allow placing on dark squares (engine rule), and only in sandbox mode.
        if (variant !== "sandbox") return;
        if ((coord.row + coord.col) % 2 === 0) return;
        const next: Board = board.map((row) => row.slice());
        next[coord.row][coord.col] = piece;
        set({
          board: next,
          legalMovesCache: generateLegalMoves(next, toMove, "sandbox"),
          selected: null,
        });
      },

      sandboxClear: () => {
        if (get().variant !== "sandbox") return;
        const empty = createEmptyBoard();
        set({
          board: empty,
          toMove: "white",
          legalMovesCache: generateLegalMoves(empty, "white", "sandbox"),
          history: [],
          snapshots: [],
          selected: null,
          status: "active",
        });
      },

      sandboxReset: () => {
        if (get().variant !== "sandbox") return;
        const init = createInitialBoard();
        set({
          board: init,
          toMove: "white",
          legalMovesCache: generateLegalMoves(init, "white", "sandbox"),
          history: [],
          snapshots: [],
          selected: null,
          status: "active",
        });
      },
    }),
    {
      name: "zugzwang-game-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : dummyStorage)),
      partialize: (state) => ({
        variant: state.variant,
        timeControl: state.timeControl,
        board: state.board,
        toMove: state.toMove,
        status: state.status,
        history: state.history,
        snapshots: state.snapshots,
        clock: state.clock,
        showHints: state.showHints,
        vsBot: state.vsBot,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Recompute the legal-move cache for the rehydrated board.
        state.legalMovesCache = generateLegalMoves(state.board, state.toMove, state.variant);
        state.selected = null;
        state.lastTick = state.timeControl.baseSeconds > 0 ? Date.now() : null;
      },
    }
  )
);

const dummyStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

function performMove(
  move: Move,
  set: (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void,
  get: () => GameState
): void {
  const prev = get();
  const snapshot: GameSnapshot = { board: prev.board, toMove: prev.toMove };
  const newBoard = applyMove(prev.board, move);
  const newToMove = opposite(prev.toMove);
  const status = evaluateStatus(newBoard, newToMove, prev.variant);
  const annotated: AnnotatedMove = { move, color: prev.toMove };
  // Apply increment to the side that just moved.
  const inc = prev.timeControl.incrementSeconds;
  const newClock: ClockState =
    prev.timeControl.baseSeconds > 0
      ? { ...prev.clock, [prev.toMove]: prev.clock[prev.toMove] + inc }
      : prev.clock;
  set({
    board: newBoard,
    toMove: newToMove,
    status,
    selected: null,
    legalMovesCache: status === "active" ? generateLegalMoves(newBoard, newToMove, prev.variant) : [],
    history: [...prev.history, annotated],
    snapshots: [...prev.snapshots, snapshot],
    clock: newClock,
    lastTick: status === "active" && prev.timeControl.baseSeconds > 0 ? Date.now() : null,
  });
  // Kick the bot if applicable.
  if (status === "active") {
    get().triggerBotIfNeeded();
  }
  // SFX cue — captures get the snap, promotions the bell, terminal the fanfare.
  const terminal = status === "white-wins" || status === "black-wins";
  if (terminal) {
    const won =
      (status === "white-wins" && prev.toMove === "white") ||
      (status === "black-wins" && prev.toMove === "black");
    playSfx(won ? "win" : "lose");
  } else if (move.promotes) {
    playSfx("promote");
  } else if (move.captures.length > 0) {
    playSfx("capture");
  } else {
    playSfx("move");
  }
  // Badge auto-unlock for moves made by the human (always white in single-player).
  if (prev.toMove === "white" && typeof window !== "undefined") {
    // Lazy import to avoid a circular module dependency between the two stores.
    void import("@/store/useAuthStore").then(({ useAuthStore }) => {
      useAuthStore.getState().reportMoveOutcome({
        captures: move.captures.length,
        promoted: move.promotes,
        variant: prev.variant,
        didWin: status === "white-wins",
        boardClearedOpponent: status === "white-wins" && prev.variant !== "giveaway",
      });
    });
  }
}
