-- ============================================================
-- Virtual Campus - Supabase Schema
-- ============================================================
-- 包含所有建表语句、RLS 策略和触发器
-- ============================================================

-- 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. 用户表 (profiles)
-- ============================================================
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  nickname text not null default '',
  avatar_url text,
  total_points integer not null default 0,
  current_level integer not null default 1,
  created_at timestamptz not null default now()
);

-- RLS: 用户只能读写自己的 profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- 2. 每日计划表 (daily_plans)
-- ============================================================
create table public.daily_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null default current_date,
  study_blocks jsonb not null default '[]'::jsonb,
  rest_blocks jsonb not null default '[]'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, plan_date)
);

create index idx_daily_plans_user_date on public.daily_plans(user_id, plan_date);

-- RLS
alter table public.daily_plans enable row level security;

create policy "Users can view own plans"
  on public.daily_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own plans"
  on public.daily_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plans"
  on public.daily_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own plans"
  on public.daily_plans for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 3. 场景签到表 (scene_checkins)
-- ============================================================
create type scene_type as enum (
  'library',
  'study-room',
  'exam-center',
  'sports',
  'canteen',
  'dormitory',
  'bulletin',
  'shop'
);

create table public.scene_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.daily_plans(id) on delete set null,
  scene scene_type not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  duration_minutes integer,
  points_earned integer not null default 0,
  is_in_study_block boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_scene_checkins_user on public.scene_checkins(user_id);
create index idx_scene_checkins_plan on public.scene_checkins(plan_id);

-- RLS
alter table public.scene_checkins enable row level security;

create policy "Users can view own checkins"
  on public.scene_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert own checkins"
  on public.scene_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can update own checkins"
  on public.scene_checkins for update
  using (auth.uid() = user_id);

-- ============================================================
-- 4. 番茄钟会话表 (pomodoro_sessions)
-- ============================================================
create table public.pomodoro_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_id uuid references public.scene_checkins(id) on delete set null,
  scene scene_type not null,
  focus_minutes integer not null default 25,
  break_minutes integer not null default 5,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_pomodoro_sessions_user on public.pomodoro_sessions(user_id);
create index idx_pomodoro_sessions_checkin on public.pomodoro_sessions(checkin_id);

-- RLS
alter table public.pomodoro_sessions enable row level security;

create policy "Users can view own pomodoro sessions"
  on public.pomodoro_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own pomodoro sessions"
  on public.pomodoro_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pomodoro sessions"
  on public.pomodoro_sessions for update
  using (auth.uid() = user_id);

-- ============================================================
-- 5. 积分日志表 (points_logs)
-- ============================================================
create table public.points_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  type text not null,
  description text not null default '',
  related_id uuid,
  created_at timestamptz not null default now()
);

create index idx_points_logs_user on public.points_logs(user_id);
create index idx_points_logs_type on public.points_logs(type);

-- RLS
alter table public.points_logs enable row level security;

create policy "Users can view own points logs"
  on public.points_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own points logs"
  on public.points_logs for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 6. 任务表 (tasks)
-- ============================================================
create type task_status as enum ('pending', 'in_progress', 'completed');

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.daily_plans(id) on delete cascade,
  task_index integer not null,
  task_type text not null,
  subject text not null,
  topic text not null,
  estimated_minutes integer not null,
  actual_minutes integer,
  accuracy_rate numeric(5, 4),
  points_earned integer not null default 0,
  status task_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_tasks_user on public.tasks(user_id);
create index idx_tasks_plan on public.tasks(plan_id);
create index idx_tasks_status on public.tasks(status);

-- RLS
alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 7. 睡眠记录表 (sleep_logs)
-- ============================================================
create table public.sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  sleep_time text not null,
  wake_time text not null,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create index idx_sleep_logs_user on public.sleep_logs(user_id);
create index idx_sleep_logs_date on public.sleep_logs(log_date);

-- RLS
alter table public.sleep_logs enable row level security;

create policy "Users can view own sleep logs"
  on public.sleep_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own sleep logs"
  on public.sleep_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sleep logs"
  on public.sleep_logs for update
  using (auth.uid() = user_id);

-- ============================================================
-- 触发器函数
-- ============================================================

-- 触发器1: 新用户注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- 触发器2: 签到时自动计算积分
create or replace function public.calculate_checkin_points()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_points integer := 0;
  v_plan record;
  v_current_time text;
  v_in_block boolean;
begin
  v_current_time := to_char(now(), 'HH24:MI');

  -- 如果关联了计划，判断是否在学习时间段内
  if new.plan_id is not null then
    select study_blocks into v_plan
    from public.daily_plans
    where id = new.plan_id;

    if v_plan is not null then
      v_in_block := exists (
        select 1
        from jsonb_array_elements(v_plan.study_blocks) as block
        where v_current_time >= (block->>'start') and v_current_time <= (block->>'end')
      );
      new.is_in_study_block := coalesce(v_in_block, false);

      if v_in_block then
        v_points := 10;
      else
        v_points := 5;
      end if;
    else
      v_points := 5;
    end if;
  else
    v_points := 5;
  end if;

  new.points_earned := v_points;

  -- 更新用户总积分
  update public.profiles
  set total_points = total_points + v_points
  where id = new.user_id;

  -- 记录积分日志
  insert into public.points_logs (user_id, points, type, description, related_id)
  values (new.user_id, v_points, 'scene_checkin', '场景签到: ' || new.scene::text, new.id);

  return new;
end;
$$;

