// The onboarding frame shared by 1.x and 3.x: back button, fren logo, top-right text, step bar.
import Link from 'next/link'
import ui from '../ui.module.css'
import s from './shell.module.css'

const STEPS = ['PayPal', 'Your ask', 'Install', 'Go live'] as const
export type StepName = (typeof STEPS)[number]

export function Logo() {
  return (
    <span className={s.logo}>
      <span className={s.mark} aria-hidden="true" />
      <span className={`${ui.disp} ${s.word}`}>fren</span>
    </span>
  )
}

export function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0E0F0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Shell({
  backHref,
  topRight,
  step,
  children,
}: {
  backHref?: string
  topRight?: React.ReactNode
  step?: StepName
  children: React.ReactNode
}) {
  const current = step ? STEPS.indexOf(step) : -1
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.side}>
          {backHref ? (
            <Link className={ui.circle} href={backHref} aria-label="Back">
              <BackIcon />
            </Link>
          ) : null}
        </div>
        <Logo />
        <div className={`${s.side} ${s.right}`}>
          <span className={ui.lbl}>{topRight}</span>
        </div>
      </header>
      {step ? (
        <div className={s.stepsWrap}>
          <ol className={s.steps}>
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`${s.step} ${i < current ? s.done : i === current ? s.on : ''}`}
                aria-current={i === current ? 'step' : undefined}
              >
                <span className={s.bar} />
                {label}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {children}
    </div>
  )
}
