-- ============================================================
-- migration-004-learning-goals.sql
-- 学习目标系统：支持年/月/周目标层级，进度追踪
-- ============================================================

-- 1. 学习目标表
create table public.learning_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null check (period in ('yearly', 'monthly', 'weekly')),
  title text not null,
  description text not null default '',
  -- 进度追踪（单位由用户自定义：章/节/页/套题等）
  total_units integer not null default 1,
  completed_units integer not null default 0,
  -- 目标时间范围
  start_date date not null default current_date,
  target_date date,
  -- 层级关系：weekly -> monthly -> yearly
  parent_goal_id uuid references public.learning_goals(id) on delete set null,
  -- 状态
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  -- 元数据
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 索引
create index idx_learning_goals_user_period on public.learning_goals(user_id, period);
create index idx_learning_goals_user_parent on public.learning_goals(user_id, parent_goal_id);
create index idx_learning_goals_dates on public.learning_goals(user_id, start_date, target_date);

-- RLS
alter table public.learning_goals enable row level security;

create policy "Users can read own goals"
  on public.learning_goals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.learning_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.learning_goals for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.learning_goals for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. 给 tasks 表添加 goal_id 字段（可选关联）
alter table public.tasks add column if not exists goal_id uuid references public.learning_goals(id) on delete set null;

create index idx_tasks_goal_id on public.tasks(goal_id) where goal_id is not null;

-- 3. updated_at 自动更新触发器
create or replace function public.update_learning_goals_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_learning_goals_updated_at
  before update on public.learning_goals
  for each row execute function public.update_learning_goals_updated_at();

-- 4. 完成任务时自动更新目标进度
create or replace function public.update_goal_progress_on_task_complete()
returns trigger as $$
begin
  -- 只有当任务关联了目标且状态变为 completed 时才更新
  if new.goal_id is not null and new.status = 'completed' and (old.status is null or old.status != 'completed') then
    update public.learning_goals
    set completed_units = completed_units + 1
    where id = new.goal_id;

    -- 检查目标是否完成
    update public.learning_goals
    set status = 'completed'
    where id = new.goal_id
      and completed_units >= total_units
      and status = 'active';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_update_goal_progress
  after update on public.tasks
  for each row execute function public.update_goal_progress_on_task_complete();
