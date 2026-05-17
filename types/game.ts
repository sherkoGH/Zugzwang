// types/game.ts — Single source of truth for the Zugzwang domain model.

export type PieceColor = "white" | "black";
export type PieceKind = "man" | "king";

export interface Piece {
  readonly id: string;
  readonly color: PieceColor;
  kind: PieceKind;
}

/** Null = empty square (only dark squares ever hold a piece). */
export type Square = Piece | null;

/** Row 0 = top (black home), Row 7 = bottom (white home). 8×8.
 *  Treat as immutable in app code — engine returns fresh boards from `applyMove`. */
export type Board = Square[][];

export interface Coord {
  readonly row: number;
  readonly col: number;
}

/** A move can be a single step OR a multi-jump chain. */
export interface Move {
  readonly from: Coord;
  readonly to: Coord;
  /** Coordinates of pieces captured during this move (empty for non-capture). */
  readonly captures: readonly Coord[];
  /** Path of squares visited (length >= 2). Used for multi-jump animation/replay. */
  readonly path: readonly Coord[];
  /** True if the moving piece becomes a king at the end of this move. */
  readonly promotes: boolean;
}

export type Variant = "american" | "russian" | "giveaway" | "sandbox";

export interface TimeControl {
  readonly label: string;
  /** Total time per side in seconds. 0 = untimed. */
  readonly baseSeconds: number;
  /** Increment per move in seconds. */
  readonly incrementSeconds: number;
  readonly category: "bullet" | "blitz" | "rapid" | "untimed";
}

export type GameStatus =
  | "active"
  | "white-wins"
  | "black-wins"
  | "draw";

export type MoveQuality = "brilliant" | "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface AnnotatedMove {
  readonly move: Move;
  readonly color: PieceColor;
  readonly quality?: MoveQuality;
  readonly comment?: string;
}

export interface MatchHistory {
  readonly id: string;
  readonly variant: Variant;
  readonly timeControl: TimeControl;
  readonly playedAt: string;
  readonly whiteName: string;
  readonly blackName: string;
  readonly result: GameStatus;
  readonly moves: readonly AnnotatedMove[];
  readonly eloChange: number;
}

export interface ProfileStats {
  readonly username: string;
  readonly elo: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly streak: number;
  readonly city: string;
  readonly badges: readonly Badge[];
  readonly eloHistory: readonly { readonly date: string; readonly elo: number }[];
}

export interface Badge {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly unlockedAt?: string;
}

export interface BotPersona {
  readonly id: string;
  readonly name: string;
  readonly elo: number;
  readonly depth: number;
  readonly aggression: number; // 0..1 weighting for captures vs positional
  readonly errorRate: number; // 0..1 probability of picking a non-best move
  readonly tagline: string;
}

export interface Puzzle {
  readonly id: string;
  readonly variant: Variant;
  readonly board: Board;
  readonly toMove: PieceColor;
  readonly rating: number;
  readonly title: string;
  readonly solution: readonly Move[];
  readonly isMaster: boolean;
}
