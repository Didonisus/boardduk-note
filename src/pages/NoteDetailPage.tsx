import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getNoteById, deleteNote } from '../lib/storage'
import { deletePhotos } from '../lib/db'
import { encodeShareData } from '../lib/share'
import type { Note } from '../types/note'
import StarRating from '../components/StarRating'
import PhotoGallery from '../components/PhotoGallery'

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id) setNote(getNoteById(id))
  }, [id])

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">후기를 찾을 수 없어요 😕</p>
      </div>
    )
  }

  const handleShare = async () => {
    const encoded = encodeShareData(note)
    const url = `${window.location.origin}/share?d=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // 클립보드 API 실패 시 폴백
      prompt('아래 링크를 복사하세요', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDelete = async () => {
    if (!window.confirm('이 후기를 삭제할까요?')) return
    await deletePhotos(note.photoIds)
    deleteNote(note.id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 text-sm mr-auto"
          >
            ← 뒤로
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-gray-900 max-w-[55%] truncate">
            {note.gameName}
          </span>
          <button
            onClick={handleDelete}
            className="text-red-400 text-sm ml-auto"
          >
            삭제
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* 갤러리 */}
        {note.photoIds.length > 0 && <PhotoGallery photoIds={note.photoIds} />}

        <div className="px-4 py-5 space-y-4">
          {/* 게임 기본 정보 */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{note.gameName}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{note.date}</p>
            </div>
            {note.players && (
              <p className="text-sm text-gray-600">
                👥 {note.players}
              </p>
            )}
            {note.rating > 0 && <StarRating value={note.rating} readOnly />}
          </div>

          {/* 한 줄 소감 */}
          <div className="bg-white rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              한 줄 소감
            </p>
            <p className="text-gray-800 leading-relaxed">{note.summary}</p>
          </div>

          {/* 기억에 남는 순간 */}
          {note.moment && (
            <div className="bg-white rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                기억에 남는 순간
              </p>
              <p className="text-gray-800 leading-relaxed">{note.moment}</p>
            </div>
          )}

          {/* 공유 버튼 */}
          <button
            onClick={handleShare}
            className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {copied ? '✓ 링크가 복사됐어요!' : '🔗 친구에게 보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}
