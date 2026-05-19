import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllNotes } from '../lib/storage'
import type { Note } from '../types/note'
import NoteCard from '../components/NoteCard'

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    setNotes(getAllNotes())
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
          <h1 className="font-bold text-gray-900 text-lg flex-1">🎲 보드득 노트</h1>
          <Link to="/settings" className="text-sm text-gray-400 hover:text-gray-600 px-1">
            설정
          </Link>
          <Link
            to="/new"
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            + 작성
          </Link>
        </div>
      </header>

      {/* 목록 */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3 text-center">
            <span className="text-6xl">🎲</span>
            <p className="text-gray-400 text-sm leading-relaxed">
              아직 기록된 후기가 없어요
              <br />
              <span className="text-amber-500 font-medium">+ 작성</span> 버튼을 눌러
              첫 후기를 남겨보세요
            </p>
          </div>
        ) : (
          notes.map((note) => <NoteCard key={note.id} note={note} />)
        )}
      </div>
    </div>
  )
}
