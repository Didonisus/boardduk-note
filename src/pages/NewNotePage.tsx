import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { createNote } from '../lib/storage'
import { savePhoto } from '../lib/db'
import StarRating from '../components/StarRating'
import PhotoPicker from '../components/PhotoPicker'

const todayStr = () => new Date().toISOString().split('T')[0]

interface FormState {
  gameName: string
  date: string
  players: string
  rating: number
  summary: string
  moment: string
}

export default function NewNotePage() {
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({
    gameName: '',
    date: todayStr(),
    players: '',
    rating: 0,
    summary: '',
    moment: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const handlePhotosChange = useCallback((files: File[], idx: number) => {
    setPhotoFiles(files)
    setCoverIndex(idx)
  }, [])

  const handleSubmit = async () => {
    const errs: typeof errors = {}
    if (!form.gameName.trim()) errs.gameName = '게임 이름을 입력해주세요'
    if (!form.summary.trim()) errs.summary = '한 줄 소감을 입력해주세요'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      // 사진 압축 → IndexedDB 저장
      const photoIds: string[] = []
      for (const file of photoFiles) {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1280,
          initialQuality: 0.75,
          useWebWorker: true,
        })
        const id = await savePhoto(compressed)
        photoIds.push(id)
      }
      const coverPhotoId = photoIds[coverIndex] ?? null

      createNote({ ...form, photoIds, coverPhotoId })
      navigate('/')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-500 text-sm mr-auto"
          >
            ← 뒤로
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-gray-900">
            새 후기
          </span>
        </div>
      </header>

      {/* 폼 */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-10">
        {/* 게임 이름 */}
        <Field label="게임 이름" required error={errors.gameName}>
          <input
            type="text"
            value={form.gameName}
            onChange={(e) => set('gameName', e.target.value)}
            placeholder="예: 카탄, 윙스팬, 루미큐브"
            className={inputCls(!!errors.gameName)}
          />
        </Field>

        {/* 날짜 */}
        <Field label="플레이 날짜">
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className={inputCls(false)}
          />
        </Field>

        {/* 플레이어 */}
        <Field label="플레이어" optional>
          <input
            type="text"
            value={form.players}
            onChange={(e) => set('players', e.target.value)}
            placeholder="예: 홍길동, 이몽룡 또는 3명"
            className={inputCls(false)}
          />
        </Field>

        {/* 별점 */}
        <Field label="별점" optional>
          <StarRating value={form.rating} onChange={(v) => set('rating', v)} />
        </Field>

        {/* 한 줄 소감 */}
        <Field label="한 줄 소감" required error={errors.summary}>
          <textarea
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            placeholder="이번 게임을 한 마디로 표현해보세요"
            maxLength={100}
            rows={3}
            className={`${inputCls(!!errors.summary)} resize-none`}
          />
          <Counter current={form.summary.length} max={80} />
        </Field>

        {/* 기억에 남는 순간 */}
        <Field label="기억에 남는 순간" optional>
          <textarea
            value={form.moment}
            onChange={(e) => set('moment', e.target.value)}
            placeholder="가장 짜릿했던 순간을 적어보세요"
            maxLength={80}
            rows={2}
            className={`${inputCls(false)} resize-none`}
          />
          <Counter current={form.moment.length} max={60} />
        </Field>

        {/* 사진 */}
        <Field label="사진" optional>
          <PhotoPicker maxPhotos={5} onPhotosChange={handlePhotosChange} />
        </Field>

        {/* 저장 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-2xl py-4 mt-2 transition-colors"
        >
          {submitting ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}

/* ── 서브 컴포넌트 ──────────────────────────────── */

function Field({
  label,
  required,
  optional,
  error,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-gray-400 text-xs ml-1">(선택)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

function Counter({ current, max }: { current: number; max: number }) {
  return (
    <p className={`text-xs text-right mt-1 ${current > max ? 'text-red-400' : 'text-gray-400'}`}>
      {current}/{max}
    </p>
  )
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white
    focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow
    ${hasError ? 'border-red-400' : 'border-gray-200'}`
}
