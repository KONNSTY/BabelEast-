# Execution Log — linguaflow

## 2026-09-08 — Initial analysis (M00)

Read-only inventory of the repository before any changes. No code was modified in this pass.

### Stack present vs. spec

| Requirement | Status |
|---|---|
| Next.js App Router (v16.3.4) | ✅ present |
| TypeScript strict | ✅ `tsconfig.json` present, not yet verified strict-clean |
| Tailwind CSS v4 | ✅ present (`@tailwindcss/postcss`) |
| Framer Motion | ✅ in `package.json`, not yet used in any component |
| Zustand | ✅ used in `src/lib/learning-store.ts` |
| Supabase (client/server) | ✅ `src/lib/supabase/browser.ts`, `server.ts` |
| Supabase Auth | ⚠️ magic-link login page exists (`src/app/login/page.tsx`) and `src/app/auth/callback/route.ts`, but no session-gated routes, no logout, no protected middleware check |
| Supabase RLS / migrations | ⚠️ `supabase/migrations/001_core.sql` exists but only covers `profiles`, `languages`, `lessons`, `user_progress` — missing `courses`, `units`, `exercises`, `vocabulary`, `quests`, `hearts`, `streaks`, `gems`, `ai_usage` as distinct data areas, no heart-regen/streak/XP/gem/quota functions |
| Vitest | ✅ configured (`vitest.config.ts`), one test file (`src/lib/learning-store.test.ts`) |
| Playwright | ❌ not installed, not in `package.json`, no config, no tests |
| ESLint | ✅ configured (`eslint.config.mjs`) |
| OpenRouter via server route | ⚠️ `src/app/api/ai/coach/route.ts` exists with zod validation, mock fallback when no key, structured response schema — but **no auth check, no per-user daily quota enforcement, no rate limiting/429** |
| `.env.local` / real credentials | ❌ not present — only `.env.example`. No live Supabase project or OpenRouter key configured in this environment |
| `docs/decisions.md` | ❌ not present yet |
| `progress.json` | ❌ not present yet (created this pass) |

### Existing app behavior (`src/app/page.tsx`)

Single-file client component. Lesson list, quiz questions, XP/hearts/streak header, and the "Voice Coach" modal are all **hardcoded local arrays and inline JSX** — not fetched from Supabase, no CEFR structure, no course/unit hierarchy, no gems, no quests, no boss fights, no streak-freeze. XP/hearts/streak changes happen **only in the client Zustand store** (`src/lib/learning-store.ts`), persisted to `localStorage` — nothing is written to Supabase, so none of it is currently server-validated. This directly conflicts with the spec's anti-cheat requirements (§9/§12) and is the most important gap to close before any of this can be called "production."

No reusable `Button`, `Heartbar`, `Streak`, or `XpBar` components exist — the header stats and buttons are inlined directly in `page.tsx`.

### PWA / offline

- `src/app/manifest.ts` — minimal manifest, references `/icon-192.png` and `/icon-512.png` which **do not exist** in `public/` (only default Next.js SVGs are present).
- `public/sw.js` — basic cache-first service worker, registered via `src/components/ServiceWorkerRegistration.tsx`.
- `src/lib/offline-sync.ts` — present, not yet reviewed in depth.

### Content

No CEFR course content exists anywhere (no seed data, no content JSON/SQL) beyond the four hardcoded lessons/questions in `page.tsx` for German only. None of the 11 target languages have real content yet.

### Localization / SEO (M05/M06)

No `[locale]` routing, no `learn-[target]` pages, no hreflang, no JSON-LD, no sitemap, no `/llms.txt` or `/llms-full.txt`. Not started.

### Testing

- Unit: Vitest configured, 1 test file covering the learning store.
- E2E: Playwright not installed at all.
- No tests exist yet for auth, hearts, streaks, XP, AI quota, 429s, or SEO pages.

### Git state

- Single commit in history: `ad04a24 Initial commit from Create Next App`.
- Everything described above beyond the CRA/Next scaffold is **uncommitted working-tree state** (see `git status`). Nothing has been lost; it just hasn't been committed yet.

### Environment variables

Documented in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `NEXT_PUBLIC_APP_URL`. None are currently set in this environment (no `.env.local`). The AI coach route has a mock fallback for this exact situation; Supabase-backed features (auth, persistence, RLS-tested queries) cannot be exercised against a real project until credentials are supplied.

## 2026-09-08 — M01 (Core Scaffold & PWA)

Implemented, not yet verified by tooling (see blocker below):

- Fixed the manifest's broken icon references (`/icon-192.png`, `/icon-512.png` pointed at files that didn't exist) by generating them properly via Next's `next/og` `ImageResponse` route convention at [`src/app/icon-192.png/route.tsx`](../src/app/icon-192.png/route.tsx) and [`icon-512.png/route.tsx`](../src/app/icon-512.png/route.tsx) — confirmed this is the correct pattern against `node_modules/next/dist/docs/.../app-icons.md` before writing it, per `AGENTS.md`.
- Added the design-token palette from the spec (canvas/brand/brand-shadow/surface/success/warning/danger) as Tailwind v4 `@theme` tokens in [`globals.css`](../src/app/globals.css), plus a visible `:focus-visible` ring and a `.touch-target` (44px) utility.
- Added script-aware font loading in [`layout.tsx`](../src/app/layout.tsx): Fredoka for Latin scripts, Noto Sans Thai/SC/JP/KR for the other target scripts, wired via `:lang()` selectors in `globals.css` so any element with the right `lang` attribute gets the correct font, line-height, and word-breaking.
- Built the reusable components the milestone calls for: [`Button`](../src/components/ui/Button.tsx) (tactile — visible bottom shadow, active-state press, 44px touch target, disabled state), [`Heartbar`](../src/components/Heartbar.tsx), [`StreakBadge`](../src/components/StreakBadge.tsx), [`XpBar`](../src/components/XpBar.tsx), [`MobileNav`](../src/components/MobileNav.tsx), and [`LoadingState`](../src/components/states/LoadingState.tsx)/[`ErrorState`](../src/components/states/ErrorState.tsx)/[`EmptyState`](../src/components/states/EmptyState.tsx).
- Refactored [`page.tsx`](../src/app/page.tsx) and [`login/page.tsx`](../src/app/login/page.tsx) to use these components instead of one-off inline markup, without changing existing behavior (lesson/quiz flow, voice coach modal, magic-link login are unchanged).
- Added a bottom `MobileNav` with four destinations. Only "Lernen" and "Coach" are real; "Quests" and "Profil" honestly render `EmptyState` saying they're not implemented yet, rather than faking content — quests/profile are M02/M04/M12 scope, not M01.

