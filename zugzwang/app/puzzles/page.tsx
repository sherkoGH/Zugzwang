"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckersBoard } from "@/components/game/CheckersBoard";
import { DAILY_PUZZLES, MASTER_PUZZLE, useAuthStore } from "@/store/useAuthStore";
import { applyMove, findMoveTo, generateLegalMoves } from "@/lib/engine";
import type { Board, Coord, Move, PieceColor, Puzzle } from "@/types/game";

export default function PuzzlesPage() {
  const all: readonly Puzzle[] = useMemo(() => [...DAILY_PUZZLES, MASTER_PUZZLE], []);
  const [activeId, setActiveId] = useState<string>(all[0].id);
  const active = all.find((p) => p.id === activeId) ?? all[0];
  const streak = useAuthStore((s) => s.puzzleStreak);
  const today = new Date().toISOString().slice(0, 10);
  const solvedToday = streak.lastSolvedDate === today;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tightest">Daily Puzzles</h1>
        <p className="mt-1 text-sm text-muted">
          Three rated tactics and one master puzzle. Find the best move for the side to play.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <PuzzleBoard puzzle={active} />
        <aside className="space-y-3">
          <div className="rounded-lg border border-earth-line bg-earth-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Streak
            </h2>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold tracking-tightest text-accent">
                {streak.current}
                <span className="ml-1 text-base text-muted">🔥</span>
              </div>
              <div className="flex-1 text-xs text-muted">
                {solvedToday
                  ? `Streak active. Longest: ${streak.longest} day${streak.longest === 1 ? "" : "s"}.`
                  : "Solve any tactic today to extend your streak. Resets at midnight."}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-earth-line bg-earth-card">
            <header className="border-b border-earth-line px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Today
              </h2>
            </header>
            <ul className="divide-y divide-earth-line">
              {all.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className={[
                      "flex w-full items-center justify-between px-4 py-3 text-left outline-none duration-150 ease-out",
                      "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                      p.id === activeId ? "bg-earth-hover" : "hover:bg-earth-hover",
                    ].join(" ")}
                  >
                    <span className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold">
                        {p.title}
                        {p.isMaster && (
                          <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                            Master
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                        {p.variant}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-accent">★ {p.rating}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PuzzleBoard({ puzzle }: { puzzle: Puzzle }) {
  const [board, setBoard] = useState<Board>(puzzle.board);
  const [toMove, setToMove] = useState<PieceColor>(puzzle.toMove);
  const [selected, setSelected] = useState<Coord | null>(null);
  const [history, setHistory] = useState<readonly Move[]>([]);
  const [solved, setSolved] = useState(false);
  const recordPuzzleSolved = useAuthStore((s) => s.recordPuzzleSolved);

  useEffect(() => {
    setBoard(puzzle.board);
    setToMove(puzzle.toMove);
    setSelected(null);
    setHistory([]);
    setSolved(false);
  }, [puzzle]);

  const legalMoves = useMemo(
    () => generateLegalMoves(board, toMove, puzzle.variant),
    [board, toMove, puzzle.variant]
  );

  const onSquareClick = (coord: Coord) => {
    const piece = board[coord.row][coord.col];
    if (piece && piece.color === toMove) {
      setSelected(coord);
      return;
    }
    if (selected) {
      const move = findMoveTo(legalMoves, selected, coord);
      if (move) {
        setBoard(applyMove(board, move));
        setToMove(toMove === "white" ? "black" : "white");
        setHistory([...history, move]);
        setSelected(null);
        // Heuristic: a successful capture on the side-to-move counts as solving.
        // (Real puzzles would compare against puzzle.solution, but the demo
        // puzzles have empty solution arrays.)
        if (!solved && move.captures.length > 0) {
          setSolved(true);
          recordPuzzleSolved(puzzle.id, puzzle.isMaster ? 15 : 8);
        }
        return;
      }
    }
    setSelected(null);
  };

  const reset = () => {
    setBoard(puzzle.board);
    setToMove(puzzle.toMove);
    setSelected(null);
    setHistory([]);
    setSolved(false);
  };

  const hasCapture = legalMoves.some((m) => m.captures.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-earth-line bg-earth-card px-4 py-2.5">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">
            {puzzle.title}
            {solved && (
              <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                ✓ Solved
              </span>
            )}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {puzzle.toMove === "white" ? "White to move" : "Black to move"}
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-earth-line px-3 py-1.5 text-xs font-semibold outline-none duration-150 ease-out hover:bg-earth-hover focus-visible:ring-2 focus-visible:ring-accent"
        >
          Reset
        </button>
      </div>
      <CheckersBoard
        board={board}
        selected={selected}
        legalMoves={legalMoves}
        lastMove={history.length > 0 ? history[history.length - 1] : null}
        showHints
        orientation="white"
        onSquareClick={onSquareClick}
      />
      <div className="rounded-lg border border-earth-line bg-earth-card p-4">
        <p className="text-xs text-muted">
          <span className="font-semibold text-ivory">Hint:</span>{" "}
          {puzzle.isMaster
            ? "Look for a chain capture that wins material in the middle of the board."
            : "There's a forced capture that gains the upper hand."}
        </p>
        {hasCapture && (
          <p className="mt-2 text-xs text-accent">
            ⚡ Captures available — they&apos;re mandatory.
          </p>
        )}
      </div>
    </div>
  );
}
