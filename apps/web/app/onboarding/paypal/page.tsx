// Frames 1.2 (connect) and 1.3 (connected). Plan B: an email input inside the design's panel
// (docs/04-DESIGN-NOTES.md), saved as `paypal_email`.
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ArrowIcon, Shell } from '@/components/onboarding/Shell'
import ui from '@/components/ui.module.css'
import { getProjectForUser } from '@/lib/project'
import { connectPayPal, continueToAsk, disconnectPayPal } from './actions'
import s from './paypal.module.css'

function Tick({ size = 12, stroke = 3 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1C1255" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default async function PayPalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const project = await getProjectForUser(session.user.id)
  if (!project) redirect('/')
  const connected = project.paypalEmail

  return (
    <Shell backHref="/" topRight={session.user.email} step="PayPal">
      <main className={s.main}>
        <div className={s.head}>
          <h1 className={`${ui.disp} ${s.title}`}>{connected ? 'PayPal connected' : 'Connect PayPal'}</h1>
          <p className={s.sub}>
            {connected ? 'Tips will land straight in this account.' : 'Tips go straight to your PayPal. Fren never holds the money.'}
          </p>
        </div>

        {connected ? (
          <>
            <div className={`${ui.card} ${s.box} ${s.done}`}>
              <span className={`${ui.icon} ${s.doneIcon}`}>
                <Tick size={22} stroke={2.6} />
              </span>
              <div className={s.text}>
                <span className={s.strong}>{connected}</span>
                <span className={ui.lbl}>PayPal Business · USD · Sandbox</span>
              </div>
              <form action={disconnectPayPal}>
                <button type="submit" className={s.link}>
                  Disconnect
                </button>
              </form>
            </div>
            <div className={`${ui.row} ${s.end}`}>
              <form action={continueToAsk}>
                <button type="submit" className={`${ui.pill} ${ui.primary} ${s.next}`}>
                  Continue
                  <ArrowIcon />
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className={`${ui.panel} ${s.box}`}>
              <span className={`${ui.icon} ${s.white}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C1255" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7h18v12H3zM3 11h18M7 15h4" />
                </svg>
              </span>
              <div className={s.text}>
                <span className={s.strong}>No account connected</span>
                <span className={ui.lbl}>Use your sandbox business account email</span>
              </div>
              <form action={connectPayPal} className={s.form}>
                <label className={s.label}>
                  Your PayPal email
                  <input className={ui.field} type="email" name="email" required autoComplete="email" placeholder="you@business.example.com" />
                </label>
                <button type="submit" className={`${ui.pill} ${ui.primary} ${s.connect}`}>
                  Connect PayPal
                </button>
              </form>
            </div>
            <div className={s.checks}>
              <span className={`${ui.row} ${s.check}`}>
                <span className={ui.tick}>
                  <Tick />
                </span>
                We only ask permission to receive tips
              </span>
              <span className={`${ui.row} ${s.check}`}>
                <span className={ui.tick}>
                  <Tick />
                </span>
                Disconnect any time
              </span>
            </div>
            <div className={`${ui.row} ${s.end}`}>
              <button type="button" className={`${ui.pill} ${s.next}`} disabled>
                Continue
              </button>
            </div>
          </>
        )}
      </main>
    </Shell>
  )
}
