/**
 * IndexedDB 유틸 — 사진 Blob 저장소
 * idb 라이브러리 사용, DB는 싱글턴으로 관리
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { nanoid } from 'nanoid'

// ── 스키마 ─────────────────────────────────────────────────

interface BoarddukDB extends DBSchema {
  photos: {
    key: string   // photoId
    value: {
      id: string
      blob: Blob
      mimeType: string
      createdAt: number
    }
  }
}

const DB_NAME = 'boardduk-note'
const DB_VERSION = 1

// ── DB 싱글턴 ──────────────────────────────────────────────

let _db: IDBPDatabase<BoarddukDB> | null = null

async function getDB(): Promise<IDBPDatabase<BoarddukDB>> {
  if (_db) return _db
  _db = await openDB<BoarddukDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' })
      }
    },
  })
  return _db
}

// ── 공개 API ───────────────────────────────────────────────

/** 사진 Blob 저장 — 생성된 photoId 반환 */
export async function savePhoto(blob: Blob): Promise<string> {
  const db = await getDB()
  const id = nanoid()
  await db.put('photos', {
    id,
    blob,
    mimeType: blob.type || 'image/jpeg',
    createdAt: Date.now(),
  })
  return id
}

/** photoId로 Blob URL 반환, 없으면 null */
export async function getPhotoURL(photoId: string): Promise<string | null> {
  const db = await getDB()
  const record = await db.get('photos', photoId)
  if (!record) return null
  return URL.createObjectURL(record.blob)
}

/** photoId로 원본 Blob 반환, 없으면 null */
export async function getPhotoBlob(photoId: string): Promise<Blob | null> {
  const db = await getDB()
  const record = await db.get('photos', photoId)
  return record?.blob ?? null
}

/** 사진 단건 삭제 */
export async function deletePhoto(photoId: string): Promise<void> {
  const db = await getDB()
  await db.delete('photos', photoId)
}

/** 사진 여러 장 일괄 삭제 (노트 삭제 시 함께 호출) */
export async function deletePhotos(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return
  const db = await getDB()
  const tx = db.transaction('photos', 'readwrite')
  await Promise.all(photoIds.map((id) => tx.store.delete(id)))
  await tx.done
}

/** 백업 복원용 — 원본 photoId로 Blob 저장 */
export async function restorePhotoWithId(
  id: string,
  blob: Blob,
  mimeType?: string,
): Promise<void> {
  const db = await getDB()
  await db.put('photos', {
    id,
    blob,
    mimeType: mimeType ?? blob.type ?? 'image/jpeg',
    createdAt: Date.now(),
  })
}
