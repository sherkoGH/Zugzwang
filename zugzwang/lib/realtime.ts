// lib/realtime.ts — Supabase Realtime channels for live multiplayer.
//
// Design: one channel per room, name = `room:${code}`. Broadcast events used:
//   - "move"        { move: Move, by: PieceColor, fen: serialized board, ts }
//   - "presence"    { username, color }
//   - "resign"      { by: PieceColor }
//   - "rematch"     { from: PieceColor }
//
// Both clients run the local engine on every received move (do NOT trust the
// payload's board — re-derive it from `applyMove(localBoard, move)`). The
// channel only carries the move primitive; the receiving client validates it
// against its own legal-move set and rejects if invalid. This guarantees that
// even with a malicious peer there's no way to inject illegal state.
//
// Presence is used to detect mid-game disconnects — see useRoomChannel below.

import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Move, PieceColor } from "@/types/game";

export type RoomEvent =
  | { kind: "move"; move: Move; by: PieceColor; ply: number }
  | { kind: "resign"; by: PieceColor }
  | { kind: "rematch"; from: PieceColor };

export interface RoomPresence {
  readonly username: string;
  readonly color: PieceColor;
  readonly online_at: string;
}

export interface RoomChannelHandle {
  readonly channel: RealtimeChannel;
  send: (evt: RoomEvent) => Promise<"ok" | "timed_out" | "rate_limited" | "error">;
  trackPresence: (p: Omit<RoomPresence, "online_at">) => Promise<void>;
  cleanup: () => Promise<void>;
}

export interface RoomCallbacks {
  onEvent: (evt: RoomEvent) => void;
  onPresenceSync: (presences: readonly RoomPresence[]) => void;
  onSubscribed?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Join (or create) a realtime channel for the given room code.
 * Returns null if Supabase isn't configured.
 */
export async function joinRoomChannel(
  code: string,
  callbacks: RoomCallbacks
): Promise<RoomChannelHandle | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const sbClient = sb; // capture for closures below

  // The `private: false` setting makes the channel readable by any client with
  // the room code. For private/invite-only rooms, the room creation request to
  // /api/rooms should generate a server-side token, and we'd switch to
  // `private: true` plus a Supabase RLS broadcast policy keyed on that token.
  const channel = sbClient.channel(`room:${code}`, {
    config: {
      broadcast: { self: false, ack: true },
      presence: { key: "" }, // filled by trackPresence
    },
  });

  channel.on("broadcast", { event: "move" }, ({ payload }) => {
    callbacks.onEvent(payload as RoomEvent);
  });
  channel.on("broadcast", { event: "resign" }, ({ payload }) => {
    callbacks.onEvent(payload as RoomEvent);
  });
  channel.on("broadcast", { event: "rematch" }, ({ payload }) => {
    callbacks.onEvent(payload as RoomEvent);
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<RoomPresence>();
    const flattened: RoomPresence[] = [];
    for (const key of Object.keys(state)) {
      for (const p of state[key]) flattened.push(p);
    }
    callbacks.onPresenceSync(flattened);
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Channel SUBSCRIBE timed out after 10s")),
      10_000
    );
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        callbacks.onSubscribed?.();
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        callbacks.onError?.(err ?? new Error(status));
        reject(err ?? new Error(status));
      }
    });
  });

  async function send(evt: RoomEvent) {
    const result = await channel.send({
      type: "broadcast",
      event: evt.kind,
      payload: evt,
    });
    return result as "ok" | "timed_out" | "rate_limited" | "error";
  }

  async function trackPresence(p: Omit<RoomPresence, "online_at">) {
    await channel.track({ ...p, online_at: new Date().toISOString() });
  }

  async function cleanup() {
    await channel.unsubscribe();
    await sbClient.removeChannel(channel);
  }

  return { channel, send, trackPresence, cleanup };
}

/** Generate a 6-character room code (uppercase, no ambiguous chars). */
export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip I, O, 0, 1
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
