-- linguaflow production schema
-- Covers: profiles, languages, courses, units, lessons, exercises, vocabulary,
-- user_progress, quests, hearts, streaks, gems (+ audit ledgers), ai_usage.
--
-- Design principles enforced here:
--  * All gamification state (hearts, streak, gems, xp) lives server-side and is
--    only ever mutated through SECURITY DEFINER functions using server time
--    (now()) — never by direct client INSERT/UPDATE on those tables, and never
--    by trusting a client-submitted amount.
--  * Row-level locking (`for update`, or a single atomic UPDATE ... WHERE
--    guard) is used everywhere concurrent requests could otherwise double-award
--    or double-spend (heart regen, AI quota, gem spend, streak update).
--  * RLS is enabled on every user-scoped table; policies only ever expose a
--    user's own rows, and course/content tables are readable but not writable
--    by the `authenticated` role.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Content hierarchy: languages -> courses -> units (CEFR modules) -> lessons -> exercises
-- ---------------------------------------------------------------------------

create table if not exists public.languages (
  code text primary key check (length(code) = 2),
  name text not null,
  native_name text not null,
  is_active boolean not null default true
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  target_language_code text not null references public.languages(code),
  slug text not null unique,
  title text not null,
  description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courses_target_language_idx on public.courses(target_language_code);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  level text not null check (level in ('A1','A2','B1','B2','C1','C2')),
  slug text not null,
  title text not null,
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, slug)
);
create index if not exists units_course_order_idx on public.units(course_id, order_index);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  slug text not null,
  title text not null,
  lesson_type text not null default 'standard' check (lesson_type in ('standard', 'boss_fight')),
  order_index integer not null,
  xp_reward smallint not null default 10 check (xp_reward between 0 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(unit_id, slug)
);
create index if not exists lessons_unit_order_idx on public.lessons(unit_id, order_index);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  order_index integer not null,
  exercise_type text not null check (exercise_type in ('multiple_choice', 'translation', 'listening', 'speaking', 'fill_blank', 'matching')),
  prompt jsonb not null,
  solution jsonb not null,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id, order_index)
);
create index if not exists exercises_lesson_order_idx on public.exercises(lesson_id, order_index);

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  term text not null,
  translation text not null,
  pronunciation_hint text,
  part_of_speech text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vocabulary_course_idx on public.vocabulary(course_id);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Learner',
  native_language text not null default 'en' references public.languages(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists exercise_attempts_user_lesson_idx on public.exercise_attempts(user_id, lesson_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------------

create table if not exists public.user_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  best_score smallint not null default 0 check (best_score between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists user_progress_user_idx on public.user_progress(user_id);

-- ---------------------------------------------------------------------------
-- Gamification state — server-authoritative, mutated only via functions below
-- ---------------------------------------------------------------------------

create table if not exists public.hearts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  count smallint not null default 5 check (count between 0 and 5),
  last_regen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date date,
  timezone text not null default 'UTC',
  freeze_shields smallint not null default 0 check (freeze_shields >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.gems (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.gem_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('lesson_complete', 'boss_fight', 'quest_reward', 'streak_freeze_purchase', 'admin_adjustment')),
  created_at timestamptz not null default now()
);
create index if not exists gem_transactions_user_idx on public.gem_transactions(user_id, created_at desc);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount >= 0 and amount <= 200),
  lesson_id uuid references public.lessons(id) on delete set null,
  reason text not null check (reason in ('lesson_complete', 'boss_fight', 'quest_reward', 'ai_coach')),
  created_at timestamptz not null default now()
);
create index if not exists xp_transactions_user_idx on public.xp_transactions(user_id, created_at desc);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  prompts_used smallint not null default 0 check (prompts_used between 0 and 5),
  primary key (user_id, usage_date)
);

-- ---------------------------------------------------------------------------
-- Quests
-- ---------------------------------------------------------------------------

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  goal_type text not null check (goal_type in ('lessons_completed', 'xp_earned', 'ai_coach_session')),
  goal_count integer not null check (goal_count > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0 and xp_reward <= 200),
  gem_reward integer not null default 0 check (gem_reward >= 0 and gem_reward <= 200),
  is_active boolean not null default true
);

