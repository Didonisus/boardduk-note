-- 보드득 노트 — 공동 편집 룸 스키마
-- Supabase SQL Editor에서 실행하세요.

create table rooms (
  id text primary key,
  game_name text not null,
  created_at timestamptz default now()
);

create table room_entries (
  id text primary key,
  room_id text references rooms(id) on delete cascade,
  author text not null,
  rating int check (rating between 1 and 5),
  summary text not null,
  moment text,
  created_at timestamptz default now()
);

-- RLS: 링크를 아는 사람은 누구나 읽기/쓰기 가능
alter table rooms enable row level security;
alter table room_entries enable row level security;

create policy "anyone can read rooms"    on rooms        for select using (true);
create policy "anyone can insert rooms"  on rooms        for insert with check (true);
create policy "anyone can read entries"  on room_entries for select using (true);
create policy "anyone can insert entries" on room_entries for insert with check (true);
create policy "anyone can update entries" on room_entries for update using (true);
create policy "anyone can delete entries" on room_entries for delete using (true);
