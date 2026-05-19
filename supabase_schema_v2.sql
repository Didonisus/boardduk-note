-- 보드득 노트 — 룸 사진 스키마 v2
-- supabase_schema.sql 실행 후 이 파일을 실행하세요.

-- ── room_photos 테이블 ────────────────────────────────────

create table room_photos (
  id text primary key,
  room_id text references rooms(id) on delete cascade,
  storage_path text not null,
  uploader text,
  created_at timestamptz default now()
);

alter table room_photos enable row level security;
create policy "anyone can read photos"   on room_photos for select using (true);
create policy "anyone can insert photos" on room_photos for insert with check (true);
create policy "anyone can delete photos" on room_photos for delete using (true);

-- ── Storage 버킷 (Public) ─────────────────────────────────

insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

-- ── Storage RLS ───────────────────────────────────────────

create policy "public read room-photos"
  on storage.objects for select
  using (bucket_id = 'room-photos');

create policy "anyone can upload to room-photos"
  on storage.objects for insert
  with check (bucket_id = 'room-photos');

create policy "anyone can delete from room-photos"
  on storage.objects for delete
  using (bucket_id = 'room-photos');
