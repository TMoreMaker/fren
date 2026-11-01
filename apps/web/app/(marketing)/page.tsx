// Frame 1.1: sign up. GitHub only (docs/04-DESIGN-NOTES.md hides Google and email).
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { Shell } from '@/components/onboarding/Shell'
import ui from '@/components/ui.module.css'
import { getProjectForUser, onboardingPath } from '@/lib/project'
import s from './signup.module.css'

const HOW = [
  ['Tell us your aha moment', 'The point your users get real value'],
  ['Fren AI writes your ask', 'In your voice, from your answers'],
  ['Tips land in your PayPal', 'Fren never holds the money'],
] as const

async function continueWithGitHub() {
  'use server'
  await signIn('github', { redirectTo: '/' })
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1C1255" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
    </svg>
  )
}

export default async function SignUpPage() {
  const session = await auth()
  if (session?.user?.id) {
    const project = await getProjectForUser(session.user.id)
    redirect(onboardingPath(project?.onboardingStep ?? 'paypal'))
  }

  return (
    <Shell
      topRight={
        <form action={continueWithGitHub}>
          Already have an account?{' '}
          <button type="submit" className={s.login}>
            Log in
          </button>
        </form>
      }
    >
      <main className={s.main}>
        <div className={s.left}>
          <h1 className={`${ui.disp} ${s.title}`}>Get tipped when users love your product</h1>
          <p className={s.sub}>Fren asks for a PayPal tip at the moment your users get value. Set up in about five minutes.</p>
          <form action={continueWithGitHub} className={s.form}>
            <button type="submit" className={`${ui.pill} ${ui.primary}`}>
              <GitHubIcon />
              Continue with GitHub
            </button>
          </form>
          <span className={`${ui.lbl} ${s.note}`}>Free while you&apos;re small. No card needed.</span>
        </div>
        <div className={`${ui.panel} ${s.how}`}>
          <span className={s.howTitle}>How it works</span>
          {HOW.map(([title, sub], i) => (
            <div key={title} className={`${ui.card} ${s.item}`}>
              <span className={`${ui.icon} ${s.num}`}>{i + 1}</span>
              <div className={s.itemText}>
                <span className={s.itemTitle}>{title}</span>
                <span className={ui.lbl}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Shell>
  )
}
