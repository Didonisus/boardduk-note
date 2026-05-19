import imageCompression from 'browser-image-compression'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { nanoid } from 'nanoid'
import {
  supabase,
  uploadRoomPhoto,
  getRoomPhotoUrl,
  type Room,
  type RoomEntry,
  type RoomPhoto,
} from '../lib/supabase'
import StarRating from '../components/StarRating'

// ── 작성자별 카드 색상 ──────────────────────────────────────

const COLORS = [
  { bg: 'bg-pink-50',   border: 'border-pink-200',   dot: 'bg-pink-400'   },
  { bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400'   },
  { bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-400'  },
  { bg: 'bg-amber-50',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  { bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-400' },
  { bg: 'bg-teal-50',   border: 'border-teal-200',   dot: 'bg-teal-400'   },
  { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400' },
]

function authorColor(author: string) {
  let h = 0
  for (const c of author) h = (h * 31 + c.charCodeAt(0)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
  })
}

// ── 메인 컴포넌트 ───────────────────────────────────────────

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  // ── 룸 / 후기 state ──────────────────────────────────────
  const [room, setRoom]         = useState<Room | null>(null)
  const [entries, setEntries]   = useState<RoomEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── 사진 state ───────────────────────────────────────────
  const [photos, setPhotos]           = useState<RoomPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [lightbox, setLightbox]       = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // ── 룸 + 후기 로드 + Realtime ───────────────────────────

  useEffect(() => {
    if (!roomId) return
    let mounted = true

    const load = async () => {
      const { data: roomData } = await supabase
        .from('rooms').select('*').eq('id', roomId).single()

      if (!mounted) return
      if (!roomData) { setNotFound(true); setLoading(false); return }
      setRoom(roomData as Room)

      const { data: entriesData } = await supabase
        .from('room_entries')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (!mounted) return
      setEntries((entriesData ?? []) as RoomEntry[])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_entries', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (!mounted) return
          const entry = payload.new as RoomEntry
          setEntries((prev) => prev.some((e) => e.id === entry.id) ? prev : [...prev, entry])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'room_entries', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (!mounted) return
          const oldId = (payload.old as { id: string }).id
          setEntries((prev) => prev.filter((e) => e.id !== oldId))
        },
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // ── 사진 로드 + Realtime ────────────────────────────────

  useEffect(() => {
    if (!roomId) return
    let mounted = true

    const loadPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('room_photos')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })

        if (!mounted) return
        if (error) {
          console.warn('[photos] load error:', error.message)
        } else {
          setPhotos((data ?? []) as RoomPhoto[])
        }
      } catch (e) {
        console.warn('[photos] fetch error:', e)
      } finally {
        if (mounted) setPhotosLoading(false)
      }
    }

    loadPhotos()

    let photoCh: ReturnType<typeof supabase.channel> | null = null
    try {
      photoCh = supabase
        .channel(`room-photos-${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_photos', filter: `room_id=eq.${roomId}` },
          (payload) => {
            if (!mounted) return
            const photo = payload.new as RoomPhoto
            setPhotos((prev) => prev.some((p) => p.id === photo.id) ? prev : [...prev, photo])
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'room_photos', filter: `room_id=eq.${roomId}` },
          (payload) => {
            if (!mounted) return
            const id = (payload.old as { id: string }).id
            setPhotos((prev) => prev.filter((p) => p.id !== id))
          },
        )
        .subscribe()
    } catch (e) {
      console.warn('[photos] realtime error:', e)
    }

    return () => {
      mounted = false
      if (photoCh) supabase.removeChannel(photoCh)
    }
  }, [roomId])

  // ── 라이트박스 키보드 ───────────────────────────────────

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setLightbox((i) => (i !== null && i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight') setLightbox((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))
      if (e.key === 'Escape')     setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, photos.length])

  // ── URL 복사 ────────────────────────────────────────────

  const copyUrl = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  // ── 후기 삭제 ───────────────────────────────────────────

  const deleteEntry = async (entryId: string) => {
    if (!window.confirm('이 후기를 삭제할까요?')) return
    await supabase.from('room_entries').delete().eq('id', entryId)
  }

  // ── 사진 업로드 ─────────────────────────────────────────

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !roomId) return

    const uploader = localStorage.getItem('boardduk:roomAuthor') ?? null
    setUploading(true)
    try {
      for (const file of files) {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1280,
          initialQuality: 0.75,
          useWebWorker: true,
        })
        const photo = await uploadRoomPhoto(roomId, compressed, uploader)
        setPhotos((prev) => prev.some((p) => p.id === photo.id) ? prev : [...prev, photo])
      }
    } catch (err) {
      alert('업로드 실패: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  // ── 사진 삭제 ───────────────────────────────────────────

  const handlePhotoDelete = async (photo: RoomPhoto, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('이 사진을 삭제할까요?')) return
    try {
      await supabase.storage.from('room-photos').remove([photo.storage_path])
      await supabase.from('room_photos').delete().eq('id', photo.id)
    } catch (err) {
      alert('삭제 실패: ' + (err as Error).message)
    }
  }

  // ── 렌더 ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 animate-pulse">연결 중…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center space-y-3">
          <p className="text-5xl">😕</p>
          <p className="text-gray-500 font-medium">방을 찾을 수 없어요</p>
          <button onClick={() => navigate('/')} className="text-amber-500 text-sm underline">
            홈으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-2">
          <button onClick={() => navigate('/')} className="text-gray-500 text-sm shrink-0">
            ← 뒤로
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="font-bold text-gray-900 truncate">{room?.game_name}</p>
            <p className="text-[10px] text-gray-400 leading-none">{entries.length}개의 후기</p>
          </div>
          <button
            onClick={copyUrl}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              urlCopied
                ? 'bg-green-100 text-green-600'
                : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
            }`}
          >
            {urlCopied ? '✓ 복사됨' : '🔗 링크 복사'}
          </button>
        </div>
      </header>

      {/* ── 사진 갤러리 (인라인) ── */}
      <div className="w-full bg-white border-b-4 border-gray-200">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
          <p className="text-sm font-bold text-gray-800 mb-3">
            📷 방 사진
            {photos.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">{photos.length}장</span>
            )}
          </p>

          {photosLoading ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
              <div className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
              <div className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-xl overflow-hidden relative cursor-pointer bg-gray-100"
                  onClick={() => setLightbox(i)}
                >
                  <img
                    src={getRoomPhotoUrl(photo.storage_path)}
                    alt={`사진 ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <button
                    onClick={(e) => handlePhotoDelete(photo, e)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-sm flex items-center justify-center"
                    aria-label="삭제"
                  >
                    ×
                  </button>
                  {photo.uploader && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[9px] px-1.5 py-1 truncate">
                      {photo.uploader}
                    </div>
                  )}
                </div>
              ))}

              {/* 업로드 버튼 */}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-violet-400 bg-violet-50 flex flex-col items-center justify-center gap-1 text-violet-500 hover:bg-violet-100 active:bg-violet-200 transition-colors disabled:opacity-50"
              >
                <span className={`text-3xl leading-none ${uploading ? 'animate-spin' : ''}`}>
                  {uploading ? '↻' : '+'}
                </span>
                <span className="text-[11px] font-semibold">
                  {uploading ? '올리는 중…' : '사진 추가'}
                </span>
              </button>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      {/* ── 후기 목록 ── */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-4 space-y-3">
        {entries.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            아직 아무도 후기를 남기지 않았어요<br />
            아래 폼으로 첫 번째 후기를 남겨보세요 ✏️
          </div>
        )}
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onDelete={deleteEntry} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── 입력 폼 ── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3">
          <EntryForm roomId={roomId!} onSubmitted={(entry) => {
            setEntries((prev) => prev.some((e) => e.id === entry.id) ? prev : [...prev, entry])
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }} />
        </div>
      </div>

      {/* ── 라이트박스 ── */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={getRoomPhotoUrl(photos[lightbox].storage_path)}
            alt="전체화면"
            className="max-w-full max-h-full object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-2xl"
            >‹</button>
          )}
          {lightbox < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-2xl"
            >›</button>
          )}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center"
          >✕</button>
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1.5">
            {photos[lightbox].uploader && (
              <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                📷 {photos[lightbox].uploader}
              </span>
            )}
            <span className="bg-black/40 text-white/70 text-xs px-3 py-1 rounded-full">
              {lightbox + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 항목 카드 ───────────────────────────────────────────────

function EntryCard({
  entry,
  onDelete,
}: {
  entry: RoomEntry
  onDelete: (id: string) => void
}) {
  const color = authorColor(entry.author)
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${color.bg} ${color.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
          <span className="font-bold text-gray-900 text-sm">{entry.author}</span>
          <span className="text-xs text-gray-400">{fmtTime(entry.created_at)}</span>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
          aria-label="삭제"
        >
          ×
        </button>
      </div>
      {entry.rating && <StarRating value={entry.rating} readOnly size="sm" />}
      <p className="text-gray-800 text-sm leading-relaxed">{entry.summary}</p>
      {entry.moment && (
        <p className="text-gray-500 text-xs italic border-l-2 border-gray-300 pl-2">
          {entry.moment}
        </p>
      )}
    </div>
  )
}

// ── 입력 폼 ─────────────────────────────────────────────────

function EntryForm({
  roomId,
  onSubmitted,
}: {
  roomId: string
  onSubmitted: (entry: RoomEntry) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [author, setAuthor]       = useState(() => localStorage.getItem('boardduk:roomAuthor') ?? '')
  const [rating, setRating]       = useState(0)
  const [summary, setSummary]     = useState('')
  const [moment, setMoment]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState<{ author?: string; summary?: string }>({})

  const handleSubmit = async () => {
    const errs: typeof errors = {}
    if (!author.trim())  errs.author  = '이름을 입력해주세요'
    if (!summary.trim()) errs.summary = '소감을 입력해주세요'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    const entry: RoomEntry = {
      id: nanoid(),
      room_id: roomId,
      author: author.trim(),
      rating: rating || null,
      summary: summary.trim(),
      moment: moment.trim() || null,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('room_entries').insert(entry)
    if (error) {
      alert('저장에 실패했어요: ' + error.message)
      setSubmitting(false)
      return
    }

    localStorage.setItem('boardduk:roomAuthor', author.trim())
    setSummary(''); setMoment(''); setRating(0)
    setExpanded(false)
    setSubmitting(false)
    onSubmitted(entry)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-2xl py-3 transition-colors text-sm"
      >
        ✏️ 후기 남기기
      </button>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            value={author}
            onChange={(e) => { setAuthor(e.target.value); setErrors((p) => ({ ...p, author: '' })) }}
            placeholder="닉네임 *"
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${
              errors.author ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          {errors.author && <p className="text-red-500 text-xs mt-0.5">{errors.author}</p>}
        </div>
        <StarRating value={rating} onChange={setRating} size="sm" />
      </div>

      <div>
        <textarea
          value={summary}
          onChange={(e) => { setSummary(e.target.value); setErrors((p) => ({ ...p, summary: '' })) }}
          placeholder="한 줄 소감 *"
          rows={2}
          maxLength={100}
          className={`w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 ${
            errors.summary ? 'border-red-400' : 'border-gray-200'
          }`}
        />
        {errors.summary && <p className="text-red-500 text-xs -mt-1">{errors.summary}</p>}
      </div>

      <textarea
        value={moment}
        onChange={(e) => setMoment(e.target.value)}
        placeholder="기억에 남는 순간 (선택)"
        rows={1}
        maxLength={80}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
      />

      <div className="flex gap-2">
        <button
          onClick={() => setExpanded(false)}
          className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-[2] bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          {submitting ? '올리는 중…' : '남기기'}
        </button>
      </div>
    </div>
  )
}
