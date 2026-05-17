"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateRoomCode } from "@/lib/realtime";
import { isSupabaseConfigured } from "@/lib/supabase";
import { HoverButton } from "@/components/ui/hover-glow-button";

export default function OnlineLobbyPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const supaReady = isSupabaseConfigured();

  function handleCreate() {
    const code = generateRoomCode();
    router.push(`/play/room/${code}?host=1`);
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setErr("Room code is 6 uppercase letters/digits.");
      return;
    }
    router.push(`/play/room/${code}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tightest text-ivory">Play online</h1>
        <p className="mt-2 text-muted">
          Create a room to invite a friend, or join with a 6-character code.
        </p>
      </div>

      {!supaReady && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Supabase isn&apos;t configured — multiplayer needs a Supabase URL and anon key in{" "}
          <code className="font-mono text-amber-100">.env.local</code> to work. You can still browse the lobby.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-earth-deep p-6">
          <h2 className="text-lg font-semibold text-ivory">Create a room</h2>
          <p className="mt-1 text-sm text-muted">
            Get a shareable code. The first person to join takes Black.
          </p>
          <div className="mt-4">
            <HoverButton onClick={handleCreate} className="w-full">
              Create room
            </HoverButton>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-earth-deep p-6">
          <h2 className="text-lg font-semibold text-ivory">Join with code</h2>
          <p className="mt-1 text-sm text-muted">Paste the 6-character code your friend shared.</p>
          <div className="mt-4 space-y-2">
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setErr(null);
              }}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 font-mono text-lg tracking-widest text-ivory outline-none focus:border-accent"
            />
            {err && <p className="text-xs text-rose-400">{err}</p>}
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 6}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-obsidian transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join room
            </button>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted">
        <Link href="/play" className="underline-offset-4 hover:underline">← Back to single-player</Link>
      </div>
    </div>
  );
}
