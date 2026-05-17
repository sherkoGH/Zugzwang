"use client";

import { useMemo } from "react";
import type { Board, Coord, Move, PieceColor } from "@/types/game";
import { isDarkSquare, legalDestinationsFrom, coordsEqual } from "@/lib/engine";

interface CheckersBoardProps {
  readonly board: Board;
  readonly selected: Coord | null;
  readonly legalMoves: readonly Move[];
  readonly lastMove: Move | null;
  readonly showHints: boolean;
  readonly orientation: PieceColor;
  readonly disabled?: boolean;
  readonly onSquareClick: (coord: Coord) => void;
}

export function CheckersBoard({
  board,
  selected,
  legalMoves,
  lastMove,
  showHints,
  orientation,
  disabled = false,
  onSquareClick,
}: CheckersBoardProps) {
  const destinations = useMemo(
    () => (selected ? legalDestinationsFrom(legalMoves, selected) : []),
    [selected, legalMoves]
  );

  const rowOrder = useMemo(
    () => (orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]),
    [orientation]
  );
  const colOrder = useMemo(
    () => (orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]),
    [orientation]
  );

  return (
    <div
      className={[
        "relative grid w-full select-none overflow-hidden rounded-lg border border-earth-line shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]",
        disabled ? "pointer-events-none opacity-90" : "",
      ].join(" ")}
      style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))", aspectRatio: "1 / 1" }}
      role="grid"
      aria-label="Checkers board"
    >
      {rowOrder.map((row) =>
        colOrder.map((col) => {
          const dark = isDarkSquare(row, col);
          const piece = board[row][col];
          const isSelected = selected !== null && selected.row === row && selected.col === col;
          const dest = destinations.find((m) => m.to.row === row && m.to.col === col);
          const isLastMoveSquare =
            lastMove !== null &&
            (coordsEqual(lastMove.from, { row, col }) || coordsEqual(lastMove.to, { row, col }));

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              role="gridcell"
              aria-label={`Square ${String.fromCharCode(97 + col)}${8 - row}`}
              onClick={() => onSquareClick({ row, col })}
              className={[
                "relative flex items-center justify-center outline-none",
                dark ? "bg-board-dark" : "bg-board-light",
                isSelected ? "ring-2 ring-inset ring-board-highlight" : "",
                isLastMoveSquare && !isSelected ? "ring-2 ring-inset ring-board-lastmove/70" : "",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
              ].join(" ")}
            >
              {/* Rank label (a-file only) */}
              {col === (orientation === "white" ? 0 : 7) && (
                <span
                  className={[
                    "absolute left-1 top-0.5 text-[10px] font-semibold",
                    dark ? "text-board-light/70" : "text-board-dark/70",
                  ].join(" ")}
                >
                  {8 - row}
                </span>
              )}
              {/* File label (bottom row only) */}
              {row === (orientation === "white" ? 7 : 0) && (
                <span
                  className={[
                    "absolute bottom-0.5 right-1 text-[10px] font-semibold",
                    dark ? "text-board-light/70" : "text-board-dark/70",
                  ].join(" ")}
                >
                  {String.fromCharCode(97 + col)}
                </span>
              )}

              {piece && <PieceVisual color={piece.color} kind={piece.kind} />}

              {showHints && dest && !piece && (
                <span className="pointer-events-none absolute h-[28%] w-[28%] rounded-full bg-board-highlight/50 shadow-[0_0_0_4px_rgba(246,246,105,0.25)]" />
              )}
              {showHints && dest && piece && (
                <span className="pointer-events-none absolute inset-[6%] rounded-full ring-4 ring-board-highlight/70" />
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

function PieceVisual({ color, kind }: { color: PieceColor; kind: "man" | "king" }) {
  const base =
    color === "white"
      ? "bg-gradient-to-b from-[#fafaf6] to-[#d8d8c8] border-[#9a9a85]"
      : "bg-gradient-to-b from-[#3a3936] to-[#1a1a18] border-black";
  return (
    <span
      className={[
        "relative flex h-[78%] w-[78%] items-center justify-center rounded-full border-2 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.45)]",
        base,
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-[12%] rounded-full ring-1 ring-inset",
          color === "white" ? "ring-[#bdbda7]/80" : "ring-[#4a4946]/80",
        ].join(" ")}
      />
      {kind === "king" && (
        <span
          className={[
            "relative text-[clamp(10px,2.4vw,22px)] font-bold leading-none",
            color === "white" ? "text-[#7b6a2e]" : "text-[#d2b748]",
          ].join(" ")}
          aria-label="King"
        >
          ♛
        </span>
      )}
    </span>
  );
}
