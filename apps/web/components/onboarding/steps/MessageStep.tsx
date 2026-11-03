'use client'
// Frame 2.6. Fren AI writes 3 drafts (spec 7.3). Pick one; the picked card's words can be edited in place.
// Coming back: the saved message is card 1, picked, and Fren AI writes 2 new ones (agreed 3 Nov).
import { useEffect, useRef, useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import ui from '@/components/ui.module.css'
import { DRAFT_MAX, fallbackDrafts } from '@/lib/draft-fallback'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'

const save = saveAnswers.bind(null, 'message')

const TONE_LABEL = { warm: 'Warm', playful: 'Playful', straight: 'Straight' } as const

type Card = { text: string; headline: string | null }

function Spark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" />
    </svg>
  )
}

async function fetchDrafts(saved: SavedAnswers): Promise<Card[]> {
  const res = await fetch('/api/ai/drafts', { method: 'POST' }).catch(() => null)
  const data = res?.ok ? ((await res.json().catch(() => null)) as { drafts: { text: string }[]; headline: string | null } | null) : null
  // The server already falls back to templates; this covers the network failing too.
  if (!data?.drafts.length) return fallbackDrafts(saved.productName, saved.tone).map((text) => ({ text, headline: null }))
  return data.drafts.map((d) => ({ text: d.text, headline: data.headline }))
}

export function MessageStep({ saved }: { saved: SavedAnswers }) {
  const [cards, setCards] = useState<Card[]>([])
  const [picked, setPicked] = useState(0)
  const [loading, setLoading] = useState(true)
  const request = useRef(0)
  const toneLabel = TONE_LABEL[saved.tone ?? 'warm']

  async function write(keepSaved: boolean) {
    const id = ++request.current
    setLoading(true)
    const fresh = await fetchDrafts(saved)
    if (id !== request.current) return
    const savedCard = keepSaved && saved.message ? [{ text: saved.message, headline: saved.headline }] : []
    setCards([...savedCard, ...fresh.filter((c) => c.text !== saved.message)].slice(0, 3))
    setPicked(0)
    setLoading(false)
  }

  useEffect(() => {
    void write(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function edit(i: number, text: string) {
    setCards((all) => all.map((c, j) => (j === i ? { ...c, text: text.replace(/\s*\n\s*/g, ' ') } : c)))
  }

  const current = loading ? null : cards[picked]
  const message = current ? current.text.trim() : saved.message
  const preview = previewFrom({ ...saved, message: message || null, headline: current?.headline ?? saved.headline })

  return (
    <QuestionLayout
      backHref="/onboarding/ask/tone"
      exit={<ExitButton form="ask-form" />}
      progress={5}
      eyebrow="Set up your ask · 5 of 6"
      title="Pick your message"
      help="Choose one to use. You can tweak the words."
      preview={<AskPreview {...preview} changed={message ? 'msg' : null} />}
    >
      <form id="ask-form" action={save} className={st.form}>
        <div className={st.drafts} aria-live="polite" aria-busy={loading}>
          <div className={st.draftsHead}>
            <span className={st.aiTag}>
              <Spark />
              {loading ? 'Writing your message…' : 'Fren AI wrote 3 versions'}
            </span>
            <button type="button" className={st.linkButton} onClick={() => void write(false)} disabled={loading}>
              Write new ones
            </button>
          </div>

          {loading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={st.draft}>
                <span className={st.radio} />
                <span className={st.draftText}>
                  <span className={st.lookSkeleton} style={{ width: '92%' }} />
                  <span className={st.lookSkeleton} style={{ width: '58%' }} />
                </span>
              </div>
            ))
          ) : (
            <fieldset className={st.opts}>
              <legend className={st.hidden}>Message</legend>
              {cards.map((card, i) => (
                <label key={i} className={st.draft}>
                  <input type="radio" name="draft" className={st.hidden} checked={i === picked} onChange={() => setPicked(i)} />
                  <span className={st.radio} />
                  <span className={st.draftText}>
                    {i === picked ? (
                      <textarea
                        className={st.draftEdit}
                        name="message"
                        aria-label="Your message"
                        value={card.text}
                        onChange={(e) => edit(i, e.target.value)}
                        maxLength={DRAFT_MAX}
                        rows={2}
                        required
                      />
                    ) : (
                      <span>{card.text}</span>
                    )}
                    <span className={`${ui.lbl} ${st.draftMeta}`}>
                      {toneLabel} · {card.text.trim().length} characters
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <span className={`${ui.lbl} ${st.small}`}>Written from your product, your name, the moment and the tone. Edit any time.</span>
        </div>

        <input type="hidden" name="headline" value={current?.headline ?? ''} />
        <NextButton disabled={!message || loading} />
      </form>
    </QuestionLayout>
  )
}
