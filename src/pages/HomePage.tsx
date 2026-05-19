import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { getAllNotes } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Note } from '../types/note'
import NoteCard from '../components/NoteCard'

export default function HomePage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])

  // ── 공동 룸 생성 ──────────────────────────────────────────
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [gameName, setGameName]         = useState('')
  const [creating, setCreating]         = useState(false)
  const gameNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNotes(getAllNotes())
  }, [])

  useEffect(() => {
    if (showRoomForm) setTimeout(() => gameNameRef.current?.focus(), 50)
  }, [showRoomForm])

  const handleCreateRoom = async () => {
    if (!gameName.trim()) { gameNameRef.current?.focus(); return }
    setCreating(true)
    const id = nanoid(10)
    const { error } = await supabase
      .from('rooms')
      .insert({ id, game_name: gameName.trim() })

    if (error) {
      alert('방 생성에 실패했어요: ' + error.message)
      setCreating(false)
      return
    }
    navigate(`/room/${id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateRoom()
    if (e.key === 'Escape') { setShowRoomForm(false); setGameName('') }
  }

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

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {/* ── 공동 후기 방 카드 ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight">👥 공동 후기 방</p>
              <p className="text-violet-200 text-xs mt-0.5">
                링크 하나로 여러 명이 함께 후기 남기기
              </p>
            </div>
            {!showRoomForm && (
              <button
                onClick={() => setShowRoomForm(true)}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
              >
                방 만들기
              </button>
            )}
          </div>

          {/* 인라인 생성 폼 */}
          {showRoomForm && (
            <div className="mt-3 flex gap-2">
              <input
                ref={gameNameRef}
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="게임 이름 입력…"
                className="flex-1 bg-white/20 placeholder-white/60 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white/30 transition-colors"
              />
              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="shrink-0 bg-white text-violet-600 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60"
              >
                {creating ? '…' : '생성'}
              </button>
              <button
                onClick={() => { setShowRoomForm(false); setGameName('') }}
                className="shrink-0 bg-white/10 text-white px-3 py-2 rounded-xl text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ── 내 후기 목록 ──────────────────────────────────── */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
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
