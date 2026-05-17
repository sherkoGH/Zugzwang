"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore, TIME_CONTROLS, BOT_PERSONAS } from "@/store/useGameStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CheckersBoard } from "@/components/game/CheckersBoard";
import type { Variant, PieceColor, MoveQuality } from "@/types/game";
import { moveToPdn } from "@/lib/pdn";
import { analyzeGame, qualityGlyph, qualityColor, type AnalysisRow } from "@/lib/analyzer";
import { SandboxEditor } from "@/components/game/SandboxEditor";
import { PaywallModal } from "@/components/ui/paywall-modal";

const VARIANT_LABELS: Record<Variant, string> = {
  american: "American",
  russian: "Русские шашки",
  giveaway: "Поддавки (Giveaway)",
  sandbox: "Sandbox",
};

export function GamePanel() {
  const board = useGameStore((s) => s.board);
  const toMove = useGameStore((s) => s.toMove);
  const status = useGameStore((s) => s.status);
  const selected = useGameStore((s) => s.selected);
  const legalMoves = useGameStore((s) => s.legalMovesCache);
  const history = useGameStore((s) => s.history);
  const clock = useGameStore((s) => s.clock);
  const variant = useGameStore((s) => s.variant);
  const timeControl = useGameStore((s) => s.timeControl);
  const vsBot = useGameStore((s) => s.vsBot);
  const showHints = useGameStore((s) => s.showHints);

  const selectSquare = useGameStore((s) => s.selectSquare);
  const tick = useGameStore((s) => s.tick);
  const newGame = useGameStore((s) => s.newGame);
  const toggleHints = useGameStore((s) => s.toggleHints);
  const undo = useGameStore((s) => s.undo);
  const resign = useGameStore((s) => s.resign);
  const recordResult = useAuthStore((s) => s.recordResult);

  const lastMove = useMemo(
    () => (history.length > 0 ? history[history.length - 1].move : null),
    [history]
  );

  const [analysis, setAnalysis] = useState<readonly AnalysisRow[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const isPro = useAuthStore((s) => s.isPro);
  // First review per game is free for everyone; subsequent reviews require Pro.
  const reviewCountRef = useRef(0);

  // Invalidate analysis whenever history changes (e.g. new game, undo).
  useEffect(() => {
    setAnalysis(null);
    reviewCountRef.current = 0;
  }, [history]);

  function runReview() {
    if (history.length === 0 || analyzing) return;
    if (!isPro && reviewCountRef.current >= 1) {
      setPaywallOpen(true);
      return;
    }
    reviewCountRef.current++;
    setAnalyzing(true);
    // Defer to next tick so the "Analyzing…" state can paint first.
    setTimeout(() => {
      try {
        const result = analyzeGame(history, variant === "sandbox" ? "american" : variant, 4);
        setAnalysis(result);
      } finally {
        setAnalyzing(false);
      }
    }, 30);
  }

  // Clock ticker (250 ms is smooth enough and cheap).
  useEffect(() => {
    if (timeControl.baseSeconds === 0) return;
    if (status !== "active") return;
    const id = window.setInterval(() => tick(), 250);
    return () => window.clearInterval(id);
  }, [tick, status, timeControl.baseSeconds]);

  // Record result once when status transitions to terminal.
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (status === "active") {
      recordedRef.current = null;
      return;
    }
    const key = `${history.length}-${status}`;
    if (recordedRef.current === key) return;
    recordedRef.current = key;
    if (!vsBot) return; // Only count games vs bots for the demo stats.
    // Human plays as White, bot as Black.
    const win = status === "white-wins";
    const loss = status === "black-wins";
    const delta = win ? 12 : loss ? -8 : 0;
    recordResult(win ? "win" : loss ? "loss" : "draw", delta);
  }, [status, history.length, vsBot, recordResult]);

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <PlayerStrip color="black" toMove={toMove} clock={clock} timeControl={timeControl} botName={vsBot?.name} />
        <CheckersBoard
          board={board}
          selected={selected}
          legalMoves={legalMoves}
          lastMove={lastMove}
          showHints={showHints}
          orientation="white"
          disabled={status !== "active"}
          onSquareClick={selectSquare}
        />
        <PlayerStrip color="white" toMove={toMove} clock={clock} timeControl={timeControl} botName={undefined} youLabel />
        {status !== "active" && <StatusBanner status={status} />}
      </div>

      <aside className="space-y-4">
        <Panel title="Game">
          <div className="space-y-3 text-sm">
            <Row label="Variant" value={VARIANT_LABELS[variant]} />
            <Row label="Time" value={timeControl.label} />
            <Row label="Opponent" value={vsBot ? vsBot.name : "Local (pass & play)"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => newGame({})}>New Game</Button>
            <Button variant="ghost" onClick={undo} disabled={history.length === 0}>
              Undo
            </Button>
            <Button variant="ghost" onClick={toggleHints}>
              {showHints ? "Hide hints" : "Show hints"}
            </Button>
            <Button variant="danger" onClick={() => resign("white")} disabled={status !== "active"}>
              Resign
            </Button>
          </div>
        </Panel>

        <Panel title="Setup">
          <VariantPicker />
          <div className="mt-4">
            <TimeControlPicker />
          </div>
          <div className="mt-4">
            <BotPicker />
          </div>
        </Panel>

        <Panel title="Move History" scroll>
          {history.length === 0 ? (
            <p className="text-xs text-muted">No moves yet.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted">
                  {history.length} {history.length === 1 ? "move" : "moves"}
                </span>
                {analysis === null ? (
                  <button
                    onClick={runReview}
                    disabled={analyzing || history.length === 0}
                    className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-accent hover:bg-accent/20 disabled:opacity-50"
                  >
                    {analyzing ? "Analyzing…" : "Review game"}
                  </button>
                ) : (
                  <button
                    onClick={() => setAnalysis(null)}
                    className="text-[10px] uppercase tracking-widest text-muted hover:text-ivory"
                  >
                    Clear
                  </button>
                )}
              </div>
              <ol className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono text-ivory">
                {history.map((am, idx) => {
                  const row = analysis?.[idx];
                  return (
                    <li key={idx} className="flex items-baseline gap-2">
                      <span className="text-muted">{Math.floor(idx / 2) + 1}.</span>
                      <span>{moveToNotation(am.move, am.color)}</span>
                      {row && row.quality !== "good" && (
                        <span
                          className={`text-[10px] font-bold ${qualityColor(row.quality)}`}
                          title={`${row.quality} (loss: ${row.loss.toFixed(2)})`}
                        >
                          {qualityGlyph(row.quality)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              {analysis && <AnalysisSummary rows={analysis} />}
            </>
          )}
        </Panel>

        {variant === "sandbox" && <SandboxEditor />}
      </aside>
    </div>
    <PaywallModal
      open={paywallOpen}
      onClose={() => setPaywallOpen(false)}
      feature="Unlimited Game Review"
      benefit="You've used your free review for this game. Pro members get unlimited AI Coach reviews on every game, plus deeper engine analysis."
    />
    </>
  );
}

function moveToNotation(move: { from: { row: number; col: number }; to: { row: number; col: number }; captures: readonly { row: number; col: number }[]; path: readonly { row: number; col: number }[] }, color: PieceColor): string {
  // Delegate to proper PDN encoder.
  void color;
  return moveToPdn(move as unknown as import("@/types/game").Move);
}

function PlayerStrip({
  color,
  toMove,
  clock,
  timeControl,
  botName,
  youLabel = false,
}: {
  color: PieceColor;
  toMove: PieceColor;
  clock: { white: number; black: number };
  timeControl: { baseSeconds: number };
  botName?: string;
  youLabel?: boolean;
}) {
  const isActive = toMove === color;
  const secs = color === "white" ? clock.white : clock.black;
  const showClock = timeControl.baseSeconds > 0;
  const name = color === "white" ? (youLabel ? "You" : "White") : botName ?? "Opponent";
  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg border bg-earth-card px-4 py-2.5",
        isActive ? "border-accent/60" : "border-earth-line",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            "h-7 w-7 rounded-full border",
            color === "white" ? "border-[#9a9a85] bg-[#f0f0e0]" : "border-black bg-[#262422]",
          ].join(" ")}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-ivory">{name}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {color === "white" ? "White" : "Black"}
          </span>
        </div>
      </div>
      {showClock && (
        <div
          className={[
            "rounded-md px-3 py-1.5 font-mono text-lg font-semibold tracking-tight",
            isActive ? "bg-accent text-obsidian" : "bg-earth-hover text-ivory",
          ].join(" ")}
        >
          {formatClock(secs)}
        </div>
      )}
    </div>
  );
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function StatusBanner({ status }: { status: "white-wins" | "black-wins" | "draw" }) {
  const label =
    status === "white-wins" ? "White wins" : status === "black-wins" ? "Black wins" : "Draw";
  return (
    <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-4 py-3">
      <span className="text-sm font-semibold tracking-tight text-ivory">{label}</span>
      <span className="text-xs uppercase tracking-wider text-accent">Game over</span>
    </div>
  );
}

function Panel({
  title,
  children,
  scroll = false,
}: {
  title: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <section className="rounded-lg border border-earth-line bg-earth-card">
      <header className="border-b border-earth-line px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</h2>
      </header>
      <div className={["p-4", scroll ? "max-h-64 overflow-y-auto" : ""].join(" ")}>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-medium text-ivory">{value}</span>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-obsidian hover:bg-accent-bright"
      : variant === "danger"
      ? "border border-earth-line bg-transparent text-ivory hover:bg-earth-hover"
      : "border border-earth-line bg-transparent text-ivory hover:bg-earth-hover";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-md px-3 py-1.5 text-xs font-semibold outline-none duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function VariantPicker() {
  const variant = useGameStore((s) => s.variant);
  const newGame = useGameStore((s) => s.newGame);
  const options: { value: Variant; label: string }[] = [
    { value: "american", label: "American" },
    { value: "russian", label: "Русские" },
    { value: "giveaway", label: "Поддавки" },
    { value: "sandbox", label: "Sandbox" },
  ];
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">Variant</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => newGame({ variant: o.value })}
            className={[
              "rounded-md px-2.5 py-2 text-xs font-semibold outline-none duration-150 ease-out",
              "focus-visible:ring-2 focus-visible:ring-accent",
              variant === o.value
                ? "bg-accent text-obsidian"
                : "border border-earth-line text-ivory hover:bg-earth-hover",
            ].join(" ")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeControlPicker() {
  const tc = useGameStore((s) => s.timeControl);
  const newGame = useGameStore((s) => s.newGame);
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">Time control</p>
      <div className="flex flex-wrap gap-1.5">
        {TIME_CONTROLS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => newGame({ timeControl: opt })}
            className={[
              "rounded-md px-2.5 py-1.5 text-xs font-semibold outline-none duration-150 ease-out",
              "focus-visible:ring-2 focus-visible:ring-accent",
              tc.label === opt.label
                ? "bg-accent text-obsidian"
                : "border border-earth-line text-ivory hover:bg-earth-hover",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BotPicker() {
  const vsBot = useGameStore((s) => s.vsBot);
  const newGame = useGameStore((s) => s.newGame);
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">Opponent</p>
      <div className="grid grid-cols-1 gap-1.5">
        <button
          type="button"
          onClick={() => newGame({ vsBot: null })}
          className={[
            "rounded-md px-3 py-2 text-left text-xs font-semibold outline-none duration-150 ease-out",
            "focus-visible:ring-2 focus-visible:ring-accent",
            vsBot === null
              ? "bg-accent text-obsidian"
              : "border border-earth-line text-ivory hover:bg-earth-hover",
          ].join(" ")}
        >
          Local — Pass &amp; Play
        </button>
        {BOT_PERSONAS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => newGame({ vsBot: b })}
            className={[
              "flex items-center justify-between rounded-md px-3 py-2 text-left outline-none duration-150 ease-out",
              "focus-visible:ring-2 focus-visible:ring-accent",
              vsBot?.id === b.id
                ? "bg-accent text-obsidian"
                : "border border-earth-line text-ivory hover:bg-earth-hover",
            ].join(" ")}
          >
            <span className="flex flex-col leading-tight">
              <span className="text-xs font-semibold">{b.name}</span>
              <span
                className={[
                  "text-[10px]",
                  vsBot?.id === b.id ? "text-obsidian/70" : "text-muted",
                ].join(" ")}
              >
                {b.tagline}
              </span>
            </span>
            <span
              className={[
                "rounded px-1.5 py-0.5 text-[10px] font-mono",
                vsBot?.id === b.id ? "bg-obsidian/15" : "bg-earth-hover",
              ].join(" ")}
            >
              {b.elo}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AnalysisSummary({ rows }: { rows: readonly AnalysisRow[] }) {
  const counts: Record<MoveQuality, number> = {
    brilliant: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0,
  };
  for (const r of rows) counts[r.quality]++;
  const order: MoveQuality[] = ["brilliant", "best", "inaccuracy", "mistake", "blunder"];
  return (
    <div className="mt-4 rounded-md border border-white/5 bg-earth-medium/30 p-3">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted">
        Review summary
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {order.filter((q) => counts[q] > 0).map((q) => (
          <span key={q} className="flex items-center gap-1">
            <span className={`font-bold ${qualityColor(q)}`}>{qualityGlyph(q) || "•"}</span>
            <span className="text-ivory">{counts[q]}</span>
            <span className="text-muted capitalize">{q}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
