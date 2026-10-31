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

export function onboardingPath(step: string): string {
  return step === 'done' ? '/dashboard' : '/onboarding/paypal'
}
