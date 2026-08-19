-- YT Shorts Monetization Tracker — schema (Supabase / Postgres)
-- Uruchom w Supabase → SQL Editor (albo psql). Bezpieczny do wielokrotnego odpalenia.

create table if not exists channels (
  id                  bigint generated always as identity primary key,
  name                text        not null,
  niche               text,
  handle              text,                                   -- np. @DoggyRantOfficial
  youtube_channel_id  text,                                   -- do YouTube Data API (auto-suby, później)
  sub_goal            integer     not null default 1000,
  view_goal           bigint      not null default 10000000,  -- rolling 90-day Shorts views
  start_date          date        not null default current_date,
  target_date         date        not null,
  current_subs        integer     not null default 0,
  current_views       bigint      not null default 0,         -- rolling 90-day, wpisywane ręcznie
  subs_updated_at     timestamptz,
  views_updated_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- auto-update updated_at przy każdej modyfikacji
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists channels_set_updated_at on channels;
create trigger channels_set_updated_at
  before update on channels
  for each row execute function set_updated_at();

-- RLS włączone bez polityk => klucz anon NIE ma dostępu.
-- Cały dostęp idzie przez service_role key po stronie serwera (funkcje /api),
-- który omija RLS. Nigdy nie wystawiaj service_role key w przeglądarce.
alter table channels enable row level security;

-- indeks pod rotację/sortowanie widgetu
create index if not exists channels_id_idx on channels (id);
