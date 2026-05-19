import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { decodeShareData } from '../lib/share'
import { createNote } from '../lib/storage'
import type { Note } from '../types/note'
import StarRating from '../components/StarRating'

export default function SharePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const d = params.get('d')
    if (!d) { setError(true); return }
    const decoded = decodeShareData(d)
    if (!decoded) { setError(true); return }
    setNote(decoded)
  }, [params])

  const handleSave = () => {
    if (!note) return
    createNote({
      gameName: note.gameName,
      date: note.date,
      players: note.players,
      rating: note.rating,
      summary: note.summary,
      moment: note.moment,
      photoIds: [],        // 사진은 링크에 포함되지 않음
      coverPhotoId: null,
    })
    setSaved(true)
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center space-y-3">
          <p className="text-5xl">😕</p>
          <p className="text-gray-500 font-medium">유효하지 않은 공유 링크예요</p>
          <button
            onClick={() => navigate('/')}
            className="text-amber-500 text-sm underline"
          >
            내 후기 목록으로
          </button>
        </div>
      </div>
    )
  }

  if (!note) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <h1 className="font-semibold text-gray-900">공유받은 후기</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 미리보기 카드 */}
        <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{note.gameName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{note.date}</p>
          </div>

          {note.players && (
            <p className="text-sm text-gray-600">👥 {note.players}</p>
          )}

          {note.rating > 0 && <StarRating value={note.rating} readOnly />}

          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">한 줄 소감</p>
            <p className="text-gray-800 leading-relaxed">{note.summary}</p>
          </div>

          {note.moment && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">기억에 남는 순간</p>
              <p className="text-gray-800 leading-relaxed">{note.moment}</p>
            </div>
          )}

          {/* 사진 안내 */}
          {note.photoIds.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3">
              📷 이 후기에 사진 {note.photoIds.length}장이 첨부되어 있어요
              <br />
              <span className="text-xs text-amber-500">(사진은 공유 링크에 포함되지 않아요)</span>
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        {saved ? (
          <div className="bg-green-500 text-white font-semibold rounded-2xl py-4 text-center">
            ✓ 내 노트에 저장됐어요!
          </div>
        ) : (
          <button
            onClick={handleSave}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl py-4 transition-colors"
          >
            내 노트에 저장
          </button>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full border border-gray-200 text-gray-600 font-medium rounded-2xl py-4 transition-colors hover:bg-gray-50"
        >
          내 후기 목록 보기
        </button>
      </div>
    </div>
  )
}
