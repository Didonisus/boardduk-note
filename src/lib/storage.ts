/**
 * localStorage 유틸 — Note 메타데이터(텍스트) CRUD
 * 사진 Blob은 db.ts(IndexedDB) 에서 별도 관리
 */

import { nanoid } from 'nanoid'
import type { Note, NoteInput } from '../types/note'

const STORAGE_KEY = 'boardduk:notes'

// ── 내부 헬퍼 ──────────────────────────────────────────────

function readAll(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Note[]) : []
  } catch {
    return []
  }
}

function writeAll(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

// ── 공개 API ───────────────────────────────────────────────

/** 전체 노트 목록 반환 (최신순) */
export function getAllNotes(): Note[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt)
}

/** ID로 단건 조회, 없으면 null */
export function getNoteById(id: string): Note | null {
  return readAll().find((n) => n.id === id) ?? null
}

/** 새 노트 생성 — 생성된 Note 반환 */
export function createNote(input: NoteInput): Note {
  const now = Date.now()
  const note: Note = {
    ...input,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  }
  const notes = readAll()
  notes.push(note)
  writeAll(notes)
  return note
}

/** 기존 노트 수정 — 수정된 Note 반환, 없으면 null */
export function updateNote(id: string, patch: Partial<NoteInput>): Note | null {
  const notes = readAll()
  const idx = notes.findIndex((n) => n.id === id)
  if (idx === -1) return null
  const updated: Note = { ...notes[idx], ...patch, updatedAt: Date.now() }
  notes[idx] = updated
  writeAll(notes)
  return updated
}

/** 노트 삭제 — 성공 여부 반환 */
export function deleteNote(id: string): boolean {
  const notes = readAll()
  const filtered = notes.filter((n) => n.id !== id)
  if (filtered.length === notes.length) return false
  writeAll(filtered)
  return true
}

/** 백업 복원용 — 원본 id 그대로 저장 (중복 시 덮어쓰기) */
export function importNote(note: Note): void {
  const notes = readAll()
  const idx = notes.findIndex((n) => n.id === note.id)
  if (idx !== -1) {
    notes[idx] = note
  } else {
    notes.push(note)
  }
  writeAll(notes)
}
