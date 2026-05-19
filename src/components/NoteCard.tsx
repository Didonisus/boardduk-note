import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Note } from '../types/note'
import { getPhotoURL } from '../lib/db'
import StarRating from './StarRating'

interface Props {
  note: Note
}

export default function NoteCard({ note }: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!note.coverPhotoId) {
      setCoverUrl(null)
      return
    }
    let mounted = true
    let objectUrl: string | null = null

    getPhotoURL(note.coverPhotoId).then((url) => {
      if (!mounted) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      objectUrl = url
      setCoverUrl(url)
    })

    return () => {
      mounted = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [note.coverPhotoId])

  return (
    <Link
      to={`/note/${note.id}`}
      className="block bg-white rounded-2xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
    >
      {/* 커버 이미지 또는 타이포 플레이스홀더 */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={note.gameName}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center overflow-hidden px-4">
          <span className="text-5xl font-black text-amber-200 tracking-tight select-none truncate">
            {note.gameName}
          </span>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-gray-900 text-base leading-tight flex-1 min-w-0 truncate">
            {note.gameName}
          </h2>
          {note.rating > 0 && (
            <span className="shrink-0 mt-0.5">
              <StarRating value={note.rating} readOnly size="sm" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">{note.date}</p>
          {note.players && (
            <>
              <span className="text-gray-200">·</span>
              <p className="text-xs text-gray-400 truncate">{note.players}</p>
            </>
          )}
        </div>

        {note.summary && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-snug">
            {note.summary}
          </p>
        )}
      </div>
    </Link>
  )
}
