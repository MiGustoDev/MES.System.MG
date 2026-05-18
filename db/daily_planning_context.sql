-- Contexto diario: conversor + objetivo diario (por fecha)
create table if not exists public.daily_planning_context (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  converter_raw_text text,
  converter_data jsonb,
  daily_goal_paste text,
  daily_goal_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_daily_planning_context_date on public.daily_planning_context(date);

create or replace function public.update_daily_planning_context_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_daily_planning_context_updated_at on public.daily_planning_context;
create trigger update_daily_planning_context_updated_at
before update on public.daily_planning_context
for each row
execute function public.update_daily_planning_context_updated_at();

alter table public.daily_planning_context enable row level security;

drop policy if exists "Public access daily_planning_context" on public.daily_planning_context;
create policy "Public access daily_planning_context" on public.daily_planning_context
  for all to public using (true) with check (true);
