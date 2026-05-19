import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { getAllNotes, importNote } from '../lib/storage'
import { getPhotoBlob, restorePhotoWithId } from '../lib/db'
import type { Note } from '../types/note'

type MsgType = 'success' | 'error'

export default function SettingsPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState<{ type: MsgType; text: string } | null>(null)

  const showMsg = (type: MsgType, text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  /* ── 내보내기 ─────────────────────────────────────── */
  const handleExport = async () => {
    setExporting(true)
    try {
      const notes = getAllNotes()
      const zip = new JSZip()
      zip.file('notes.json', JSON.stringify(notes, null, 2))

      const photosFolder = zip.folder('photos')!
      for (const note of notes) {
        for (const photoId of note.photoIds) {
          const blob = await getPhotoBlob(photoId)
          if (blob) {
            const ext = blob.type === 'image/png' ? 'png' : 'jpg'
            photosFolder.file(`${photoId}.${ext}`, blob)
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `boardduk-note-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showMsg('success', `${notes.length}개 후기를 내보냈어요 🎉`)
    } catch (e) {
      showMsg('error', `내보내기 실패: ${(e as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  /* ── 가져오기 ─────────────────────────────────────── */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const zip = await JSZip.loadAsync(file)

      // notes.json 복원
      const notesFile = zip.file('notes.json')
      if (!notesFile) throw new Error('notes.json을 찾을 수 없어요')
      const notes: Note[] = JSON.parse(await notesFile.async('string'))

      // photos/ 폴더의 사진 복원
      const photoEntries = Object.entries(zip.files).filter(
        ([name, entry]) => name.startsWith('photos/') && !entry.dir,
      )
      for (const [name, entry] of photoEntries) {
        const filename = name.replace('photos/', '')
        const photoId = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '')
        const blob = await entry.async('blob')
        const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
        await restorePhotoWithId(photoId, blob, mimeType)
      }

      // 노트 복원 (원본 ID 유지, 중복 덮어쓰기)
      notes.forEach(importNote)

      showMsg('success', `${notes.length}개 후기, 사진 ${photoEntries.length}장을 가져왔어요 ✅`)
    } catch (err) {
      showMsg('error', `가져오기 실패: ${(err as Error).message}`)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  /* ── 렌더 ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 text-sm mr-auto">
            ← 뒤로
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-gray-900">
            설정
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 안내 */}
        <p className="text-sm text-gray-500 leading-relaxed">
          후기와 사진을 ZIP 파일로 백업하거나 복원할 수 있어요.
          <br />
          가져오기는 같은 형식의 ZIP 파일을 사용해주세요.
        </p>

        {/* 상태 메시지 */}
        {msg && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              msg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* 내보내기 */}
        <div className="bg-white rounded-2xl p-5 space-y-2 shadow-sm">
          <h2 className="font-semibold text-gray-900">📤 내보내기</h2>
          <p className="text-sm text-gray-500">
            모든 후기와 사진을 <code className="bg-gray-100 px-1 rounded">.zip</code> 파일로
            저장해요.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {exporting ? '내보내는 중…' : '백업 파일 다운로드'}
          </button>
        </div>

        {/* 가져오기 */}
        <div className="bg-white rounded-2xl p-5 space-y-2 shadow-sm">
          <h2 className="font-semibold text-gray-900">📥 가져오기</h2>
          <p className="text-sm text-gray-500">
            백업 ZIP 파일을 선택하면 후기와 사진을 복원해요.
            <br />
            <span className="text-amber-600">같은 ID의 후기는 덮어써요.</span>
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full mt-2 border-2 border-amber-400 text-amber-600 hover:bg-amber-50 disabled:opacity-50 font-semibold rounded-xl py-3 transition-colors"
          >
            {importing ? '복원 중…' : 'ZIP 파일 선택'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </div>
  )
}
