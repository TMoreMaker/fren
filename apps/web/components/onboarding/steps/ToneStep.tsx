'use client'
// Frame 2.5. Fren AI uses the tone for the drafts on 2.6.
import { useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import type { Tone } from '@/lib/db/schema'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'
import { ICONS, Options } from './Options'

const save = saveAnswers.bind(null, 'tone')

const TONES = [
  { value: 'warm', label: 'Warm', sub: 'Friendly and grateful', icon: ICONS.sun },
  { value: 'playful', label: 'Playful', sub: 'Light and a bit cheeky', icon: ICONS.spark },
  { value: 'straight', label: 'Straight', sub: 'Short and to the point', icon: ICONS.arrow },
] as const satisfies { value: Tone; label: string; sub: string; icon: string }[]

export function ToneStep({ saved }: { saved: SavedAnswers }) {
  const [tone, setTone] = useState<Tone>(saved.tone ?? 'warm')
  return (
    <QuestionLayout
      backHref="/onboarding/ask/moment"
      exit={<ExitButton form="ask-form" />}
      progress={4}
      eyebrow="Set up your ask · 4 of 6"
      title="How should it sound?"
      help="Fren AI uses this to write your message on the next step."
      preview={<AskPreview {...previewFrom(saved)} />}
    >
      <form id="ask-form" action={save} className={st.form}>
        <Options<Tone> name="tone" legend="Tone" options={[...TONES]} value={tone} onChange={setTone} />
        <NextButton />
      </form>
    </QuestionLayout>
  )
}
