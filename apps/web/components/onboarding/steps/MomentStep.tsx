'use client'
// Frames 2.4b (empty, starter chips) and 2.4 (Fren AI's plan). Spec 7.2: plan on an 800ms pause or blur.
import { useEffect, useRef, useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import ui from '@/components/ui.module.css'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'

const save = saveAnswers.bind(null, 'moment')
const PAUSE_MS = 800

// Spec section 8: the chips fill the box, the developer can edit.
const STARTERS = [
  ['Exports or downloads a file', 'When someone exports or downloads their first file.'],
  ['Creates their first project', 'When someone creates their first project.'],
  ['Finishes a task', 'When someone finishes their first task.'],
] as const

type Plan = { state: 'idle' } | { state: 'loading' } | { state: 'ready'; lookFor: string[]; headline: string | null } | { state: 'failed' }

function Spark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" />
    </svg>
  )
}

function Tick() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1C1255" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function MomentStep({ saved }: { saved: SavedAnswers }) {
  const [text, setText] = useState(saved.momentDescription ?? '')
  const [plan, setPlan] = useState<Plan>(
    saved.momentHints?.length ? { state: 'ready', lookFor: saved.momentHints, headline: saved.headline } : { state: 'idle' },
  )
  const planned = useRef(saved.momentHints?.length ? (saved.momentDescription ?? '').trim() : '')
  const request = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const description = text.trim()

  async function makePlan(value: string) {
    clearTimeout(timer.current)
    if (!value || value === planned.current) return
    planned.current = value
    const id = ++request.current
    setPlan({ state: 'loading' })
    const res = await fetch('/api/ai/moment-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: value }),
    }).catch(() => null)
    const data = res?.ok ? ((await res.json()) as { lookFor: string[]; headline: string | null }) : null
    if (id !== request.current) return // a newer description is on its way
    setPlan(data?.lookFor.length ? { state: 'ready', ...data } : { state: 'failed' })
  }

  useEffect(() => {
    clearTimeout(timer.current)
    if (description && description !== planned.current) timer.current = setTimeout(() => void makePlan(description), PAUSE_MS)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description])

  const headline = plan.state === 'ready' && plan.headline ? plan.headline : null
  const preview = previewFrom({ ...saved, momentDescription: description || null, headline: headline ?? saved.headline })

  return (
    <QuestionLayout
      backHref="/onboarding/ask/you"
      exit={<ExitButton form="ask-form" />}
      progress={3}
      eyebrow="Set up your ask · 3 of 6"
      title="When does a user get real value?"
      help="Describe it in plain words. Fren AI watches for it and asks right after, never before."
      preview={<AskPreview {...preview} changed={headline ? 'head' : null} />}
    >
      <form id="ask-form" action={save} className={st.form}>
        <label className={st.field}>
          <span className={st.label}>Describe the moment</span>
          <textarea
            className={`${ui.field} ${st.input} ${st.textarea}`}
            name="momentDescription"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => void makePlan(description)}
            placeholder="e.g. When someone exports their first chapter"
            maxLength={300}
            required
            autoFocus
          />
        </label>

        {!description ? (
          <div className={st.chips}>
            <span className={`${ui.lbl} ${st.small}`}>Or start from one of these</span>
            <div className={st.chipRow}>
              {STARTERS.map(([label, fill]) => (
                <button key={label} type="button" className={st.chip} onClick={() => setText(fill)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {description && (plan.state === 'loading' || plan.state === 'ready') ? (
          <div className={st.aiBox} aria-live="polite" aria-busy={plan.state === 'loading'}>
            <span className={st.aiTag}>
              <Spark />
              Fren AI will watch for
            </span>
            {plan.state === 'ready'
              ? plan.lookFor.map((item) => (
                  <span key={item} className={st.look}>
                    <span className={st.lookTick}>
                      <Tick />
                    </span>
                    {item}
                  </span>
                ))
              : ['78%', '64%', '86%'].map((w) => <span key={w} className={st.lookSkeleton} style={{ width: w }} />)}
            <span className={`${ui.lbl} ${st.small}`}>It sees what users click and download. It never reads what they type.</span>
          </div>
        ) : null}

        <NextButton disabled={!description} />
      </form>
    </QuestionLayout>
  )
}
