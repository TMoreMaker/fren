'use client'
// Frame 2.7, two presets only ("Let them choose" is out of scope, docs/04-DESIGN-NOTES.md).
import { useState } from 'react'
import { saveAnswers } from '@/app/onboarding/ask/actions'
import { AskPreview } from '@/components/ask-preview/AskPreview'
import { previewFrom, type SavedAnswers } from '@/components/ask-preview/fromProject'
import ui from '@/components/ui.module.css'
import { AMOUNT_PRESETS, type AmountPreset, presetOf } from '@/lib/amounts'
import { ExitButton, NextButton, QuestionLayout } from '../QuestionLayout'
import st from '../steps.module.css'
import { ICONS, Options } from './Options'

const save = saveAnswers.bind(null, 'amounts')

const PRESETS = [
  { value: 'small', label: '$3, $5, $10', sub: 'Good for small tools', icon: ICONS.coin },
  { value: 'pro', label: '$5, $10, $20', sub: 'Good for pro tools', icon: ICONS.coin },
] as const satisfies { value: AmountPreset; label: string; sub: string; icon: string }[]

export function AmountsStep({ saved }: { saved: SavedAnswers }) {
  const [preset, setPreset] = useState<AmountPreset>(presetOf(saved.amounts) ?? 'small')
  const chosen = AMOUNT_PRESETS[preset]
  return (
    <QuestionLayout
      backHref="/onboarding/ask/message"
      exit={<ExitButton form="ask-form" />}
      progress={6}
      eyebrow="Set up your ask · 6 of 6"
      title="Which amounts should we suggest?"
      help="The middle amount is pre-selected."
      preview={
        <AskPreview {...previewFrom({ ...saved, amounts: [...chosen.amounts], defaultAmount: chosen.defaultAmount })} changed="amt" />
      }
    >
      <form id="ask-form" action={save} className={st.form}>
        <Options<AmountPreset> name="preset" legend="Amounts" options={[...PRESETS]} value={preset} onChange={setPreset} />
        <span className={ui.lbl}>Currency is USD, from your PayPal account. Payments run in PayPal sandbox for the demo.</span>
        <NextButton />
      </form>
    </QuestionLayout>
  )
}
