// lib/engine.ts — Pure functions for board state, move generation, and rule enforcement.
// No React, no Zustand here — keeping this isolated lets us unit-test and reuse it on the server.

import type {
  Board,
  Coord,
  Move,
  Piece,
  PieceColor,
  Square,
  Variant,
  GameStatus,
} from "@/types/game";

export const BOARD_SIZE = 8;

/** Dark-square check (only dark squares are playable in checkers). */
export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function coordKey(c: Coord): string {
  return `${c.row},${c.col}`;
}

export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Builds the standard starting position (12 pieces per side on dark squares). */
export function createInitialBoard(): Board {
  const board: Square[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as Square)
  );
  let idCounter = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!isDarkSquare(row, col)) continue;
      if (row < 3) {
        board[row][col] = { id: `b${idCounter++}`, color: "black", kind: "man" };
      } else if (row > 4) {
        board[row][col] = { id: `w${idCounter++}`, color: "white", kind: "man" };
      }
    }
  }
  return board;
}

/** Empty board for sandbox/puzzle composition. */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null as Square)
  ) as Board;
}

/** Deep-ish clone (board rows -> mutable arrays). */
function cloneBoard(board: Board): Square[][] {
  return board.map((row) => [...row]);
}

/** White moves "up" (toward row 0); black moves "down" (toward row 7). */
function forwardDirs(color: PieceColor): readonly number[] {
  return color === "white" ? [-1] : [1];
}

const ALL_DIAG_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/** Promotion row check. */
function isPromotionRow(color: PieceColor, row: number): boolean {
  return color === "white" ? row === 0 : row === BOARD_SIZE - 1;
}

// ---------------------------------------------------------------------------
// MOVE GENERATION
// ---------------------------------------------------------------------------

/**
 * Generate all legal moves for the side to move under the given variant.
 * Honors forced captures (mandatory in American/Russian/Giveaway).
 */
export function generateLegalMoves(
  board: Board,
  toMove: PieceColor,
  variant: Variant
): readonly Move[] {
  if (variant === "sandbox") {
    return generateSandboxMoves(board, toMove);
  }

  const captures: Move[] = [];
  const quietMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== toMove) continue;
      const origin: Coord = { row, col };
      const pieceCaptures = generateCapturesFor(board, origin, piece, variant);
      if (pieceCaptures.length > 0) {
        captures.push(...pieceCaptures);
      } else {
        quietMoves.push(...generateQuietMovesFor(board, origin, piece, variant));
      }
    }
  }

  // Mandatory captures: if any capture exists, only captures are legal.
  if (captures.length === 0) return quietMoves;

  // American & Russian: "majority capture" is NOT enforced in the standard ruleset
  // we're shipping — any capture sequence is legal. (Giveaway behaves the same:
  // captures are mandatory, but the player picks which sequence.)
  return captures;
}

/** Sandbox mode: any piece can move to any empty dark square. */
function generateSandboxMoves(board: Board, toMove: PieceColor): readonly Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== toMove) continue;
      for (let r2 = 0; r2 < BOARD_SIZE; r2++) {
        for (let c2 = 0; c2 < BOARD_SIZE; c2++) {
          if (!isDarkSquare(r2, c2)) continue;
          if (board[r2][c2] !== null) continue;
          if (r2 === row && c2 === col) continue;
          moves.push({
            from: { row, col },
            to: { row: r2, col: c2 },
            captures: [],
            path: [{ row, col }, { row: r2, col: c2 }],
            promotes: piece.kind === "man" && isPromotionRow(piece.color, r2),
          });
        }
      }
    }
  }
  return moves;
}

function generateQuietMovesFor(
  board: Board,
  origin: Coord,
  piece: Piece,
  variant: Variant
): readonly Move[] {
  const moves: Move[] = [];

  if (piece.kind === "man") {
    // Men move one diagonal step forward only.
    for (const dr of forwardDirs(piece.color)) {
      for (const dc of [-1, 1] as const) {
        const nr = origin.row + dr;
        const nc = origin.col + dc;
        if (!inBounds(nr, nc)) continue;
        if (board[nr][nc] !== null) continue;
        moves.push({
          from: origin,
          to: { row: nr, col: nc },
          captures: [],
          path: [origin, { row: nr, col: nc }],
          promotes: isPromotionRow(piece.color, nr),
        });
      }
    }
    return moves;
  }

  // Kings.
  if (variant === "russian") {
    // Flying king: slides any distance along a clear diagonal.
    for (const [dr, dc] of ALL_DIAG_DIRS) {
      let r = origin.row + dr;
      let c = origin.col + dc;
      while (inBounds(r, c) && board[r][c] === null) {
        moves.push({
          from: origin,
          to: { row: r, col: c },
          captures: [],
          path: [origin, { row: r, col: c }],
          promotes: false,
        });
        r += dr;
        c += dc;
      }
    }
  } else {
    // American/Giveaway king: one step in any diagonal direction.
    for (const [dr, dc] of ALL_DIAG_DIRS) {
      const nr = origin.row + dr;
      const nc = origin.col + dc;
      if (!inBounds(nr, nc) || board[nr][nc] !== null) continue;
      moves.push({
        from: origin,
        to: { row: nr, col: nc },
        captures: [],
        path: [origin, { row: nr, col: nc }],
        promotes: false,
      });
    }
  }
  return moves;
}

