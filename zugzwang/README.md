# Zugzwang ♟️

Premium full-stack Checkers platform — three rule sets (American, Russian/Шашки, Giveaway/Поддавки), 6 AI bots with alpha-beta pruning, daily puzzles, Elo graph, city leaderboard, and Supabase auth wired in.

Inspired by Chess.com's layout, Lichess's mechanical depth, and built in Next.js 14 + TypeScript strict mode.

---

## Quick start (GitHub Codespaces)

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your Supabase keys
cp .env.local.example .env.local
# Edit .env.local — paste your Supabase URL + anon key

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000> (Codespaces will forward the port automatically).

> **Works offline too.** If you skip Supabase setup, the app falls back to LocalStorage — sign-in is mocked locally, game progress and stats still persist. You only need Supabase if you want real auth and multiplayer.

---

## Supabase setup (optional, for full Level 3/4 functionality)

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` → **Run**. This creates:
   - `profiles`, `matches`, `user_badges`, `puzzle_attempts`, `rooms` tables
   - RLS policies (public reads where appropriate, owner-only writes)
   - A `handle_new_user()` trigger that auto-creates a profile row on signup
3. In **Project Settings → API**, copy the **Project URL** and **anon public key** into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. (For multiplayer / Level 4) In **Database → Replication**, enable **Realtime** for the `rooms` table.

---

## Project structure

```
app/
  layout.tsx          — Root shell: sidebar + topbar + main slot
  page.tsx            — Dashboard (hero, mode cards, puzzles row)
  play/page.tsx       — Game surface (board + side panel)
  puzzles/page.tsx    — Daily tactics + master puzzle
  profile/page.tsx    — Stats, Elo graph (custom SVG), badges, Upgrade-to-Pro
  leaderboard/page.tsx — City-filtered ranking (Almaty/Astana/Taraz/+)
  login/page.tsx      — Sign in / sign up (Supabase or offline)
  globals.css
components/
  layout/Sidebar.tsx  — Persistent left nav with Upgrade-to-Pro CTA
  layout/TopBar.tsx   — Sticky header, mobile drawer, user widget
  game/CheckersBoard.tsx — 8×8 board renderer w/ hints, last-move ring
  game/GamePanel.tsx  — Full play surface: clocks, status, move history,
                        variant/bot pickers, undo/resign
lib/
  engine.ts           — Pure rules engine (all 4 variants + alpha-beta bot)
  supabase.ts         — Lazy client init, returns null if env not set
store/
  useGameStore.ts     — Zustand: board, clock, history, bot tick, persist
  useAuthStore.ts     — Zustand: user, stats, badges, Elo history,
                        leaderboard seed, puzzle data
types/
  game.ts             — Strict types: Board, Piece, Move, Variant, …
supabase/
  schema.sql          — Migration with RLS, triggers, indexes
```

---

## How the game engine handles variants

| Rule set         | Men jump back? | Flying kings? | Promote mid-jump? | Win condition       |
|------------------|----------------|---------------|--------------------|---------------------|
| American         | ❌ no           | ❌ no (short)  | Stops chain        | Capture / trap foe  |
| Russian (Шашки)  | ✅ yes          | ✅ yes         | ✅ becomes flying  | Capture / trap foe  |
| Giveaway (Поддавки) | ✅ yes      | ✅ yes         | ✅                 | **Lose** all = win  |
| Sandbox          | (no validation — move pieces freely for debugging)               |

Mandatory captures are enforced in American / Russian / Giveaway. Multi-jump chains are computed via recursive DFS (`exploreCaptureChain`).

The bot uses **negamax with alpha-beta pruning**. Each persona has its own `(depth, aggression, errorRate)` triple — see `BOT_PERSONAS` in `store/useGameStore.ts`.

---

## Commands

```bash
npm run dev        # Dev server (hot reload)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## What's covered from the spec

- **Level 1 (Слабый):** Sandbox mode, static 8×8 board, free movement
- **Level 2 (Средний):** Full rule engine for American / Russian / Giveaway, mandatory captures, king promotion, win detection, local 2-player on one screen, LocalStorage persistence
- **Level 3 (Сильный):** 6-tier AI opponent (700–2200 Elo), Supabase auth + profile sync, dark theme, move hints, fully responsive mobile layout
- **Level 4 (Великий):** Realtime room schema for multiplayer (Supabase channels), city leaderboard (Almaty / Astana / Taraz / Shymkent / Karaganda), Upgrade-to-Pro CTA, daily puzzle structure, Elo graph, achievement badges

---

Built for Codespaces deploy. Just `npm install && npm run dev`.
