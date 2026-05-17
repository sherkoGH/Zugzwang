# Zugzwang ♟️

Zugzwang is a premium, full-stack Checkers platform designed with the competitive infrastructure and aesthetic polish expected of modern chess platforms. It features multiple rule variants, advanced AI personalities, realtime multiplayer, post-match analysis, and a structured progression system wrapped in a dark, obsidian-themed UI.

Personal note: Zugzwang was built with heart for N!'s test task. However, when I was working on it, bugs kept adding up, and eventually my low-end laptop couldn't handle the workload. I crashed out and let go of my dream as I was busy with so much stuff lately. I wasted my whole day, and had exams coming up. The next day, though, I just could not let myself give up like that. So, I restarted everything all over again and the current project is what I ended up making while having just some hours left until the deadline. Respect for whoever read this long text.

Built with **Next.js 14 (App Router)**, **TypeScript (Strict Mode)**, **Zustand**, **Supabase**, and **Stripe**.

---

## 🚀 Features

### 🎮 Gameplay & Engine
*   **Three Rule Variants:** 
    *   *American:* Standard forward jumps, short kings, mandatory captures.
    *   *Russian (Шашки):* Backward jumps for men, flying kings, and mid-jump promotion.
    *   *Giveaway (Поддавки):* Anti-checkers variant where the goal is to lose all pieces.
*   **Sandbox Mode:** Complete position editor to place any piece on any valid square for analysis or testing.
*   **Robust Move Mechanics:** Full Depth-First Search (DFS) expansion for complex multi-jump capture chains.
*   **Procedural Audio:** Sound effects (moves, captures, promotions) synthesized dynamically via the HTML5 AudioContext API—zero heavy asset files required.
*   **Dual Clocks:** Supports Bullet, Blitz, Rapid, and Untimed controls with custom time increments.

### 🤖 Opponents & Multiplayer
*   **6 AI Personalities:** Engine powered by Negamax with Alpha-Beta pruning, ranging from 700 to 2200 Elo. Each persona utilizes distinct search depths, aggression weights, and intentional error rates.
*   **Realtime Multiplayer:** Instant match creation with 6-character room codes powered by Supabase broadcast channels. 
*   **Client-Side Validation:** The receiving client re-validates all network move payloads against the local engine to ensure zero state corruption.

### 📈 Progression & Analysis (Pro)
*   **Detailed Analytics:** Post-match Coach Review labels moves with Chess.com-style glyphs (`!!`, `!`, `?!`, `?`, `??`) based on centipawn loss metrics.
*   **Player Profiles:** Per-category Elo ratings, a custom SVG-rendered 30-day Elo history chart, and regional leaderboards (Almaty, Astana, Taraz, Shymkent, Karaganda).
*   **Daily Challenges:** Three tactics puzzles and one master puzzle generated daily with streak tracking.
*   **Monetization Tier:** Integrated Stripe Checkout webhook architecture to toggle premium features (`is_pro = true`) alongside animated paywall modals.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Server Components for speed, Client Components for interactive UI, API routes for webhooks. |
| **Language** | TypeScript (Strict) | Fully typed game state, engine, and store using discriminated unions. |
| **State** | Zustand + Persist | Lightweight global state with LocalStorage hydration to survive page refreshes. |
| **Database/Backend** | Supabase | Postgres storage, Row-Level Security (RLS), and Realtime broadcast channels. |
| **Payments** | Stripe | Customer checkout sessions and secure webhook handling for the Pro tier. |
| **Styling** | Tailwind CSS | Custom obsidian/earth design tokens configured via `tailwind.config.ts`. |

---

## 📁 Project Structure

```text
zugzwang/
├── app/                          # Next.js App Router (Pages & API Routes)
│   ├── api/webhook/stripe/       # Stripe payment lifecycle handler
│   ├── leaderboard/              # City-filtered rankings
│   ├── play/                     # Game interfaces (Single-player, Live Lobby, Rooms)
│   ├── profile/                  # User stats, SVG Elo graphs, and achievements
│   └── puzzles/                  # Daily tactics panel
├── components/
│   ├── game/                     # Board renderer, Sandbox editor, Game panel controls
│   ├── layout/                   # Persistent Navigation, Sidebar, and TopBar
│   └── ui/                       # Reusable design elements (Glow buttons, Paywall modals)
├── lib/
│   ├── analyzer.ts               # Post-match move quality analyzer
│   ├── engine.ts                 # Pure-function rules engine + alpha-beta bot
│   ├── pdn.ts                    # Portable Draughts Notation (PDN) parser/encoder
│   ├── realtime.ts               # Supabase channel connection wrappers
│   └── sfx.ts                    # AudioContext synthesis engine
├── store/
│   ├── useGameStore.ts           # Match state, clocks, history, and bot state
│   └── useAuthStore.ts           # User profiles, streaks, and puzzle state
└── supabase/
    └── schema.sql                # Database migrations, RLS policies, and triggers

    ## ⚙️ Core Architecture Decisions

*   **Pure-Function Game Engine:** Logic in `lib/engine.ts` has zero side effects or React dependencies. The exact same rule validation matrices are shared by the local UI, the bot, the post-match analyzer, and the multiplayer network layer.
*   **Broadcast-Only Realtime Layer:** Multiplayer rooms pass minimal, primitive move payloads (`{ from, to, path }`) over Supabase channels rather than writing every ply to a database table. The board state is completely reconstructed on the fly, saving heavy Postgres database read/write loads.
*   **Offline Fallback Mode:** If environment variables for Supabase or Stripe are missing, the application seamlessly defaults to a local offline sandbox/pass-and-play mode with mocked authentication and local storage state updates.

---

## ⚡ Quick Start

### 1. Clone and Install
```bash
git clone [https://github.com/yourusername/zugzwang.git](https://github.com/yourusername/zugzwang.git)
cd zugzwang
npm install

2. Configure Environment VariablesCreate a .env.local file in the root directory:BashNEXT_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Required for live payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

3. Setup the DatabasePaste the contents of supabase/schema.sql into your Supabase SQL Editor and run it. Ensure Realtime is toggled on for the rooms table in your Supabase Dashboard (Database -> Replication). 

4. Run the Development ServerBashnpm run dev
Open http://localhost:3000 to view the platform.  

🛠️ Available Scripts:
npm run dev - Launches the local development server with hot-reloading.  
npm run build - Compiles the production build configuration. 
npm run start - Bootstraps the built production server locally.
npm run lint - Runs strict ESLint checks.
npm run typecheck - Validates strict type checking across the project without emitting files.
📜 License & AcknowledgmentsThis project is licensed under the MIT License. Built with care in 🇰🇿 Kazakhstan.
