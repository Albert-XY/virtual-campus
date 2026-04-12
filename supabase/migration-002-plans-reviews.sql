-- ============================================================
-- Virtual Campus - Migration 002: Plans & Reviews
-- ============================================================
-- 新增：周规划表、月规划表、总结表、积分触发器
-- ============================================================

-- ============================================================
-- 1.1 周规划表 weekly_plans
-- ============================================================
create table public.weekly_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null, -- 本周一日期
  goals text[] not null default '{}', -- 本周目标（字符串数组）
  focus_subjects text[] not null default '{}', -- 本周重点科目
  study_days integer[] not null default '{1,2,3,4,5}', -- 自选学习日（0=周日,1=周一...6=周六）
  notes text not null default '', -- 备注
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.weekly_plans enable row level security;
create policy "Users can CRUD own weekly plans" on public.weekly_plans for all using (auth.uid() = user_id);

-- ============================================================
-- 1.2 月规划表 monthly_plans
-- ============================================================
create table public.monthly_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null, -- 本月1号
  goals text[] not null default '{}', -- 本月目标
  focus_areas text[] not null default '{}', -- 本月重点突破方向
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month_start)
);

alter table public.monthly_plans enable row level security;
create policy "Users can CRUD own monthly plans" on public.monthly_plans for all using (auth.uid() = user_id);

-- ============================================================
-- 1.3 总结表 reviews（统一存储日/周/月总结）
-- ============================================================
create type public.review_period as enum ('daily', 'weekly', 'monthly');

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period review_period not null,
  period_start date not null, -- 日=当天, 周=本周一, 月=本月1号
  period_end date not null, -- 日=当天, 周=本周日, 月=本月最后一天
  content text not null default '', -- 总结内容（自由文字）
  tomorrow_plan text not null default '', -- 日总结：明日计划
  mood integer not null default 3, -- 心情评分 1-5（1很差 5很好）
  tasks_completed integer not null default 0, -- 完成的任务数
  tasks_total integer not null default 0, -- 总任务数
  study_minutes integer not null default 0, -- 实际学习分钟数
  planned_minutes integer not null default 0, -- 计划学习分钟数
  deviation_rate numeric(5,2) not null default 0, -- 偏差率百分比
  points_earned integer not null default 0, -- 提交总结获得的积分
  created_at timestamptz not null default now(),
  unique(user_id, period, period_start)
);

alter table public.reviews enable row level security;
create policy "Users can CRUD own reviews" on public.reviews for all using (auth.uid() = user_id);

-- ============================================================
-- 1.4 总结积分触发器
-- ============================================================
-- 提交总结时自动计算积分
-- 日总结 +2, 周总结 +5, 月总结 +10
-- 偏差率 < 10% 额外 +2（日）/ +5（周）/ +10（月）
create or replace function public.on_review_created()
returns trigger as $$
declare
  v_points integer := 0;
  v_bonus integer := 0;
begin
  case NEW.period
    when 'daily' then v_points := 2;
    when 'weekly' then v_points := 5;
    when 'monthly' then v_points := 10;
  end case;

  -- 偏差率 < 10% 额外奖励
  if NEW.deviation_rate < 10 then
    case NEW.period
      when 'daily' then v_bonus := 2;
      when 'weekly' then v_bonus := 5;
      when 'monthly' then v_bonus := 10;
    end case;
  end if;

  v_points := v_points + v_bonus;
  NEW.points_earned := v_points;

  -- 更新用户总积分
  update public.profiles set total_points = total_points + v_points where id = NEW.user_id;

  -- 写入积分日志
  insert into public.points_logs (user_id, points, type, description, related_id)
  values (
    NEW.user_id,
    v_points,
    'review',
    case NEW.period
      when 'daily' then '提交日总结' || case when v_bonus > 0 then '（规划执行大师+2）' else '' end
      when 'weekly' then '提交周总结' || case when v_bonus > 0 then '（规划执行大师+5）' else '' end
      when 'monthly' then '提交月总结' || case when v_bonus > 0 then '（规划执行大师+10）' else '' end
    end,
    NEW.id
  );

  return NEW;
end;
$$ language plpgsql;

create trigger on_review_created
  before insert on public.reviews
  for each row execute procedure public.on_review_created();

-- ============================================================
-- 1.5 规划提交积分触发器
-- ============================================================
-- 提交周规划 +5, 月规划 +10
create or replace function public.on_plan_created()
returns trigger as $$
declare
  v_points integer := 0;
  v_desc text := '';
begin
  if TG_TABLE_NAME = 'weekly_plans' then
    v_points := 5;
    v_desc := '提交周规划';
  elsif TG_TABLE_NAME = 'monthly_plans' then
    v_points := 10;
    v_desc := '提交月规划';
  end if;

  if v_points > 0 then
    update public.profiles set total_points = total_points + v_points where id = NEW.user_id;
    insert into public.points_logs (user_id, points, type, description, related_id)
    values (NEW.user_id, v_points, 'plan', v_desc, NEW.id);
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger on_weekly_plan_created
  after insert on public.weekly_plans
  for each row execute procedure public.on_plan_created();

create trigger on_monthly_plan_created
  after insert on public.monthly_plans
  for each row execute procedure public.on_plan_created();
