import { useEffect, useRef, useState } from 'react'

interface LocalPhoto {
  file: File
  previewUrl: string
}

interface Props {
  maxPhotos?: number
  onPhotosChange: (files: File[], coverIndex: number) => void
}

export default function PhotoPicker({ maxPhotos = 5, onPhotosChange }: Props) {
  const [photos, setPhotos] = useState<LocalPhoto[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 최신 콜백을 ref에 저장 (무한 루프 방지)
  const cbRef = useRef(onPhotosChange)
  useEffect(() => { cbRef.current = onPhotosChange })

  // 부모에 변경 알림
  useEffect(() => {
    cbRef.current(photos.map((p) => p.file), coverIndex)
  }, [photos, coverIndex])

  // 언마운트 시 URL 해제
  const photosRef = useRef<LocalPhoto[]>([])
  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    const newPhotos: LocalPhoto[] = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, maxPhotos))
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
    setCoverIndex((prev) => {
      if (prev === index) return 0
      if (prev > index) return prev - 1
      return prev
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div key={i} className="relative w-20 h-20 shrink-0">
            <img
              src={photo.previewUrl}
              alt={`사진 ${i + 1}`}
              className="w-full h-full object-cover rounded-xl"
            />
            {/* 표지 뱃지 */}
            {coverIndex === i && (
              <div className="absolute top-0.5 left-0.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                표지
              </div>
            )}
            {/* 표지 설정 버튼 */}
            {coverIndex !== i && (
              <button
                type="button"
                onClick={() => setCoverIndex(i)}
                className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/50 text-white text-[9px] py-0.5 rounded-b-xl text-center leading-none"
              >
                표지 설정
              </button>
            )}
            {/* 삭제 */}
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center leading-none shadow"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:border-amber-400 hover:text-amber-400 transition-colors shrink-0"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-[10px]">사진 추가</span>
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        최대 {maxPhotos}장 · 탭하여 표지 사진 변경
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
