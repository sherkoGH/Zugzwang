// components/game/SandboxEditor.tsx — Free-form position composer.
// Visible only when variant === "sandbox". Click a piece type, then click any
// dark square on the board to place. Trash = erase. Powered by sandboxPlace.
"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import type { Piece, PieceColor, PieceKind } from "@/types/game";

type Tool =
  | { kind: "place"; piece: Piece }
  | { kind: "erase" };

let idCounter = 1000;
function freshPiece(color: PieceColor, kind: PieceKind): Piece {
  return { id: `sb${idCounter++}`, color, kind };
}

export function SandboxEditor() {
  const variant = useGameStore((s) => s.variant);
  const selected = useGameStore((s) => s.selected);
  const sandboxPlace = useGameStore((s) => s.sandboxPlace);
  const sandboxClear = useGameStore((s) => s.sandboxClear);
  const sandboxReset = useGameStore((s) => s.sandboxReset);

  const [tool, setTool] = useState<Tool>({
    kind: "place",
    piece: freshPiece("white", "man"),
  });

  if (variant !== "sandbox") return null;

  // Apply the current tool whenever the user clicks a square (selected coord changes).
  // The CheckersBoard already calls selectSquare; in sandbox mode selectSquare
  // doesn't move pieces, so we hook the selection coord and apply our tool.
  // To keep this simple and predictable, expose explicit "Apply at selected" UX.
  function applyAtSelected() {
    if (!selected) return;
    if (tool.kind === "erase") {
      sandboxPlace(selected, null);
    } else {
      // Always generate a fresh id so swapping doesn't collide.
      sandboxPlace(selected, { ...tool.piece, id: `sb${idCounter++}` });
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-accent/30 bg-earth-deep p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-accent">
          Sandbox editor
        </span>
        <div className="flex gap-1">
          <button
            onClick={sandboxReset}
            className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted hover:text-ivory"
          >
            Reset
          </button>
          <button
            onClick={sandboxClear}
            className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted hover:text-ivory"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-muted">
        Pick a piece, click a dark square on the board, then press <b>Place</b>.
        Use <b>Erase</b> to remove. Only dark squares are valid in checkers.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <ToolBtn
          active={tool.kind === "place" && tool.piece.color === "white" && tool.piece.kind === "man"}
          onClick={() => setTool({ kind: "place", piece: freshPiece("white", "man") })}
        >
          <PieceGlyph color="white" kind="man" /> White man
        </ToolBtn>
        <ToolBtn
          active={tool.kind === "place" && tool.piece.color === "white" && tool.piece.kind === "king"}
          onClick={() => setTool({ kind: "place", piece: freshPiece("white", "king") })}
        >
          <PieceGlyph color="white" kind="king" /> White king
        </ToolBtn>
        <ToolBtn
          active={tool.kind === "place" && tool.piece.color === "black" && tool.piece.kind === "man"}
          onClick={() => setTool({ kind: "place", piece: freshPiece("black", "man") })}
        >
          <PieceGlyph color="black" kind="man" /> Black man
        </ToolBtn>
        <ToolBtn
          active={tool.kind === "place" && tool.piece.color === "black" && tool.piece.kind === "king"}
          onClick={() => setTool({ kind: "place", piece: freshPiece("black", "king") })}
        >
          <PieceGlyph color="black" kind="king" /> Black king
        </ToolBtn>
        <ToolBtn
          active={tool.kind === "erase"}
          onClick={() => setTool({ kind: "erase" })}
          className="col-span-2 border-rose-400/30 text-rose-300"
        >
          🗑 Erase
        </ToolBtn>
      </div>

      <button
        onClick={applyAtSelected}
        disabled={!selected}
        className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-widest text-obsidian transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {tool.kind === "erase" ? "Erase at selected" : "Place at selected"}
      </button>
      {!selected && (
        <p className="mt-2 text-center text-[10px] text-muted">Click a dark square to target it.</p>
      )}
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-[11px] transition",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-white/10 text-ivory hover:bg-earth-medium/50",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PieceGlyph({ color, kind }: { color: PieceColor; kind: PieceKind }) {
  return (
    <span
      className={[
        "inline-block h-4 w-4 rounded-full border",
        color === "white"
          ? "border-zinc-300 bg-gradient-to-br from-ivory to-zinc-300"
          : "border-zinc-900 bg-gradient-to-br from-zinc-700 to-zinc-900",
      ].join(" ")}
    >
      {kind === "king" && (
        <span
          className={[
            "block text-center text-[10px] leading-none",
            color === "white" ? "text-zinc-700" : "text-amber-300",
          ].join(" ")}
        >
          ♛
        </span>
      )}
    </span>
  );
}