**Not done in this pass**: Framer Motion is still unused (no components need subtle animation yet — will pick this up when lesson transitions/boss-fight feedback are built in M04). `offline-sync.ts` was reviewed but not yet wired into a UI offline indicator.

### Blocker: iCloud sync is breaking the toolchain

`npx tsc --noEmit`, `npm run lint`, and `npm test` all failed the same way: `ETIMEDOUT` on `fs.readFileSync`/`readSync`, or (for `tsc`) hung indefinitely (14+ minutes, ~1s actual CPU time — i.e. blocked on I/O, not computing).

Root cause, confirmed via `brctl status`: this project lives at `~/Documents/Polymath Productions/sprachelernapp`, inside the user's iCloud Drive-synced Documents folder. `node_modules` has thousands of small files that iCloud tracks as sync placeholders. The iCloud sync daemon (`bird`) was observed pinned at ~80% CPU, account-wide (syncing unrelated projects too, e.g. `~/Documents/ghostgame/Farm`), and `brctl status` showed active/pending downloads for files inside this project's `node_modules` at the moment `tsc`/`eslint`/`vitest` tried to read them.

Attempted fix: `brctl download` on the project directory to force materialization. This did not resolve within the session — `brctl status` itself started taking 90–120s to return, and 3 items under `sprachelernapp` were still listed as pending downloads afterward. Killed the hung `tsc` process rather than let it run indefinitely.

This is an environment/infrastructure issue, not a defect in the code changes above. It blocks every remaining quality gate (`tsc`, `lint`, `test`, `build`, and any future Playwright run) until resolved — flagged to the user directly rather than guessed at further.

## 2026-09-08 — M02 (Database & Security) and M03 (AI route hardening), code-only

Per the user's decision: continuing to write code while they resolve the iCloud sync blocker on their end, without running the toolchain myself in the meantime. Everything in this section is **unverified** — no `tsc`/`lint`/`test`/`build` has run against it.

- Replaced the untracked, never-applied `supabase/migrations/001_core.sql` scaffold with [`001_production.sql`](../supabase/migrations/001_production.sql), covering every data area the spec lists: `languages`, `courses`, `units`, `lessons`, `exercises`, `vocabulary`, `profiles`, `user_progress`, `hearts`, `streaks`, `gems` (+ `gem_transactions`/`xp_transactions` audit ledgers), `ai_usage`, `quests`/`user_quests`.
- All gamification mutation happens through `SECURITY DEFINER` functions (`complete_lesson`, `spend_heart`, `sync_hearts`, `check_and_increment_ai_quota`, `purchase_freeze_shield`, `ensure_daily_quests`) that re-check `auth.uid()`, use server time only, and take row locks or a single atomic guarded `UPDATE` to stay race-safe under concurrent requests. RLS on those tables grants `authenticated` select-only on their own row — no client write path exists. Full reasoning in [`docs/decisions.md`](decisions.md).
- Hardened [`src/app/api/ai/coach/route.ts`](../src/app/api/ai/coach/route.ts): now requires an authenticated Supabase session (401 if missing), calls `check_and_increment_ai_quota` before ever touching OpenRouter (429 once the server-tracked daily count of 5 is hit), and wraps the upstream call in an `AbortController` timeout (504 on timeout, distinct from the existing 502 for a bad/failed upstream response). The offline/test mock fallback is unchanged in behavior but now tagged with an `X-Coach-Mode: offline-fallback` response header so it's identifiable, and it still only activates when no real key is configured — never as a silent fallback after a failed real call.

**Not done yet**: the migration and RPC functions have not been run against a real Postgres/Supabase instance (no credentials in this environment) — no live syntax or logic check has happened, only careful manual review. `docs/execution-log.md`'s standing recommendation is to run this migration against a scratch Supabase project (or `supabase db reset` locally) and exercise the concurrency-sensitive functions (`spend_heart`, `check_and_increment_ai_quota`) with concurrent requests before trusting them in production. Quest catalog is seeded (3 daily quest templates) but no quest UI consumes `ensure_daily_quests`/`user_quests` yet — that's M04/M12 (gamification UI) scope. No course/unit/lesson/exercise content has been seeded yet — schema only, content is M04.

### Assessment

The spec (`AGENTS.md` user prompt) describes a full production build: 11-language CEFR content (A1–C2), server-validated gamification, an AI coach with quota enforcement, full SEO/locale routing, `llms.txt`, and a Playwright suite. The current state is an early **UI/UX prototype** with a plausible visual design and a working (mocked) AI route, but almost none of the server-side correctness, content, or SEO infrastructure exists yet. This is a multi-milestone body of work, not a single-session task. Proceeding milestone-by-milestone per `progress.json`, starting with M01.
