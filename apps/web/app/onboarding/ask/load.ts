import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { savedAnswers } from '@/components/ask-preview/fromProject'
import { getProjectForUser } from '@/lib/project'

/** The signed-in developer's answers so far. PayPal comes first (frames 1.2, 1.3). */
export async function loadAnswers() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const project = await getProjectForUser(session.user.id)
  if (!project) redirect('/')
  if (!project.paypalEmail) redirect('/onboarding/paypal')
  return savedAnswers(project)
}
