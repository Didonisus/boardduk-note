/**
 * 공유 링크 인코딩 / 디코딩 유틸
 * TextEncoder → base64url 방식으로 한글을 포함한 모든 유니코드 안전하게 처리
 */

import type { Note } from '../types/note'

function toBase64url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeShareData(note: Note): string {
  return toBase64url(JSON.stringify(note))
}

export function decodeShareData(encoded: string): Note | null {
  try {
    return JSON.parse(fromBase64url(encoded)) as Note
  } catch {
    return null
  }
}
