'use server'
// Frame 1.2, Plan B (spec 7.6): the developer types their PayPal email.
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/auth'
import { db, schema } from '@/lib/db'
import { getProjectForUser } from '@/lib/project'

const email = z.string().trim().toLowerCase().email().max(254)

async function currentProject() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not signed in')
  const project = await getProjectForUser(session.user.id)
  if (!project) throw new Error('No project')
  return project
}

export async function connectPayPal(form: FormData) {
  const parsed = email.safeParse(form.get('email'))
  if (!parsed.success) return
  const project = await currentProject()
  await db
    .update(schema.projects)
    .set({
      paypalEmail: parsed.data,
      // Move on to the ask questions, but never back from a later step.
      ...(project.onboardingStep === 'paypal' ? { onboardingStep: 'product' } : {}),
    })
    .where(eq(schema.projects.id, project.id))
  revalidatePath('/onboarding/paypal')
}

export async function disconnectPayPal() {
  const project = await currentProject()
  await db.update(schema.projects).set({ paypalEmail: null }).where(eq(schema.projects.id, project.id))
  revalidatePath('/onboarding/paypal')
}

export async function continueToAsk() {
  const project = await currentProject()
  if (!project.paypalEmail) redirect('/onboarding/paypal')
  if (project.onboardingStep === 'paypal') {
    await db.update(schema.projects).set({ onboardingStep: 'product' }).where(eq(schema.projects.id, project.id))
  }
  redirect('/onboarding/ask/product')
}