-- 触发器3: 完成任务时自动计算积分
create or replace function public.calculate_task_points()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_points integer := 0;
  v_plan record;
  v_current_time text;
  v_in_block boolean;
  v_last_end text;
  v_over_minutes integer;
  v_is_over boolean;
begin
  -- 仅在状态变为 completed 时计算
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    new.completed_at := now();
    v_current_time := to_char(now(), 'HH24:MI');

    -- 获取关联计划
    select study_blocks into v_plan
    from public.daily_plans
    where id = new.plan_id;

    if v_plan is not null then
      -- 检查是否在学习时间段内
      v_in_block := exists (
        select 1
        from jsonb_array_elements(v_plan.study_blocks) as block
        where v_current_time >= (block->>'start') and v_current_time <= (block->>'end')
      );

      -- 检查是否超出学习时间
      select max((block->>'end')::text) into v_last_end
      from jsonb_array_elements(v_plan.study_blocks) as block;

      if v_last_end is not null then
        v_is_over := v_current_time > v_last_end;
        if v_is_over then
          v_over_minutes := extract(epoch from (now()::time - v_last_end::time)) / 60;
        else
          v_over_minutes := 0;
        end if;
      else
        v_is_over := false;
        v_over_minutes := 0;
      end if;

      -- 计算积分
      if v_is_over then
        if v_over_minutes > 120 then
          v_points := 0;
        elsif v_over_minutes > 60 then
          v_points := 2;
        else
          v_points := 5;
        end if;
      elsif not v_in_block then
        v_points := 5;
      else
        v_points := 10;
        if new.accuracy_rate is not null and new.accuracy_rate > 0.9 then
          v_points := v_points + 5;
        end if;
      end if;
    else
      v_points := 5;
    end if;

    new.points_earned := v_points;

    -- 更新用户总积分
    update public.profiles
    set total_points = total_points + v_points
    where id = new.user_id;

    -- 记录积分日志
    insert into public.points_logs (user_id, points, type, description, related_id)
    values (
      new.user_id,
      v_points,
      'task_complete',
      '完成任务: ' || new.subject || ' - ' || new.topic,
      new.id
    );

    -- 检查是否满足每日奖励条件 (完成4个及以上任务)
    declare
      v_completed_count integer;
      v_bonus integer := 0;
    begin
      select count(*) into v_completed_count
      from public.tasks
      where plan_id = new.plan_id
        and status = 'completed'
        and id != new.id;

      v_completed_count := v_completed_count + 1;

      if v_completed_count >= 4 then
        -- 检查是否已经发放过每日奖励
        if not exists (
          select 1 from public.points_logs
          where user_id = new.user_id
            and type = 'daily_bonus'
            and date(created_at) = current_date
        ) then
          v_bonus := 15;
          update public.profiles
          set total_points = total_points + v_bonus
          where id = new.user_id;

          insert into public.points_logs (user_id, points, type, description, related_id)
          values (new.user_id, v_bonus, 'daily_bonus', '每日完成奖励 (完成4个任务)', new.plan_id);
        end if;
      end if;
    end;
  end if;

  return new;
end;
$$;

-- 触发器4: 睡眠记录自动计算积分
create or replace function public.calculate_sleep_points()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_hours integer;
  v_minutes integer;
  v_total_minutes integer;
  v_points integer := 0;
begin
  -- 解析睡眠时间 HH:MM
  v_hours := split_part(new.sleep_time, ':', 1)::integer;
  v_minutes := split_part(new.sleep_time, ':', 2)::integer;
  v_total_minutes := v_hours * 60 + v_minutes;

  -- 22:30 之前入睡: 15分, 23:00 之前: 8分, 其他: 0分
  if v_total_minutes <= 22 * 60 + 30 then
    v_points := 15;
  elsif v_total_minutes <= 23 * 60 then
    v_points := 8;
  else
    v_points := 0;
  end if;

  new.points_earned := v_points;

  -- 更新用户总积分
  update public.profiles
  set total_points = total_points + v_points
  where id = new.user_id;

  -- 记录积分日志
  insert into public.points_logs (user_id, points, type, description, related_id)
  values (new.user_id, v_points, 'sleep', '睡眠打卡: ' || new.sleep_time, new.id);

  return new;
end;
$$;

-- 触发器5: 番茄钟完成时计算积分
create or replace function public.calculate_pomodoro_points()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_points integer := 0;
begin
  if new.is_completed and (old.is_completed is null or old.is_completed = false) then
    new.ended_at := now();
    v_points := new.focus_minutes; -- 每专注1分钟得1分

    update public.profiles
    set total_points = total_points + v_points
    where id = new.user_id;

    insert into public.points_logs (user_id, points, type, description, related_id)
    values (new.user_id, v_points, 'pomodoro', '番茄钟完成: ' || new.focus_minutes || '分钟', new.id);
  end if;

  return new;
end;
$$;

-- ============================================================
-- 绑定触发器
-- ============================================================

-- 新用户注册 -> 创建 profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 场景签到 -> 计算积分
create trigger on_scene_checkin_created
  before insert on public.scene_checkins
  for each row execute procedure public.calculate_checkin_points();

-- 任务完成 -> 计算积分
create trigger on_task_updated
  before update on public.tasks
  for each row execute procedure public.calculate_task_points();

-- 睡眠记录 -> 计算积分
create trigger on_sleep_log_created
  before insert on public.sleep_logs
  for each row execute procedure public.calculate_sleep_points();

-- 番茄钟完成 -> 计算积分
create trigger on_pomodoro_updated
  before update on public.pomodoro_sessions
  for each row execute procedure public.calculate_pomodoro_points();