/**
 * Recursive multi-jump expansion. Returns all maximal capture sequences for
 * the piece at `origin`. Handles men, short-range kings (American/Giveaway),
 * and flying kings (Russian) including mid-sequence promotion in Russian.
 */
function generateCapturesFor(
  board: Board,
  origin: Coord,
  piece: Piece,
  variant: Variant
): readonly Move[] {
  const results: Move[] = [];
  exploreCaptureChain(
    board,
    origin,
    piece,
    variant,
    [origin],
    [],
    piece.kind,
    results
  );
  return results;
}

function exploreCaptureChain(
  board: Board,
  origin: Coord,
  piece: Piece,
  variant: Variant,
  pathSoFar: readonly Coord[],
  capturesSoFar: readonly Coord[],
  currentKind: "man" | "king",
  out: Move[]
): void {
  const current = pathSoFar[pathSoFar.length - 1];
  const directCaptures = nextCaptureSteps(
    board,
    current,
    piece.color,
    currentKind,
    variant,
    capturesSoFar
  );

  if (directCaptures.length === 0) {
    if (capturesSoFar.length > 0) {
      const endRow = current.row;
      const startedAsMan = piece.kind === "man";
      const promotedAlongPath =
        startedAsMan &&
        (currentKind === "king" || isPromotionRow(piece.color, endRow));
      out.push({
        from: pathSoFar[0],
        to: current,
        captures: capturesSoFar,
        path: pathSoFar,
        promotes: promotedAlongPath,
      });
    }
    return;
  }

  for (const step of directCaptures) {
    // Russian: mid-jump promotion grants flying king for subsequent jumps.
    let nextKind: "man" | "king" = currentKind;
    if (
      piece.kind === "man" &&
      currentKind === "man" &&
      variant === "russian" &&
      isPromotionRow(piece.color, step.landing.row)
    ) {
      nextKind = "king";
    }
    // American: if a man reaches the promotion row during a jump, the turn ends
    // (no further jumps as a king from the promotion square).
    const americanPromotionStop =
      piece.kind === "man" &&
      variant !== "russian" &&
      isPromotionRow(piece.color, step.landing.row);

    if (americanPromotionStop) {
      out.push({
        from: pathSoFar[0],
        to: step.landing,
        captures: [...capturesSoFar, step.captured],
        path: [...pathSoFar, step.landing],
        promotes: true,
      });
      continue;
    }

    exploreCaptureChain(
      board,
      origin,
      piece,
      variant,
      [...pathSoFar, step.landing],
      [...capturesSoFar, step.captured],
      nextKind,
      out
    );
  }
}

interface CaptureStep {
  readonly captured: Coord;
  readonly landing: Coord;
}

