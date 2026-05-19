import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

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

export interface RoomPhoto {
  id: string
  room_id: string
  storage_path: string
  uploader: string | null
  created_at: string
}

// ── Storage 헬퍼 ─────────────────────────────────────────────

const BUCKET = 'room-photos'

/** Storage 경로 → 공개 URL */
export function getRoomPhotoUrl(storagePath: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

/**
 * 사진 Blob을 Storage에 업로드하고 room_photos 레코드를 생성합니다.
 * 압축은 호출 전에 완료되어 있어야 합니다.
 */
export async function uploadRoomPhoto(
  roomId: string,
  file: Blob,
  uploader: string | null,
): Promise<RoomPhoto> {
  const id = nanoid()
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${roomId}/${id}.${ext}`

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg' })
  if (storageErr) throw storageErr

  const { data, error: dbErr } = await supabase
    .from('room_photos')
    .insert({ id, room_id: roomId, storage_path: path, uploader })
    .select()
    .single()
  if (dbErr) throw dbErr

  return data as RoomPhoto
}
