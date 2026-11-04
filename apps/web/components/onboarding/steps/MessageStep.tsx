'use client'
// Frame 2.6: Fren AI's three versions. Pick one, edit it in its card, or ask for new ones.
// Coming back keeps the saved message as the first card, with two new versions under it.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import { fallbackDrafts, MESSAGE_MAX } from '@/lib/fallback-drafts'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'

const save = saveAnswers.bind(null, 'message')
const TONE_LABEL = { warm: 'Warm', playful: 'Playful', straight: 'Straight' }

function Spark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className={st.draft}>
      <span className={st.radio} aria-hidden="true" />
      <span className={st.draftBody}>
        <span className={st.lookSkeleton} style={{ width: '94%' }} />
        <span className={st.lookSkeleton} style={{ width: '70%' }} />
        <span className={st.lookSkeleton} style={{ width: '32%', height: 9, marginTop: 4 }} />
      </span>
    </div>
  )
}

/** The picked card's text. Grows with its words, so it still reads as the card on the canvas. */
function DraftEditor({ value, onChange }: { value: string; onChange(value: string): void }) {
  const box = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    // The words rewrap when the card changes width or the web font arrives.
    const watcher = new ResizeObserver(fit)
    watcher.observe(el.parentElement!)
    void document.fonts.ready.then(fit)
    return () => watcher.disconnect()
  }, [value])
  return (
    <textarea
      ref={box}
      className={st.draftEdit}
      name="message"
      aria-label="Your message"
      rows={1}
      maxLength={MESSAGE_MAX}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function MessageStep({ saved }: { saved: SavedAnswers }) {
  const [drafts, setDrafts] = useState<string[]>(saved.message ? [saved.message] : [])
  const [picked, setPicked] = useState(0)
  const [loading, setLoading] = useState(true)
  const [headline, setHeadline] = useState(saved.headline)
  const request = useRef(0)
  const message = drafts[picked] ?? ''

  async function write(keep: string[]) {
    const id = ++request.current
    setDrafts(keep)
    setPicked(0)
    setLoading(true)
    const res = await fetch('/api/ai/drafts', { method: 'POST' }).catch(() => null)
    const data = res?.ok ? ((await res.json()) as { drafts: { text: string }[]; headline: string | null }) : null
    if (id !== request.current) return // a newer request is on its way
    const fresh = data?.drafts.map((d) => d.text) ?? fallbackDrafts(saved.productName, saved.tone)
    setDrafts([...keep, ...fresh.filter((t) => !keep.includes(t))].slice(0, 3))
    if (data?.headline) setHeadline((current) => current ?? data.headline)
    setLoading(false)
  }

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void write(saved.message ? [saved.message] : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function edit(text: string) {
    // One sentence in the ask, so Enter never adds a line break.
    setDrafts((all) => all.map((d, i) => (i === picked ? text.replace(/\s*\n\s*/g, ' ') : d)))
  }

  const toneLabel = TONE_LABEL[saved.tone ?? 'warm']

  return (
    <QuestionLayout
      backHref="/onboarding/ask/tone"
      exit={<ExitButton form="ask-form" />}
      progress={5}
      eyebrow="Set up your ask · 5 of 6"
      title="Pick your message"
      help="Choose one to use. You can tweak the words."
      preview={<AskPreview {...previewFrom({ ...saved, headline, message: message.trim() || null })} changed={message.trim() ? 'msg' : null} />}
    >
      <form id="ask-form" action={save} className={st.form}>
        <input type="hidden" name="headline" value={headline ?? ''} />
        <fieldset className={st.drafts} aria-busy={loading}>
          <legend className={st.hidden}>Your message</legend>
          <div className={st.draftsHead}>
            <span className={st.aiTag} aria-live="polite">
              <Spark />
              {loading ? 'Writing your message…' : 'Fren AI wrote 3 versions'}
            </span>
            {loading ? null : (
              <button type="button" className={st.rewrite} onClick={() => void write([])}>
                Write new ones
              </button>
            )}
          </div>
          {drafts.map((text, i) => (
            <label key={i} className={st.draft}>
              <input className={st.hidden} type="radio" name="draft" checked={i === picked} onChange={() => setPicked(i)} />
              <span className={st.radio} aria-hidden="true" />
              <span className={st.draftBody}>
                {i === picked ? <DraftEditor value={text} onChange={edit} /> : <span>{text}</span>}
                <span className={st.draftMeta}>
                  {toneLabel} · {text.trim().length} characters
                </span>
              </span>
            </label>
          ))}
          {loading ? Array.from({ length: 3 - drafts.length }, (_, i) => <SkeletonCard key={i} />) : null}
          <span className={st.draftMeta} style={{ fontSize: 13 }}>
            Written from your product, your name, the moment and the tone. Edit any time.
          </span>
        </fieldset>
        <NextButton disabled={!message.trim()} />
      </form>
    </QuestionLayout>
  )
}
