export interface Note {
  /** nanoid로 생성된 고유 ID */
  id: string
  /** 게임 이름 */
  gameName: string
  /** 플레이 날짜 (YYYY-MM-DD) */
  date: string
  /** 플레이어 (자유 텍스트, 선택) */
  players: string
  /** 평점 (1–5, 0 = 미설정) */
  rating: number
  /** 한 줄 소감 */
  summary: string
  /** 기억에 남는 순간 (선택) */
  moment: string
  /** IndexedDB에 저장된 사진 ID 배열 */
  photoIds: string[]
  /** 대표 사진 ID (없으면 null) */
  coverPhotoId: string | null
  /** 생성 시각 (Unix ms) */
  createdAt: number
  /** 수정 시각 (Unix ms) */
  updatedAt: number
}

export type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
