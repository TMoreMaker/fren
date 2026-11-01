'use client'
// Frames 2.3 (photo added) and 2.3b (no photo, initial). Just one person: teams are out of scope.
import { useRef, useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import ui from '@/components/ui.module.css'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'

const save = saveAnswers.bind(null, 'you')

function fileName(url: string) {
  // photos/<project>/lebo-<random suffix>.jpg → lebo.jpg
  const last = decodeURIComponent(url.split('/').pop() ?? '')
  return last.replace(/-[A-Za-z0-9]{10,}(\.\w+)$/, '$1') || 'Your photo'
}

export function YouStep({ saved }: { saved: SavedAnswers }) {
  const [name, setName] = useState(saved.makerName ?? '')
  const [photoUrl, setPhotoUrl] = useState(saved.photoUrl)
  const [uploading, setUploading] = useState(false)
  const [failed, setFailed] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const makerName = name.trim() || null
  const initial = makerName?.charAt(0).toUpperCase() ?? '?'

  async function upload(file: File) {
    setUploading(true)
    setFailed(false)
    const body = new FormData()
    body.append('photo', file)
    const res = await fetch('/api/project/photo', { method: 'POST', body }).catch(() => null)
    const data = res?.ok ? ((await res.json()) as { url: string }) : null
    if (data) setPhotoUrl(data.url)
    else setFailed(true)
    setUploading(false)
  }

  return (
    <QuestionLayout
      backHref="/onboarding/ask/product"
      exit={<ExitButton form="ask-form" />}
      progress={2}
      eyebrow="Set up your ask · 2 of 6"
      title="Who's asking?"
      help="People give to a person, not a logo."
      preview={<AskPreview {...previewFrom({ ...saved, makerName, photoUrl })} changed={makerName ? 'me' : null} />}
    >
      <form id="ask-form" action={save} className={st.form}>
        <label className={st.field}>
          <span className={st.label}>Your name</span>
          <input
            className={`${ui.field} ${st.input}`}
            name="makerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lebo"
            maxLength={40}
            autoComplete="given-name"
            required
            autoFocus
          />
        </label>

        <input
          ref={picker}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={st.hidden}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        {photoUrl ? (
          <div className={st.photoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={st.photoAv} src={photoUrl} alt="" />
            <div className={st.photoText}>
              <span className={st.photoName}>{fileName(photoUrl)}</span>
              <span className={`${ui.lbl} ${st.small}`}>Shown as a small circle in the ask</span>
            </div>
            <button type="button" className={`${st.smallPill} ${st.white}`} onClick={() => picker.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
          </div>
        ) : (
          <div className={`${st.photoRow} ${st.photoEmpty}`}>
            <span className={st.photoAv}>{initial}</span>
            <div className={st.photoText}>
              <span className={st.photoName}>Add a photo (optional)</span>
              <span className={`${ui.lbl} ${st.small}`}>Until you do, we show your first initial</span>
            </div>
            <button type="button" className={st.smallPill} onClick={() => picker.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        )}
        {failed ? (
          <span className={st.warn} role="status">
            That photo didn&apos;t upload. Try a PNG or JPG under 4 MB.
          </span>
        ) : null}
        <NextButton disabled={!makerName || uploading} />
      </form>
    </QuestionLayout>
  )
}
