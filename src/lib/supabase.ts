import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

// ── 공동편집 룸 타입 ────────────────────────────────────────

export interface Room {
  id: string
  game_name: string
  created_at: string
}

export interface RoomEntry {
  id: string
  room_id: string
  author: string
  rating: number | null
  summary: string
  moment: string | null
  created_at: string
}
