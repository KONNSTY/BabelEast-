# Architecture decisions

## Server-authoritative gamification (hearts, streak, gems, XP)

All mutable gamification state lives in dedicated tables (`hearts`, `streaks`, `gems`, `xp_transactions`, `gem_transactions`, `ai_usage`, `user_quests`) instead of columns on `profiles`. RLS on these tables grants `authenticated` **select-only** access to the caller's own row — there is no client `INSERT`/`UPDATE`/`DELETE` grant at all. Every mutation goes through a `SECURITY DEFINER` Postgres function (`complete_lesson`, `spend_heart`, `sync_hearts`, `check_and_increment_ai_quota`, `purchase_freeze_shield`, `ensure_daily_quests`) that:

- re-checks `auth.uid() = p_user_id` itself (defense in depth beyond the RLS gate on the RPC call),
- uses `now()` / `current_date` (server clock) for every time-based calculation, never a client-submitted timestamp,
- takes a row lock (`for update`, or a single atomic `UPDATE ... WHERE <guard>`) so concurrent requests from the same user can't double-award XP, double-spend gems, or over-regenerate hearts.

Internal helper functions (`update_streak_on_activity`, `earn_gems`, `record_quest_event`, `spend_gems`) have `execute` explicitly revoked from `public`/`authenticated` — they only run as a side effect of the client-facing functions above, so a client can't call them directly to fabricate progress.

**Why:** the spec is explicit that XP/hearts/gems must never be settable by the client, and that parallel requests must not create extra reward. A ledger-style audit trail (`xp_transactions`, `gem_transactions`) also gives an honest history for future admin tooling without needing to trust a running total anyone could tamper with.

## `001_core.sql` → `001_production.sql`

The repo had an untracked, never-applied `supabase/migrations/001_core.sql` scaffold (single `lessons` table, gamification columns bolted onto `profiles`). Since no live Supabase project has ever run it (no `.env.local`, confirmed in `docs/execution-log.md`), it was replaced outright with `001_production.sql` rather than layered under a second migration — cleaner for a schema that has never touched a real database, and matches the filename the build spec asked for.

## Course content hierarchy

`courses` (one row per target language) → `units` (CEFR module, e.g. "A1 Unit 3") → `lessons` → `exercises`, plus a `vocabulary` table scoped to a course (optionally a unit). RLS exposes only `is_published = true` courses (cascading through the join chain for units/lessons/exercises/vocabulary), so draft content authored for M04 doesn't leak until it's ready.

**Known trade-off:** `exercises.solution` is readable by any authenticated client once its course is published (same as the original scaffold's `lessons readable using (true)` policy) — the current quiz UI checks answers client-side. This doesn't allow XP/heart/streak cheating (those are only ever granted server-side by `complete_lesson`, which doesn't trust the client's reported correctness beyond the score it's given), it only means a determined user could peek at answers before answering. Revisit if/when exercises move to server-side answer checking.

## AI coach route hardening (M03)

`src/app/api/ai/coach/route.ts` originally had no auth check and no quota enforcement — any request (even unauthenticated) could hit OpenRouter. It now requires a valid Supabase session and calls `check_and_increment_ai_quota` before calling OpenRouter, returning `429` once the server-tracked daily count is exhausted. The mock fallback (no `OPENROUTER_API_KEY` configured) still runs after the quota check, so local/offline development still exercises the same quota logic instead of silently bypassing it.

## PWA icons generated via `next/og`, not static binaries

`manifest.ts` referenced `/icon-192.png` and `/icon-512.png`, but no such files existed in `public/`. Rather than invent placeholder binary assets, `src/app/icon-192.png/route.tsx` and `icon-512.png/route.tsx` generate them at request time via Next's `ImageResponse` (`next/og`), confirmed against `node_modules/next/dist/docs/.../app-icons.md` as the supported convention for this Next version. Real brand-colored icons, not a fake placeholder.

## Mobile nav: honest empty states over fake screens

The bottom `MobileNav` (M01) ships four destinations per spec, but only "Lernen" and "Coach" have real content right now. "Quests" and "Profil" render `EmptyState` explicitly saying the feature isn't built yet, rather than a dummy screen that looks finished. This follows the spec's own rule against claiming unfinished features are done.

## Environment blocker: iCloud Drive sync breaks the toolchain

The project directory lives under the user's iCloud Drive-synced Documents folder. `node_modules` is tracked as thousands of iCloud sync placeholders; `tsc`/`eslint`/`vitest` reading many of them in quick succession hit `ETIMEDOUT` or hang indefinitely waiting on the `bird` sync daemon (observed pinned at ~80% CPU, syncing unrelated projects on the same account). `brctl download` was tried and did not resolve it within a session. See `docs/execution-log.md` and `progress.json.open_blockers` for the full record — this blocks `tsc --noEmit`, `lint`, `test`, `build`, and any Playwright run until the user resolves it locally (keep the project folder downloaded/pinned, or move it outside an iCloud-synced path).
