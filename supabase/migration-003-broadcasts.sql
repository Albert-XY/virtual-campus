-- 播报表
create table public.broadcasts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content_type text not null default 'text' check (content_type in ('text', 'image', 'video')),
  content text not null default '',
  media_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.broadcasts enable row level security;

-- 所有已认证用户可读播报
create policy "Authenticated users can read broadcasts"
  on public.broadcasts for select
  to authenticated
  using (is_published = true);

-- 管理员可创建播报（暂时允许所有认证用户创建，后续可限制）
create policy "Authenticated users can create broadcasts"
  on public.broadcasts for insert
  to authenticated
  with check (true);

create policy "Broadcasts creator can update"
  on public.broadcasts for update
  to authenticated
  using (auth.uid() = created_by);

-- 播报已读记录
create table public.broadcast_views (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(user_id, broadcast_id)
);

alter table public.broadcast_views enable row level security;

create policy "Users can read own views"
  on public.broadcast_views for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own views"
  on public.broadcast_views for insert
  to authenticated
  with check (auth.uid() = user_id);
