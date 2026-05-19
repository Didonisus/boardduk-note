import imageCompression from 'browser-image-compression'
import { useEffect, useRef, useState } from 'react'
import {
  supabase,
  uploadRoomPhoto,
  getRoomPhotoUrl,
  type RoomPhoto,
} from '../lib/supabase'

interface Props {
  roomId: string
}

export default function RoomPhotoGallery({ roomId }: Props) {
  const [photos, setPhotos]     = useState<RoomPhoto[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 초기 로드 + 실시간 구독 ──────────────────────────────

  useEffect(() => {
    let mounted = true

    supabase
      .from('room_photos')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (mounted) {
          setPhotos((data ?? []) as RoomPhoto[])
          setLoading(false)
        }
      })

    const channel = supabase
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

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // ── 라이트박스 키보드 네비게이션 ──────────────────────────

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')
        setLightbox((i) => (i !== null && i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight')
        setLightbox((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, photos.length])

  // ── 업로드 ───────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

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
        // 낙관적 추가 (realtime이 dedup 처리)
        setPhotos((prev) =>
          prev.some((p) => p.id === photo.id) ? prev : [...prev, photo],
        )
      }
    } catch (err) {
      alert('업로드에 실패했어요: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  // ── 삭제 ─────────────────────────────────────────────────

  const handleDelete = async (photo: RoomPhoto, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('이 사진을 삭제할까요?')) return
    try {
      await supabase.storage.from('room-photos').remove([photo.storage_path])
      await supabase.from('room_photos').delete().eq('id', photo.id)
    } catch (err) {
      alert('삭제 실패: ' + (err as Error).message)
    }
  }

  // ── 렌더 ─────────────────────────────────────────────────

  return (
    <>
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
          방 사진{photos.length > 0 && ` · ${photos.length}장`}
        </p>

        {loading ? (
          /* 스켈레톤 */
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className="aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer relative"
                onClick={() => setLightbox(i)}
              >
                <img
                  src={getRoomPhotoUrl(photo.storage_path)}
                  alt={`사진 ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => handleDelete(photo, e)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  aria-label="삭제"
                >
                  ×
                </button>
                {/* 업로더 이름 */}
                {photo.uploader && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent text-white text-[9px] px-1.5 py-1 truncate">
                    {photo.uploader}
                  </div>
                )}
              </div>
            ))}

            {/* 사진 추가 버튼 */}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square border-2 border-dashed border-violet-200 rounded-xl flex flex-col items-center justify-center gap-1 text-violet-400 hover:border-violet-400 hover:bg-violet-50 transition-colors disabled:opacity-60"
            >
              <span className={`text-2xl leading-none ${uploading ? 'animate-spin' : ''}`}>
                {uploading ? '↻' : '+'}
              </span>
              <span className="text-[10px]">
                {uploading ? '올리는 중…' : '사진 추가'}
              </span>
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
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

          {/* 이전 */}
          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-2xl"
            >
              ‹
            </button>
          )}

          {/* 다음 */}
          {lightbox < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-2xl"
            >
              ›
            </button>
          )}

          {/* 닫기 */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center"
          >
            ✕
          </button>

          {/* 장 수 */}
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
    </>
  )
}