/** All immediate single-capture steps available from `from`. */
function nextCaptureSteps(
  board: Board,
  from: Coord,
  color: PieceColor,
  kind: "man" | "king",
  variant: Variant,
  alreadyCaptured: readonly Coord[]
): readonly CaptureStep[] {
  const steps: CaptureStep[] = [];
  const capturedSet = new Set(alreadyCaptured.map(coordKey));

  // Men capture backward too in Russian & Giveaway; forward-only in American.
  const canJumpBackward = kind === "king" || variant !== "american";
  const dirs: readonly (readonly [number, number])[] = canJumpBackward
    ? ALL_DIAG_DIRS
    : forwardDirs(color).flatMap((dr) => [[dr, -1] as const, [dr, 1] as const]);

  const flying = kind === "king" && variant === "russian";

  for (const [dr, dc] of dirs) {
    if (flying) {
      // Slide forward until we hit an enemy, then land on any empty square beyond.
      let r = from.row + dr;
      let c = from.col + dc;
      // Skip empty squares.
      while (inBounds(r, c) && board[r][c] === null) {
        r += dr;
        c += dc;
      }
      if (!inBounds(r, c)) continue;
      const target = board[r][c];
      if (!target || target.color === color) continue;
      const enemyCoord: Coord = { row: r, col: c };
      if (capturedSet.has(coordKey(enemyCoord))) continue;
      // Land on any empty square strictly beyond.
      let lr = r + dr;
      let lc = c + dc;
      while (inBounds(lr, lc) && board[lr][lc] === null) {
        steps.push({ captured: enemyCoord, landing: { row: lr, col: lc } });
        lr += dr;
        lc += dc;
      }
      // If we hit another piece beyond, we can't jump through it.
    } else {
      // Short-range jump: enemy on adjacent diagonal, empty square just beyond.
      const enemyR = from.row + dr;
      const enemyC = from.col + dc;
      const landR = from.row + 2 * dr;
      const landC = from.col + 2 * dc;
      if (!inBounds(enemyR, enemyC) || !inBounds(landR, landC)) continue;
      const enemy = board[enemyR][enemyC];
      if (!enemy || enemy.color === color) continue;
      const enemyCoord: Coord = { row: enemyR, col: enemyC };
      if (capturedSet.has(coordKey(enemyCoord))) continue;
      if (board[landR][landC] !== null) continue;
      steps.push({ captured: enemyCoord, landing: { row: landR, col: landC } });
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// APPLY A MOVE
// ---------------------------------------------------------------------------

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const moving = next[move.from.row][move.from.col];
  if (!moving) return board;
  next[move.from.row][move.from.col] = null;
  for (const cap of move.captures) {
    next[cap.row][cap.col] = null;
  }
  const finalKind: "man" | "king" = move.promotes ? "king" : moving.kind;
  next[move.to.row][move.to.col] = { ...moving, kind: finalKind };
  return next;
}

// ---------------------------------------------------------------------------
// GAME-END DETERMINATION
// ---------------------------------------------------------------------------

export function evaluateStatus(
  board: Board,
  toMove: PieceColor,
  variant: Variant
): GameStatus {
  const moves = generateLegalMoves(board, toMove, variant);
  const sideHasPieces = boardHasPiecesOf(board, toMove);

  if (variant === "giveaway") {
    // Win condition: the side to move has no pieces OR no legal moves.
    if (!sideHasPieces || moves.length === 0) {
      return toMove === "white" ? "white-wins" : "black-wins";
    }
    return "active";
  }

  if (variant === "sandbox") {
    return "active";
  }

  // Standard rules: side to move loses if they have no legal moves or no pieces.
  if (!sideHasPieces || moves.length === 0) {
    return toMove === "white" ? "black-wins" : "white-wins";
  }
  return "active";
}

function boardHasPiecesOf(board: Board, color: PieceColor): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p && p.color === color) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// AI: simple alpha-beta with a configurable persona
// ---------------------------------------------------------------------------

export interface AiConfig {
  readonly depth: number;
  readonly aggression: number;
  readonly errorRate: number;
}

export function chooseAiMove(
  board: Board,
  toMove: PieceColor,
  variant: Variant,
  cfg: AiConfig,
  rng: () => number = Math.random
): Move | null {
  const moves = generateLegalMoves(board, toMove, variant);
  if (moves.length === 0) return null;

  // Random "blunder" injection scaled by errorRate.
  if (rng() < cfg.errorRate) {
    return moves[Math.floor(rng() * moves.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  for (const move of moves) {
    const score = -negamax(
      applyMove(board, move),
      opposite(toMove),
      variant,
      cfg.depth - 1,
      -Infinity,
      Infinity,
      cfg
    );
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(rng() * bestMoves.length)];
}

/**
 * Standard negamax with alpha-beta. Returns the score from `toMove`'s POV.
 */
function negamax(
  board: Board,
  toMove: PieceColor,
  variant: Variant,
  depth: number,
  alpha: number,
  beta: number,
  cfg: AiConfig
): number {
  const status = evaluateStatus(board, toMove, variant);
  if (status !== "active") {
    return terminalScoreFor(status, toMove);
  }
  if (depth <= 0) {
    return evaluateBoardFor(board, toMove, variant, cfg);
  }
  let value = -Infinity;
  const moves = generateLegalMoves(board, toMove, variant);
  for (const m of moves) {
    const score = -negamax(
      applyMove(board, m),
      opposite(toMove),
      variant,
      depth - 1,
      -beta,
      -alpha,
      cfg
    );
    if (score > value) value = score;
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;
  }
  return value;
}

function terminalScoreFor(status: GameStatus, perspective: PieceColor): number {
  if (status === "draw") return 0;
  const won =
    (perspective === "white" && status === "white-wins") ||
    (perspective === "black" && status === "black-wins");
  return won ? 10_000 : -10_000;
}

export function evaluateBoardFor(
  board: Board,
  perspective: PieceColor,
  variant: Variant,
  cfg: AiConfig
): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      const base = p.kind === "king" ? 5 : 3;
      const advance = p.color === "white" ? BOARD_SIZE - 1 - r : r;
      const positional = advance * 0.15;
      const value = base + positional;
      score += p.color === perspective ? value : -value;
    }
  }
  score *= 1 + cfg.aggression * 0.4;
  // Giveaway: fewer pieces is better, so invert the material eval.
  if (variant === "giveaway") return -score;
  return score;
}

export function opposite(c: PieceColor): PieceColor {
  return c === "white" ? "black" : "white";
}

/** Map a clicked square to the move that would result, if any. */
export function findMoveTo(
  legalMoves: readonly Move[],
  from: Coord,
  to: Coord
): Move | undefined {
  return legalMoves.find(
    (m) => coordsEqual(m.from, from) && coordsEqual(m.to, to)
  );
}

/** Get all legal destinations from a given square. */
export function legalDestinationsFrom(
  legalMoves: readonly Move[],
  from: Coord
): readonly Move[] {
  return legalMoves.filter((m) => coordsEqual(m.from, from));
}
