import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { getProjectForUser, onboardingPath } from '@/lib/project'

// Scaffold stand-in for frame 1.1. The real sign up screen is build plan step 3.1.
export default async function SignUpPage() {
  const session = await auth()
  if (session?.user?.id) {
    const project = await getProjectForUser(session.user.id)
    redirect(onboardingPath(project?.onboardingStep ?? 'paypal'))
  }

  return (
    <main style={{ padding: 32 }}>
      <form
        action={async () => {
          'use server'
          await signIn('github', { redirectTo: '/onboarding/paypal' })
        }}
      >
        <button type="submit">Continue with GitHub</button>
      </form>
    </main>
  )
}
