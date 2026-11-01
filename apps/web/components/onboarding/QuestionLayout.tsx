'use client'
// The ask questions, frames 2.1 to 2.8 (spec section 8): top bar, progress bar,
// the question on the left and the live preview on the right.
import Link from 'next/link'
import { useFormStatus } from 'react-dom'
import ui from '../ui.module.css'
import s from './question.module.css'
import { ArrowIcon, BackIcon, Logo } from './Shell'
import shell from './shell.module.css'

// Progress bar width per step, from the canvas: 2.1 empty through 2.8 review.
const PROGRESS = ['4%', '16%', '30%', '44%', '58%', '72%', '86%', '100%']

export function QuestionLayout({
  backHref,
  exit,
  progress,
  eyebrow,
  title,
  help,
  preview,
  children,
}: {
  backHref: string
  /** The "Save and exit" control (a form button in the real steps). */
  exit?: React.ReactNode
  /** 0 for 2.1 empty up to 7 for 2.8 review. */
  progress: number
  eyebrow: string
  title: string
  help: string
  preview: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={s.page}>
      <header className={shell.header}>
        <div className={shell.side}>
          <Link className={ui.circle} href={backHref} aria-label="Back">
            <BackIcon />
          </Link>
        </div>
        <Logo />
        <div className={`${shell.side} ${shell.right}`}>{exit}</div>
      </header>
      <div className={s.progressWrap}>
        <div className={s.track} role="progressbar" aria-label="Set up progress" aria-valuenow={progress + 1} aria-valuemin={1} aria-valuemax={PROGRESS.length}>
          <div className={s.fill} style={{ width: PROGRESS[progress] ?? '4%' }} />
        </div>
      </div>
      <main className={s.main}>
        <section className={s.left}>
          <span className={`${ui.lbl} ${s.eyebrow}`}>{eyebrow}</span>
          <div className={s.head}>
            <h1 className={`${ui.disp} ${s.title}`}>{title}</h1>
            <p className={s.help}>{help}</p>
          </div>
          {children}
        </section>
        {preview}
      </main>
    </div>
  )
}

/** The form's submit button. The answers go to the step's save action. */
export function NextButton({ label = 'Next', disabled }: { label?: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <div className={s.actions}>
      <button type="submit" name="intent" value="next" className={`${s.pill} ${s.next}`} disabled={disabled || pending}>
        {label}
        <ArrowIcon />
      </button>
    </div>
  )
}

/** Sits in the top bar, outside the form, so it names the form it submits. */
export function ExitButton({ form }: { form: string }) {
  return (
    <button type="submit" form={form} name="intent" value="exit" formNoValidate className={`${s.pill} ${s.exit}`}>
      Save and exit
    </button>
  )
}