create table if not exists public.user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  assigned_date date not null default current_date,
  progress integer not null default 0 check (progress >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, quest_id, assigned_date)
);
create index if not exists user_quests_user_date_idx on public.user_quests(user_id, assigned_date);

-- ---------------------------------------------------------------------------
-- updated_at maintenance for directly-editable tables (content + profile)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
#variable_conflict use_column
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.courses;
create trigger set_updated_at before update on public.courses for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.units;
create trigger set_updated_at before update on public.units for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.lessons;
create trigger set_updated_at before update on public.lessons for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.exercises;
create trigger set_updated_at before update on public.exercises for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.vocabulary;
create trigger set_updated_at before update on public.vocabulary for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile row + default gamification rows in one trigger
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_name text;
begin
  v_name := btrim(coalesce(new.raw_user_meta_data->>'name', ''));
  if v_name = '' then
    v_name := 'Learner';
  end if;
  insert into public.profiles(id, display_name)
    values (new.id, left(v_name, 80));
  insert into public.hearts(user_id) values (new.id);
  insert into public.streaks(user_id) values (new.id);
  insert into public.gems(user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Hearts: max 5, +1 every 4h, server clock only, race-safe via row lock
-- ---------------------------------------------------------------------------

create or replace function public.sync_hearts(p_user_id uuid)
returns table (count smallint, next_regen_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_row public.hearts%rowtype;
  v_intervals integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  select * into v_row from public.hearts where user_id = p_user_id for update;
  if not found then
    insert into public.hearts(user_id) values (p_user_id) returning * into v_row;
  end if;

  if v_row.count < 5 then
    v_intervals := floor(extract(epoch from (now() - v_row.last_regen_at)) / (4 * 3600))::integer;
    if v_intervals > 0 then
      update public.hearts as hearts
        set count = least(5, hearts.count + v_intervals),
            last_regen_at = hearts.last_regen_at + (v_intervals * interval '4 hours'),
            updated_at = now()
        where hearts.user_id = p_user_id
        returning * into v_row;
    end if;
  end if;

  return query select v_row.count, case when v_row.count >= 5 then null else v_row.last_regen_at + interval '4 hours' end;
end;
$$;

create or replace function public.spend_heart(p_user_id uuid)
returns table (count smallint, next_regen_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_row public.hearts%rowtype;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  -- apply any pending regeneration first, under the same row lock
  perform public.sync_hearts(p_user_id);

  select * into v_row from public.hearts where user_id = p_user_id for update;
  if v_row.count <= 0 then
    raise exception 'no_hearts_left' using errcode = 'P0001';
  end if;

  update public.hearts as hearts
    set count = hearts.count - 1,
        last_regen_at = case when hearts.count = 5 then now() else hearts.last_regen_at end,
        updated_at = now()
    where hearts.user_id = p_user_id
    returning * into v_row;

  return query select v_row.count, v_row.last_regen_at + interval '4 hours';
end;
$$;

-- ---------------------------------------------------------------------------
-- Streak update — idempotent per calendar day (in the user's own timezone),
-- consumes a freeze shield automatically to bridge exactly one missed day.
-- ---------------------------------------------------------------------------

create or replace function public.update_streak_on_activity(p_user_id uuid)
returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_row public.streaks%rowtype;
  v_today date;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  select * into v_row from public.streaks where user_id = p_user_id for update;
  if not found then
    insert into public.streaks(user_id, current_streak, longest_streak, last_active_date)
      values (p_user_id, 1, 1, current_date);
    return;
  end if;

  v_today := (now() at time zone coalesce(v_row.timezone, 'UTC'))::date;

  if v_row.last_active_date = v_today then
    return; -- already counted today — idempotent against duplicate lesson completions
  elsif v_row.last_active_date = v_today - 1 then
    update public.streaks
      set current_streak = current_streak + 1,
          longest_streak = greatest(longest_streak, current_streak + 1),
          last_active_date = v_today,
          updated_at = now()
      where user_id = p_user_id;
  elsif v_row.freeze_shields > 0 and v_row.last_active_date = v_today - 2 then
    update public.streaks
      set current_streak = current_streak + 1,
          longest_streak = greatest(longest_streak, current_streak + 1),
          freeze_shields = freeze_shields - 1,
          last_active_date = v_today,
          updated_at = now()
      where user_id = p_user_id;
  else
    update public.streaks
      set current_streak = 1,
          last_active_date = v_today,
          updated_at = now()
      where user_id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gems — spend is the only client-facing primitive; earning happens as a
-- side effect of server-validated events (see complete_lesson / quests below).
-- ---------------------------------------------------------------------------

create or replace function public.earn_gems(p_user_id uuid, p_amount integer, p_reason text)
returns integer
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_balance integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  update public.gems set balance = balance + p_amount, updated_at = now()
    where user_id = p_user_id
    returning balance into v_balance;
  if v_balance is null then
    insert into public.gems(user_id, balance) values (p_user_id, p_amount) returning balance into v_balance;
  end if;
  insert into public.gem_transactions(user_id, amount, reason) values (p_user_id, p_amount, p_reason);
  return v_balance;
end;
$$;

create or replace function public.spend_gems(p_user_id uuid, p_amount integer, p_reason text)
returns integer
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_balance integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  update public.gems set balance = balance - p_amount, updated_at = now()
    where user_id = p_user_id and balance >= p_amount
    returning balance into v_balance;
  if v_balance is null then
    raise exception 'insufficient_gems' using errcode = 'P0001';
  end if;
  insert into public.gem_transactions(user_id, amount, reason) values (p_user_id, -p_amount, p_reason);
  return v_balance;
end;
$$;

create or replace function public.purchase_freeze_shield(p_user_id uuid)
returns table (gem_balance integer, freeze_shields smallint)
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_cost constant integer := 200;
  v_balance integer;
  v_shields smallint;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  v_balance := public.spend_gems(p_user_id, v_cost, 'streak_freeze_purchase');
  update public.streaks as streaks
    set freeze_shields = streaks.freeze_shields + 1, updated_at = now()
    where streaks.user_id = p_user_id
    returning streaks.freeze_shields into v_shields;
  if not found then
    insert into public.streaks(user_id, freeze_shields) values (p_user_id, 1)
      returning freeze_shields into v_shields;
  end if;
  return query select v_balance, v_shields;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lesson completion — the only path that awards XP. The score is derived from
-- grade_exercise attempts, never from the client-supplied p_score. A result
-- under 60% is recorded as a failed attempt. Replay XP is paid at most once
-- per server day.
-- ---------------------------------------------------------------------------

create or replace function public.complete_lesson(p_user_id uuid, p_lesson_id uuid, p_score smallint)
returns table (xp_earned integer, best_score smallint, first_completion boolean)
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_lesson public.lessons%rowtype;
  v_existing public.user_progress%rowtype;
  v_first boolean;
  v_passed boolean;
  v_xp integer;
  v_score smallint;
  v_exercise_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_lesson_id::text, 0));

  select * into v_lesson
  from public.lessons l
  where l.id = p_lesson_id
    and exists (
      select 1
      from public.units u
      join public.courses c on c.id = u.course_id
      where u.id = l.unit_id and c.is_published = true
    );
  if not found then
    raise exception 'lesson_not_found' using errcode = 'P0002';
  end if;

  -- p_score stays in the signature for callers, but the score comes from attempts.
  select count(*) into v_exercise_count from public.exercises where lesson_id = p_lesson_id;
  if v_exercise_count = 0 then
    raise exception 'lesson_not_found' using errcode = 'P0002';
  end if;
  select coalesce(round(100.0 * count(latest.exercise_id) filter (where latest.correct) / v_exercise_count), 0)::smallint
    into v_score
  from public.exercises e
  left join (
    select distinct on (a.exercise_id) a.exercise_id, a.correct
    from public.exercise_attempts a
    where a.user_id = p_user_id and a.lesson_id = p_lesson_id
    order by a.exercise_id, a.created_at desc
  ) latest on latest.exercise_id = e.id
  where e.lesson_id = p_lesson_id;
  v_passed := v_score >= 60;

  select * into v_existing from public.user_progress where user_id = p_user_id and lesson_id = p_lesson_id for update;
  v_first := not found or not coalesce(v_existing.completed, false);
  if not v_passed then
    v_xp := 0;
  elsif v_first then
    v_xp := v_lesson.xp_reward;
  elsif exists (
    select 1 from public.xp_transactions
    where user_id = p_user_id
      and lesson_id = p_lesson_id
      and reason in ('lesson_complete', 'boss_fight')
      and created_at >= date_trunc('day', now())
  ) then
    v_xp := 0;
  else
    v_xp := greatest(1, v_lesson.xp_reward / 4);
  end if;

  insert into public.user_progress(user_id, lesson_id, completed, best_score, attempts, completed_at, updated_at)
    values (p_user_id, p_lesson_id, v_passed, v_score, 1, case when v_passed then now() else null end, now())
  on conflict (user_id, lesson_id) do update
    set completed = public.user_progress.completed or excluded.completed,
        best_score = greatest(public.user_progress.best_score, excluded.best_score),
        attempts = public.user_progress.attempts + 1,
        completed_at = coalesce(public.user_progress.completed_at, excluded.completed_at),
        updated_at = now();

  if v_xp > 0 then
    insert into public.xp_transactions(user_id, amount, lesson_id, reason)
      values (p_user_id, v_xp, p_lesson_id, case when v_lesson.lesson_type = 'boss_fight' then 'boss_fight' else 'lesson_complete' end);
    perform public.record_quest_event(p_user_id, 'xp_earned', v_xp);
  end if;

  if v_passed then
    perform public.update_streak_on_activity(p_user_id);
  end if;
  if v_passed and v_first then
    perform public.record_quest_event(p_user_id, 'lessons_completed', 1);
  end if;

  select coalesce(max(user_progress.best_score), v_score) into v_score
  from public.user_progress
  where user_progress.user_id = p_user_id and user_progress.lesson_id = p_lesson_id;
  return query select v_xp, v_score, (v_passed and v_first);
end;
$$;

-- ---------------------------------------------------------------------------
-- AI coach quota — max 5 prompts/user/day, atomic increment-with-guard so
-- concurrent requests cannot exceed the limit.
-- ---------------------------------------------------------------------------

create or replace function public.check_and_increment_ai_quota(p_user_id uuid)
returns table (allowed boolean, prompts_used smallint, quota_date date)
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_used smallint;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  insert into public.ai_usage(user_id, usage_date, prompts_used)
    values (p_user_id, current_date, 0)
    on conflict (user_id, usage_date) do nothing;

  update public.ai_usage as usage
    set prompts_used = usage.prompts_used + 1
    where usage.user_id = p_user_id and usage.usage_date = current_date and usage.prompts_used < 5
    returning usage.prompts_used into v_used;

  if v_used is null then
    select ai_usage.prompts_used into v_used from public.ai_usage where user_id = p_user_id and usage_date = current_date;
    return query select false, v_used, current_date;
  end if;

  perform public.record_quest_event(p_user_id, 'ai_coach_session', 1);
  return query select true, v_used, current_date;
end;
$$;

-- ---------------------------------------------------------------------------
-- Quests: 3 assigned per user per day from the active catalog; progress is
-- recorded only from server-validated events above, never directly by the client.
-- ---------------------------------------------------------------------------

create or replace function public.ensure_daily_quests(p_user_id uuid)
returns setof public.user_quests
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_open integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('daily-quests:' || p_user_id::text, 0));

  select count(*) into v_open from public.user_quests
  where user_id = p_user_id and assigned_date = current_date;
  if v_open < 3 then
    insert into public.user_quests(user_id, quest_id, assigned_date)
    select p_user_id, q.id, current_date
    from public.quests q
    where q.is_active = true
      and not exists (
        select 1 from public.user_quests uq
        where uq.user_id = p_user_id and uq.quest_id = q.id and uq.assigned_date = current_date
      )
    order by random()
    limit (3 - v_open)
    on conflict (user_id, quest_id, assigned_date) do nothing;
  end if;

  return query select * from public.user_quests where user_id = p_user_id and assigned_date = current_date;
end;
$$;

create or replace function public.record_quest_event(p_user_id uuid, p_goal_type text, p_amount integer)
returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_quest record;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  for v_quest in
    select uq.id, uq.progress, q.goal_count, q.xp_reward, q.gem_reward
    from public.user_quests uq
    join public.quests q on q.id = uq.quest_id
    where uq.user_id = p_user_id
      and uq.assigned_date = current_date
      and uq.completed = false
      and q.goal_type = p_goal_type
    for update of uq
  loop
    update public.user_quests
      set progress = least(v_quest.goal_count, v_quest.progress + p_amount),
          completed = (v_quest.progress + p_amount) >= v_quest.goal_count,
          completed_at = case when (v_quest.progress + p_amount) >= v_quest.goal_count then now() else null end
      where id = v_quest.id;

    if (v_quest.progress + p_amount) >= v_quest.goal_count then
      if v_quest.xp_reward > 0 then
        insert into public.xp_transactions(user_id, amount, reason) values (p_user_id, least(200, v_quest.xp_reward), 'quest_reward');
      end if;
      if v_quest.gem_reward > 0 then
        perform public.earn_gems(p_user_id, v_quest.gem_reward, 'quest_reward');
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.languages enable row level security;
alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.vocabulary enable row level security;
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.hearts enable row level security;
alter table public.streaks enable row level security;
alter table public.gems enable row level security;
alter table public.gem_transactions enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.quests enable row level security;
alter table public.user_quests enable row level security;

alter table public.languages force row level security;
alter table public.courses force row level security;
alter table public.units force row level security;
alter table public.lessons force row level security;
alter table public.exercises force row level security;
alter table public.exercise_attempts force row level security;
alter table public.vocabulary force row level security;
alter table public.profiles force row level security;
alter table public.user_progress force row level security;
alter table public.hearts force row level security;
alter table public.streaks force row level security;
alter table public.gems force row level security;
alter table public.gem_transactions force row level security;
alter table public.xp_transactions force row level security;
alter table public.ai_usage force row level security;
alter table public.quests force row level security;
alter table public.user_quests force row level security;

-- Content: public read of published/active rows, no client writes at all.
drop policy if exists "languages readable" on public.languages;
create policy "languages readable" on public.languages for select using (is_active = true);

drop policy if exists "courses readable" on public.courses;
create policy "courses readable" on public.courses for select using (is_published = true);

drop policy if exists "units readable" on public.units;
create policy "units readable" on public.units for select using (
  exists (select 1 from public.courses c where c.id = units.course_id and c.is_published = true)
);

drop policy if exists "lessons readable" on public.lessons;
create policy "lessons readable" on public.lessons for select using (
  exists (
    select 1 from public.units u join public.courses c on c.id = u.course_id
    where u.id = lessons.unit_id and c.is_published = true
  )
);

drop policy if exists "exercises readable" on public.exercises;
create policy "exercises readable" on public.exercises for select using (
  exists (
    select 1 from public.lessons l
    join public.units u on u.id = l.unit_id
    join public.courses c on c.id = u.course_id
    where l.id = exercises.lesson_id and c.is_published = true
  )
);

drop policy if exists "vocabulary readable" on public.vocabulary;
create policy "vocabulary readable" on public.vocabulary for select using (
  exists (select 1 from public.courses c where c.id = vocabulary.course_id and c.is_published = true)
);

drop policy if exists "quests readable" on public.quests;
create policy "quests readable" on public.quests for select using (is_active = true);

-- Profile: user manages their own display name / native language directly.
drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Everything gamification-related: the user may only ever SELECT their own
-- row. Writes happen through the SECURITY DEFINER functions above. Table
-- privileges below remove direct client writes even if a policy is missing.
drop policy if exists "exercise_attempts readable" on public.exercise_attempts;
create policy "exercise_attempts readable" on public.exercise_attempts for select using (auth.uid() = user_id);
revoke all on table public.exercise_attempts from public, anon, authenticated;
grant select on public.exercise_attempts to authenticated;

drop policy if exists "user_progress readable" on public.user_progress;
create policy "user_progress readable" on public.user_progress for select using (auth.uid() = user_id);

drop policy if exists "hearts readable" on public.hearts;
create policy "hearts readable" on public.hearts for select using (auth.uid() = user_id);

drop policy if exists "streaks readable" on public.streaks;
create policy "streaks readable" on public.streaks for select using (auth.uid() = user_id);

drop policy if exists "gems readable" on public.gems;
create policy "gems readable" on public.gems for select using (auth.uid() = user_id);

drop policy if exists "gem_transactions readable" on public.gem_transactions;
create policy "gem_transactions readable" on public.gem_transactions for select using (auth.uid() = user_id);

drop policy if exists "xp_transactions readable" on public.xp_transactions;
create policy "xp_transactions readable" on public.xp_transactions for select using (auth.uid() = user_id);

drop policy if exists "ai_usage readable" on public.ai_usage;
create policy "ai_usage readable" on public.ai_usage for select using (auth.uid() = user_id);

drop policy if exists "user_quests readable" on public.user_quests;
create policy "user_quests readable" on public.user_quests for select using (auth.uid() = user_id);

revoke all on table public.languages from public, anon, authenticated;
revoke all on table public.courses from public, anon, authenticated;
revoke all on table public.units from public, anon, authenticated;
revoke all on table public.lessons from public, anon, authenticated;
revoke all on table public.vocabulary from public, anon, authenticated;
revoke all on table public.quests from public, anon, authenticated;
grant select on public.languages to anon, authenticated;
grant select on public.courses to anon, authenticated;
grant select on public.units to anon, authenticated;
grant select on public.lessons to anon, authenticated;
grant select on public.vocabulary to anon, authenticated;
grant select on public.quests to anon, authenticated;

revoke all on table public.profiles from public, anon, authenticated;
grant select (id, display_name, native_language, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name, native_language) on public.profiles to authenticated;

revoke all on table public.user_progress from public, anon, authenticated;
revoke all on table public.hearts from public, anon, authenticated;
revoke all on table public.streaks from public, anon, authenticated;
revoke all on table public.gems from public, anon, authenticated;
revoke all on table public.gem_transactions from public, anon, authenticated;
revoke all on table public.xp_transactions from public, anon, authenticated;
revoke all on table public.ai_usage from public, anon, authenticated;
revoke all on table public.user_quests from public, anon, authenticated;
grant select on public.user_progress to authenticated;
grant select on public.hearts to authenticated;
grant select on public.streaks to authenticated;
grant select on public.gems to authenticated;
grant select on public.gem_transactions to authenticated;
grant select on public.xp_transactions to authenticated;
grant select on public.ai_usage to authenticated;
grant select on public.user_quests to authenticated;

-- ---------------------------------------------------------------------------
-- Answer keys stay on exercises.solution. Clients may read prompts through
-- exercises_public, never the solution column. grade_exercise compares the
-- answer and returns only correct/hearts.
-- ---------------------------------------------------------------------------

create or replace view public.exercises_public
with (security_invoker = true) as
  select id, lesson_id, order_index, exercise_type, prompt, explanation
  from public.exercises;

revoke all on table public.exercises from public, anon, authenticated;
grant select (id, lesson_id, order_index, exercise_type, prompt, explanation) on public.exercises to anon, authenticated;
revoke all on public.exercises_public from public, anon, authenticated;
grant select on public.exercises_public to anon, authenticated;

create or replace function public.grade_exercise(p_user_id uuid, p_exercise_id uuid, p_answer text)
returns table (correct boolean, hearts smallint)
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
declare
  v_solution jsonb;
  v_expected text;
  v_correct boolean;
  v_hearts smallint;
  v_lesson_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  select e.solution, e.lesson_id into v_solution, v_lesson_id
  from public.exercises e
  join public.lessons l on l.id = e.lesson_id
  join public.units u on u.id = l.unit_id
  join public.courses c on c.id = u.course_id
  where e.id = p_exercise_id and c.is_published = true;
  if not found then
    raise exception 'lesson_not_found' using errcode = 'P0002';
  end if;

  select synced.count into v_hearts from public.sync_hearts(p_user_id) as synced;
  if coalesce(v_hearts, 0) <= 0 then
    raise exception 'no_hearts_left' using errcode = 'P0001';
  end if;

  v_expected := case jsonb_typeof(v_solution)
    when 'string' then v_solution #>> '{}'
    else coalesce(v_solution->>'answer', '')
  end;
  if p_answer is null or char_length(p_answer) > 500 then
    v_correct := false;
  else
    v_correct := lower(btrim(p_answer)) = lower(btrim(v_expected));
  end if;

  if not v_correct then
    select spent.count into v_hearts from public.spend_heart(p_user_id) as spent;
  end if;
  insert into public.exercise_attempts(user_id, exercise_id, lesson_id, correct)
    values (p_user_id, p_exercise_id, v_lesson_id, v_correct);

  return query select v_correct, coalesce(v_hearts, 0)::smallint;
end;
$$;

create or replace function public.refund_ai_quota(p_user_id uuid)
returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
#variable_conflict use_column
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'not_authorized' using errcode = '28000';
  end if;
  update public.ai_usage as usage
    set prompts_used = greatest(0, usage.prompts_used - 1)
    where usage.user_id = p_user_id and usage.usage_date = current_date and usage.prompts_used > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function grants: only the top-level, auth-checked action functions are
-- reachable from the client. Internal helpers (update_streak_on_activity,
-- earn_gems, record_quest_event) are intentionally NOT granted to
-- `authenticated` — they only ever run as a side effect of the functions
-- below, so a client cannot call them directly to fabricate progress.
-- ---------------------------------------------------------------------------

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.update_streak_on_activity(uuid) from public, anon, authenticated;
revoke all on function public.earn_gems(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.record_quest_event(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.spend_gems(uuid, integer, text) from public, anon, authenticated;

revoke all on function public.sync_hearts(uuid) from public, anon, authenticated;
revoke all on function public.spend_heart(uuid) from public, anon, authenticated;
revoke all on function public.complete_lesson(uuid, uuid, smallint) from public, anon, authenticated;
revoke all on function public.check_and_increment_ai_quota(uuid) from public, anon, authenticated;
revoke all on function public.purchase_freeze_shield(uuid) from public, anon, authenticated;
revoke all on function public.ensure_daily_quests(uuid) from public, anon, authenticated;
revoke all on function public.grade_exercise(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.refund_ai_quota(uuid) from public, anon, authenticated;

grant execute on function public.sync_hearts(uuid) to authenticated;
grant execute on function public.spend_heart(uuid) to authenticated;
grant execute on function public.complete_lesson(uuid, uuid, smallint) to authenticated;
grant execute on function public.check_and_increment_ai_quota(uuid) to authenticated;
grant execute on function public.purchase_freeze_shield(uuid) to authenticated;
grant execute on function public.ensure_daily_quests(uuid) to authenticated;
grant execute on function public.grade_exercise(uuid, uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.refund_ai_quota(uuid) to service_role;
  end if;
end $$;

update public.profiles set display_name = 'Learner' where btrim(display_name) = '';
update public.profiles set display_name = left(btrim(display_name), 80) where char_length(display_name) > 80;
alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles
  add constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 80);

-- ---------------------------------------------------------------------------
-- Seed: languages (content + gamification catalog is seeded separately once
-- real course content lands in M04 — see docs/execution-log.md)
-- ---------------------------------------------------------------------------

insert into public.languages(code, name, native_name) values
  ('en','English','English'),
  ('de','German','Deutsch'),
  ('id','Indonesian','Bahasa Indonesia'),
  ('th','Thai','ไทย'),
  ('vi','Vietnamese','Tiếng Việt'),
  ('zh','Chinese','中文'),
  ('ja','Japanese','日本語'),
  ('ko','Korean','한국어'),
  ('es','Spanish','Español'),
  ('fr','French','Français'),
  ('it','Italian','Italiano')
on conflict (code) do nothing;

insert into public.quests(slug, title, description, goal_type, goal_count, xp_reward, gem_reward) values
  ('daily-three-lessons', 'Drei Lektionen', 'Schließe heute drei Lektionen ab.', 'lessons_completed', 3, 20, 10),
  ('daily-fifty-xp', 'XP-Sprint', 'Sammle heute 50 XP.', 'xp_earned', 50, 15, 10),
  ('daily-coach-chat', 'Coach-Gespräch', 'Übe heute einmal mit dem KI-Coach.', 'ai_coach_session', 1, 10, 5)
on conflict (slug) do nothing;
