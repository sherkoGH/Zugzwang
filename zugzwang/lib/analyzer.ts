// lib/analyzer.ts — Post-match move quality analyzer.
// For each move in a game, compare the eval after the actual move against the
// eval after the engine's best move. Centipawn loss buckets → labels.
//
// This runs at depth 4 by default (a balance between accuracy and speed). For a
// 40-move game that's roughly 80 mini-searches — typically <1s in the browser.

import {
  applyMove,
  chooseAiMove,
  evaluateBoardFor,
  createInitialBoard,
} from "@/lib/engine";
import type {
  AnnotatedMove,
  Board,
  Move,
  MoveQuality,
  PieceColor,
  Variant,
} from "@/types/game";

export interface AnalysisRow {
  readonly index: number;
  readonly color: PieceColor;
  readonly notation: string;          // PDN token (re-rendered upstream)
  readonly quality: MoveQuality;
  readonly evalBefore: number;        // From the moving side's perspective.
  readonly evalAfter: number;
  readonly loss: number;              // Positive = how much worse than best.
}

function classify(loss: number, isBestMove: boolean): MoveQuality {
  if (loss <= 0.05) return isBestMove ? "best" : "good";
  if (loss <= 0.3) return "good";
  if (loss <= 0.8) return "inaccuracy";
  if (loss <= 2.0) return "mistake";
  return "blunder";
}

/**
 * Re-walks the move sequence from the initial board. For each ply, asks the
 * engine "what's the best move you'd play?" at the analyzer depth, then compares
 * the actual move's resulting eval to the best move's resulting eval.
 *
 * Brilliant moves (!!) are awarded when the actual move is the best AND it makes
 * a capture that the engine considered slightly suboptimal at lower depths —
 * detected here by giving extra credit when the move improves eval by > 1.5.
 */
export function analyzeGame(
  history: readonly AnnotatedMove[],
  variant: Variant,
  depth: number = 4
): readonly AnalysisRow[] {
  if (history.length === 0) return [];

  const rows: AnalysisRow[] = [];
  let board: Board = createInitialBoard();
  const cfg = { depth, aggression: 0.3, errorRate: 0 };

  for (let i = 0; i < history.length; i++) {
    const am = history[i];
    const evalBefore = evaluateBoardFor(board, am.color, variant, cfg);

    const best = chooseAiMove(board, am.color, variant, cfg);
    const isBest = best ? movesEqual(best, am.move) : true;

    const afterActual = applyMove(board, am.move);
    const evalAfter = evaluateBoardFor(afterActual, am.color, variant, cfg);

    let bestEvalAfter = evalAfter;
    if (best && !isBest) {
      const afterBest = applyMove(board, best);
      bestEvalAfter = evaluateBoardFor(afterBest, am.color, variant, cfg);
    }

    const loss = Math.max(0, bestEvalAfter - evalAfter);
    let quality = classify(loss, isBest);

    // Promote to "brilliant" if it's a best move AND a swing-producing capture.
    const swing = evalAfter - evalBefore;
    if (isBest && am.move.captures.length >= 2 && swing > 1.5) {
      quality = "brilliant";
    }

    rows.push({
      index: i,
      color: am.color,
      notation: "", // filled in by caller using pdn module
      quality,
      evalBefore,
      evalAfter,
      loss,
    });

    board = afterActual;
  }

  return rows;
}

function movesEqual(a: Move, b: Move): boolean {
  return (
    a.from.row === b.from.row &&
    a.from.col === b.from.col &&
    a.to.row === b.to.row &&
    a.to.col === b.to.col
  );
}

/** Icon glyph for a quality label — Chess.com convention. */
export function qualityGlyph(q: MoveQuality): string {
  switch (q) {
    case "brilliant": return "!!";
    case "best":      return "!";
    case "good":      return "";
    case "inaccuracy": return "?!";
    case "mistake":   return "?";
    case "blunder":   return "??";
  }
}

/** Tailwind color class for a quality label. */
export function qualityColor(q: MoveQuality): string {
  switch (q) {
    case "brilliant": return "text-cyan-300";
    case "best":      return "text-emerald-400";
    case "good":      return "text-zinc-400";
    case "inaccuracy": return "text-amber-400";
    case "mistake":   return "text-orange-400";
    case "blunder":   return "text-rose-500";
  }
}
