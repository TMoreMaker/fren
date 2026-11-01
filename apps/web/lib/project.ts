import { eq } from 'drizzle-orm'
import { db, schema } from './db'
import { newPublicKey } from './keys'

export async function getProjectForUser(userId: string) {
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.userId, userId)).limit(1)
  return project ?? null
}

// One project per developer for the hackathon. Called on first sign in.
export async function createEmptyProject(userId: string) {
  const existing = await getProjectForUser(userId)
  if (existing) return existing
  const [project] = await db
    .insert(schema.projects)
    .values({ userId, publicKey: newPublicKey() })
    .returning()
  return project
}

// Where each `onboarding_step` lives (spec section 8). Refresh resumes here.
const STEP_PATHS: Record<string, string> = {
  paypal: '/onboarding/paypal',
  product: '/onboarding/ask/product',
  you: '/onboarding/ask/you',
  moment: '/onboarding/ask/moment',
  tone: '/onboarding/ask/tone',
  message: '/onboarding/ask/message',
  amounts: '/onboarding/ask/amounts',
  review: '/onboarding/ask/review',
  install: '/onboarding/install',
  live: '/onboarding/live',
  done: '/dashboard',
}

export function onboardingPath(step: string): string {
  return STEP_PATHS[step] ?? '/onboarding/paypal'
}
