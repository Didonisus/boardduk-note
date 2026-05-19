import { useEffect, useRef, useState } from 'react'
import { getPhotoURL } from '../lib/db'

interface Props {
  photoIds: string[]
}

export default function PhotoGallery({ photoIds }: Props) {
  const [urls, setUrls] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)
  const urlsRef = useRef<string[]>([])
  const idsKey = photoIds.join(',')

  useEffect(() => {
    if (photoIds.length === 0) return
    let mounted = true

    Promise.all(photoIds.map((id) => getPhotoURL(id))).then((results) => {
      if (!mounted) return
      const valid = results.filter(Boolean) as string[]
      urlsRef.current = valid
      setUrls(valid)
      setCurrent(0)
    })

    return () => {
      mounted = false
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      urlsRef.current = []
      setUrls([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  if (urls.length === 0) return null

  const prev = () => setCurrent((c) => Math.max(c - 1, 0))
  const next = () => setCurrent((c) => Math.min(c + 1, urls.length - 1))

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ aspectRatio: '4/3' }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (dx < -50) next()
        else if (dx > 50) prev()
      }}
    >
      <img
        src={urls[current]}
        alt={`사진 ${current + 1}`}
        className="w-full h-full object-contain"
      />

      {/* 이전 / 다음 버튼 */}
      {current > 0 && (
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center text-xl"
        >
          ‹
        </button>
      )}
      {current < urls.length - 1 && (
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center text-xl"
        >
          ›
        </button>
      )}

      {/* 인디케이터 */}
      {urls.length > 1 && (
        <div className="absolute bottom-3 w-full flex justify-center gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === current ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* 장 수 표시 */}
      <div className="absolute top-2 right-3 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
        {current + 1} / {urls.length}
      </div>
    </div>
  )
}
