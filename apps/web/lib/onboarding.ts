// Onboarding answers, step by step (spec 5.1 and 8). Each step saves its own fields and moves
// `onboarding_step` forward, never back, so a refresh resumes at the furthest step reached.
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/auth'
import { db, schema } from './db'
import type { Project, Tone } from './db/schema'
import { AMOUNT_PRESETS, type AmountPreset } from './amounts'
import { MESSAGE_MAX } from './fallback-drafts'
import { getProjectForUser, onboardingPath } from './project'

export const STEP_ORDER = [
  'paypal',
  'product',
  'you',
  'moment',
  'tone',
  'message',
  'amounts',
  'review',
  'install',
  'live',
  'done',
] as const
export type OnboardingStep = (typeof STEP_ORDER)[number]

/** "https://www.Inkwell.app/" → "inkwell.app". Keeps a path if there is one. */
export function cleanWebsite(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

const text = (max: number) => z.string().trim().min(1).max(max)

export const answerSchemas = {
  product: z.object({
    productName: text(60),
    website: z
      .string()
      .max(200)
      .transform((v) => cleanWebsite(v) || null),
  }),
  you: z.object({ makerName: text(40) }),
  moment: z.object({ momentDescription: text(300) }),
  tone: z.object({ tone: z.enum(['warm', 'playful', 'straight']) }),
  message: z.object({
    message: text(MESSAGE_MAX),
    headline: z
      .string()
      .trim()
      .max(60)
      .transform((v) => v || undefined),
  }),
  amounts: z.object({ preset: z.enum(['small', 'pro']) }),
}
export type AnswerStep = keyof typeof answerSchemas

export async function requireProject(): Promise<Project> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not signed in')
  const project = await getProjectForUser(session.user.id)
  if (!project) throw new Error('No project')
  return project
}

export function laterStep(a: string, b: OnboardingStep): OnboardingStep {
  const ia = STEP_ORDER.indexOf(a as OnboardingStep)
  return ia > STEP_ORDER.indexOf(b) ? (a as OnboardingStep) : b
}

export function nextStepOf(step: OnboardingStep): OnboardingStep {
  return STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)]!
}

export function stepPath(step: OnboardingStep): string {
  return onboardingPath(step)
}

/** The fields one step's answers change. */
export function fieldsFor(step: AnswerStep, data: Record<string, unknown>): Partial<typeof schema.projects.$inferInsert> {
  if (step === 'amounts') {
    const preset = AMOUNT_PRESETS[data.preset as AmountPreset]
    return { amounts: [...preset.amounts], defaultAmount: preset.defaultAmount }
  }
  if (step === 'tone') return { tone: data.tone as Tone }
  return data as Partial<typeof schema.projects.$inferInsert>
}

export async function updateProject(id: string, fields: Partial<typeof schema.projects.$inferInsert>) {
  await db.update(schema.projects).set(fields).where(eq(schema.projects.id, id))
}
