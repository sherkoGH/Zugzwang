// lib/pdn.ts — Portable Draughts Notation encoder.
// Dark-square numbering: 1 = top-right dark square, 32 = bottom-left dark square,
// numbered left-to-right within each row, rows top to bottom (standard PDN convention).
import type { AnnotatedMove, Move } from "@/types/game";

/** Map (row, col) → PDN square number (1..32) or null if light square. */
export function squareNumber(row: number, col: number): number | null {
  if ((row + col) % 2 === 0) return null; // light squares are never numbered
  // Within a row, dark squares come at cols 1,3,5,7 (rows 0,2,4,6) or 0,2,4,6 (rows 1,3,5,7).
  // PDN numbers each row left-to-right.
  const idxInRow = Math.floor(col / 2); // 0..3
  return row * 4 + idxInRow + 1;
}

/** Coordinate notation fallback for non-standard boards (sandbox etc). */
function coord(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

/** Encode a single move as a PDN token, e.g. "11-15" or "11x18x25" for multi-jumps. */
export function moveToPdn(move: Move): string {
  const sep = move.captures.length > 0 ? "x" : "-";
  const nums = move.path.map((p) => squareNumber(p.row, p.col));
  // If any square is light (shouldn't happen in standard play but possible in sandbox),
  // fall back to algebraic coords for readability.
  if (nums.some((n) => n === null)) {
    return move.path.map((p) => coord(p.row, p.col)).join(sep);
  }
  return (nums as number[]).join(sep);
}

/** Encode a full game as a PDN move list: "1. 11-15 23-19  2. 8-11 22-17 ..." */
export function gameToPdn(history: readonly AnnotatedMove[]): string {
  const parts: string[] = [];
  for (let i = 0; i < history.length; i += 2) {
    const turn = i / 2 + 1;
    const white = moveToPdn(history[i].move);
    const black = history[i + 1] ? moveToPdn(history[i + 1].move) : "";
    parts.push(black ? `${turn}. ${white} ${black}` : `${turn}. ${white}`);
  }
  return parts.join("  ");
}
