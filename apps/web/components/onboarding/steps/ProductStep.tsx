'use client'
// Frames 2.1 (empty) and 2.2 (filled). No logo note (docs/04-DESIGN-NOTES.md).
import { useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import ui from '@/components/ui.module.css'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'

const save = saveAnswers.bind(null, 'product')

export function ProductStep({ saved }: { saved: SavedAnswers }) {
  const [name, setName] = useState(saved.productName ?? '')
  const [website, setWebsite] = useState(saved.website ?? '')
  const productName = name.trim() || null

  return (
    <QuestionLayout
      backHref="/onboarding/paypal"
      exit={<ExitButton form="ask-form" />}
      progress={productName ? 1 : 0}
      eyebrow="Set up your ask · 1 of 6"
      title="What are you building?"
      help="Your product name and website show in the ask, so it looks like part of your app."
      preview={<AskPreview {...previewFrom({ ...saved, productName })} changed={productName ? 'site' : null} />}
    >
      <form id="ask-form" action={save} className={st.form}>
        <label className={st.field}>
          <span className={st.label}>Product name</span>
          <input
            className={`${ui.field} ${st.input}`}
            name="productName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Inkwell"
            maxLength={60}
            required
            autoFocus
          />
        </label>
        <label className={st.field}>
          <span className={st.label}>Website</span>
          <input
            className={`${ui.field} ${st.input}`}
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            maxLength={200}
            inputMode="url"
            autoComplete="url"
          />
        </label>
        <NextButton disabled={!productName} />
      </form>
    </QuestionLayout>
  )
}
