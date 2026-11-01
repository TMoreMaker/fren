// Dev only (build plan step 3.2): the question layout and the live preview at every state on the
// canvas, 2.1 empty through 2.8 full, with the canvas's own sample answers.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AskPreview, type AskPreviewProps } from '@/components/ask-preview/AskPreview'
import { NextButton, QuestionLayout } from '@/components/onboarding/QuestionLayout'
import s from './dev.module.css'

// The canvas's photo stand-in (a silhouette), so the photo state can be seen without an upload.
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#1C1255"/><g transform="translate(1.5 3.5) scale(0.875)" fill="#A397FF"><circle cx="12" cy="9" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></g></svg>',
)}`

const BEFORE = 'Shows after the moment you describe.'
const AFTER = "Shows when Fren AI spots a user's first export."
const product = { productName: 'Inkwell', headline: 'Enjoying Inkwell?' }
const me = { ...product, makerName: 'Lebo', photoUrl: PHOTO }
const moment = { ...me, headline: 'Glad that export worked.' }
const message = { ...moment, message: 'If Inkwell saves you time, a small tip helps me keep it free and ad-free.' }
const full = { ...message, amounts: [3, 5, 10], defaultAmount: 5 }

const STATES: { id: string; progress: number; q: string; help: string; preview: AskPreviewProps }[] = [
  { id: '2.1', progress: 0, q: 'What are you building?', help: 'Your product name and website show in the ask, so it looks like part of your app.', preview: { caption: BEFORE } },
  { id: '2.2', progress: 1, q: 'What are you building?', help: 'Your product name and website show in the ask, so it looks like part of your app.', preview: { ...product, changed: 'site', caption: BEFORE } },
  { id: '2.3', progress: 2, q: "Who's asking?", help: 'People give to a person, not a logo.', preview: { ...me, changed: 'me', caption: BEFORE } },
  { id: '2.3b', progress: 2, q: "Who's asking?", help: 'People give to a person, not a logo.', preview: { ...me, photoUrl: null, changed: 'me', caption: BEFORE } },
  { id: '2.4b', progress: 3, q: 'When does a user get real value?', help: 'Describe it in plain words. Fren AI watches for it and asks right after, never before.', preview: { ...me, caption: BEFORE } },
  { id: '2.4', progress: 3, q: 'When does a user get real value?', help: 'Describe it in plain words. Fren AI watches for it and asks right after, never before.', preview: { ...moment, changed: 'head', caption: AFTER } },
  { id: '2.5', progress: 4, q: 'How should it sound?', help: 'Fren AI uses this to write your message on the next step.', preview: { ...moment, caption: AFTER } },
  { id: '2.6', progress: 5, q: 'Pick your message', help: 'Choose one to use. You can tweak the words.', preview: { ...message, changed: 'msg', caption: AFTER } },
  { id: '2.7', progress: 6, q: 'Which amounts should we suggest?', help: 'The middle amount is pre-selected.', preview: { ...full, changed: 'amt', caption: AFTER } },
  { id: '2.8', progress: 7, q: 'Here is your ask', help: 'Inkwell users see this when Fren AI spots their first export.', preview: { ...full, caption: 'Exactly what users will see' } },
]

export default async function DevPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  const { state = '2.1' } = await searchParams
  const current = STATES.find((x) => x.id === state) ?? STATES[0]!

  return (
    <QuestionLayout
      backHref="/dev/preview"
      progress={current.progress}
      eyebrow={current.progress === 7 ? 'Set up your ask · Review' : `Set up your ask · ${Math.max(1, Math.min(current.progress, 6))} of 6`}
      title={current.q}
      help={current.help}
      preview={<AskPreview {...current.preview} />}
    >
      <nav className={s.states} aria-label="Canvas states">
        {STATES.map((x) => (
          <Link key={x.id} href={`/dev/preview?state=${x.id}`} className={`${s.state} ${x.id === current.id ? s.on : ''}`}>
            {x.id}
          </Link>
        ))}
      </nav>
      <form>
        <NextButton label={current.progress === 7 ? 'Looks good, install Fren' : 'Next'} disabled={current.id === '2.1' || current.id === '2.4b'} />
      </form>
    </QuestionLayout>
  )
}
