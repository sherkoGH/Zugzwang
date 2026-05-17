"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CheckersBoard } from "@/components/game/CheckersBoard";
import { useAuthStore } from "@/store/useAuthStore";
import {
  applyMove,
  createInitialBoard,
  evaluateStatus,
  findMoveTo,
  generateLegalMoves,
} from "@/lib/engine";
import { joinRoomChannel, type RoomChannelHandle, type RoomPresence } from "@/lib/realtime";
import { moveToPdn } from "@/lib/pdn";
import { playSfx } from "@/lib/sfx";
import type {
  AnnotatedMove,
  Board,
  Coord,
  GameStatus,
  Move,
  PieceColor,
} from "@/types/game";

type ConnState = "connecting" | "subscribed" | "error" | "offline";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = (params.code || "").toUpperCase();
  const isHost = searchParams.get("host") === "1";

  // Host = white, joiner = black. (Spec: "first to join takes Black".)
  const myColor: PieceColor = isHost ? "white" : "black";

  const username = useAuthStore((s) => s.stats.username);

  // Local game state — single source of truth for each client.
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [toMove, setToMove] = useState<PieceColor>("white");
  const [history, setHistory] = useState<AnnotatedMove[]>([]);
  const [selected, setSelected] = useState<Coord | null>(null);
  const [conn, setConn] = useState<ConnState>("connecting");
  const [presences, setPresences] = useState<readonly RoomPresence[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus>("active");

  const channelRef = useRef<RoomChannelHandle | null>(null);
  // Refs mirror the latest state for use inside the channel callback (which
  // captures stale closures otherwise).
  const boardRef = useRef(board);
  const toMoveRef = useRef(toMove);
  boardRef.current = board;
  toMoveRef.current = toMove;

  const legalMoves = useMemo(
    () => generateLegalMoves(board, toMove, "american"),
    [board, toMove]
  );

  // Apply a move locally and update history/status. Used both for my own moves
  // and for moves received from the opponent (after validation).
  function applyAndRecord(move: Move, by: PieceColor) {
    const next = applyMove(boardRef.current, move);
    const annotated: AnnotatedMove = { move, color: by };
    setBoard(next);
    setToMove(by === "white" ? "black" : "white");
    setHistory((h) => [...h, annotated]);
    setSelected(null);

    if (move.captures.length > 0) playSfx("capture");
    else if (move.promotes) playSfx("promote");
    else playSfx("move");

    const newStatus = evaluateStatus(
      next,
      by === "white" ? "black" : "white",
      "american"
    );
    setStatus(newStatus);
    if (newStatus !== "active") {
      playSfx(newStatus === `${myColor}-wins` ? "win" : "lose");
    }
  }

  // ───── Channel lifecycle ─────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const handle = await joinRoomChannel(code, {
          onEvent(evt) {
            if (evt.kind === "move") {
              // SECURITY: never trust the received move. Re-validate against
              // our local legal-move set for the side that's actually supposed
              // to move next, on the current local board.
              if (evt.by !== toMoveRef.current) {
                console.warn("[realtime] rejected move — wrong side to move");
                return;
              }
              const localLegal = generateLegalMoves(
                boardRef.current,
                toMoveRef.current,
                "american"
              );
              const found = findMoveTo(localLegal, evt.move.from, evt.move.to);
              if (!found) {
                console.warn("[realtime] rejected move — not in legal set");
                return;
              }
              applyAndRecord(found, evt.by);
            } else if (evt.kind === "resign") {
              setStatus(evt.by === "white" ? "black-wins" : "white-wins");
              playSfx(evt.by === myColor ? "lose" : "win");
            } else if (evt.kind === "rematch") {
              setBoard(createInitialBoard());
              setToMove("white");
              setHistory([]);
              setStatus("active");
              setSelected(null);
            }
          },
          onPresenceSync(p) {
            setPresences(p);
          },
          onSubscribed() {
            if (cancelled) return;
            setConn("subscribed");
          },
          onError(err) {
            if (cancelled) return;
            setConn("error");
            setErrMsg(err instanceof Error ? err.message : String(err));
          },
        });

        if (cancelled) {
          await handle?.cleanup();
          return;
        }

        if (!handle) {
          setConn("offline");
          setErrMsg("Supabase isn't configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
          return;
        }

        channelRef.current = handle;
        await handle.trackPresence({ username, color: myColor });
      } catch (e) {
        if (cancelled) return;
        setConn("error");
        setErrMsg(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      channelRef.current?.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ───── Local interaction ─────
  function handleSquareClick(c: Coord) {
    if (status !== "active") return;
    if (toMove !== myColor) return; // not my turn
    if (conn !== "subscribed") return;

    if (!selected) {
      const piece = board[c.row][c.col];
      if (piece?.color !== myColor) return;
      // Only allow selecting pieces that actually have a legal move.
      if (!legalMoves.some((m) => m.from.row === c.row && m.from.col === c.col)) return;
      setSelected(c);
      return;
    }
    if (selected.row === c.row && selected.col === c.col) {
      setSelected(null);
      return;
    }
    const m = findMoveTo(legalMoves, selected, c);
    if (!m) {
      // Maybe re-select another own piece.
      const piece = board[c.row][c.col];
      if (piece?.color === myColor) setSelected(c);
      else setSelected(null);
      return;
    }
    // Send first, then apply locally. Sending first means if the channel rejects,
    // we still have a chance to back out (here we apply optimistically and trust
    // the eventual ack). For a stricter "lockstep" mode, we'd await `ok` first.
    applyAndRecord(m, myColor);
    channelRef.current?.send({ kind: "move", move: m, by: myColor, ply: history.length + 1 });
  }

  function handleResign() {
    if (status !== "active") return;
    channelRef.current?.send({ kind: "resign", by: myColor });
    setStatus(myColor === "white" ? "black-wins" : "white-wins");
    playSfx("lose");
  }

  function handleRematch() {
    channelRef.current?.send({ kind: "rematch", from: myColor });
    setBoard(createInitialBoard());
    setToMove("white");
    setHistory([]);
    setStatus("active");
    setSelected(null);
  }

  const opponent = presences.find((p) => p.color !== myColor);
  const opponentOnline = !!opponent;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tightest text-ivory">
            Room <span className="font-mono text-accent">{code}</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            You play <span className="text-ivory">{myColor}</span>. Share the code to invite an opponent.
          </p>
        </div>
        <ConnIndicator state={conn} err={errMsg} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <PlayerStrip
            label={opponent?.username ?? "Waiting for opponent…"}
            color={myColor === "white" ? "black" : "white"}
            toMove={toMove}
            online={opponentOnline}
          />
          <CheckersBoard
            board={board}
            selected={selected}
            legalMoves={legalMoves}
            lastMove={history[history.length - 1]?.move ?? null}
            onSquareClick={handleSquareClick}
            orientation={myColor}
            showHints
          />
          <PlayerStrip label={`${username} (you)`} color={myColor} toMove={toMove} online />
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-earth-deep p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
              Game
            </div>
            <StatusLine status={status} myColor={myColor} />
            <div className="mt-3 flex gap-2">
              {status === "active" ? (
                <button
                  onClick={handleResign}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-ivory hover:bg-earth-medium"
                >
                  Resign
                </button>
              ) : (
                <button
                  onClick={handleRematch}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-obsidian hover:brightness-110"
                >
                  Rematch
                </button>
              )}
              <button
                onClick={() => router.push("/play/online")}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-ivory hover:bg-earth-medium"
              >
                Leave
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-earth-deep p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
              Moves
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No moves yet.</p>
            ) : (
              <ol className="max-h-72 space-y-1 overflow-y-auto pr-1 text-sm font-mono">
                {history.map((am, i) => (
                  <li key={i} className="flex gap-2 text-ivory">
                    <span className="w-7 text-muted">{Math.floor(i / 2) + 1}.</span>
                    <span className={am.color === "white" ? "text-ivory" : "text-zinc-400"}>
                      {moveToPdn(am.move)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConnIndicator({ state, err }: { state: ConnState; err: string | null }) {
  const map: Record<ConnState, { text: string; color: string; dot: string }> = {
    connecting: { text: "Connecting…", color: "text-amber-300", dot: "bg-amber-400 animate-pulse" },
    subscribed: { text: "Live", color: "text-emerald-300", dot: "bg-emerald-400" },
    error: { text: "Connection error", color: "text-rose-300", dot: "bg-rose-500" },
    offline: { text: "Offline (no Supabase)", color: "text-zinc-400", dot: "bg-zinc-500" },
  };
  const m = map[state];
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/5 bg-earth-deep px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      <span className={`text-xs font-medium ${m.color}`}>{m.text}</span>
      {err && state === "error" && (
        <span className="ml-1 text-[10px] text-zinc-500">— {err}</span>
      )}
    </div>
  );
}

function PlayerStrip({
  label,
  color,
  toMove,
  online,
}: {
  label: string;
  color: PieceColor;
  toMove: PieceColor;
  online: boolean;
}) {
  const active = toMove === color;
  return (
    <div
      className={`flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 ${
        active ? "bg-accent/15" : "bg-earth-deep"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            color === "white" ? "bg-ivory" : "bg-zinc-700 border border-zinc-500"
          }`}
        />
        <span className="text-sm text-ivory">{label}</span>
        {!online && <span className="text-[10px] text-rose-400">offline</span>}
      </div>
      {active && <span className="text-[10px] uppercase tracking-widest text-accent">To move</span>}
    </div>
  );
}

function StatusLine({ status, myColor }: { status: GameStatus; myColor: PieceColor }) {
  if (status === "active") return <p className="text-sm text-ivory">Game in progress.</p>;
  if (status === "draw") return <p className="text-sm text-amber-300">Draw.</p>;
  const wonBy: PieceColor = status === "white-wins" ? "white" : "black";
  const youWon = wonBy === myColor;
  return (
    <p className={`text-sm font-semibold ${youWon ? "text-emerald-300" : "text-rose-400"}`}>
      {youWon ? "You won." : "You lost."}
    </p>
  );
}
