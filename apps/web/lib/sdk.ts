// Public SDK routes: docs/02-BUILD-SPEC.md sections 5.3 and 6.5.
import { and, count, eq, isNull } from 'drizzle-orm'
import { judgeMoment, type Verdict } from './ai'
import { rateLimited, tipRules } from './ask-rules'
import { db, schema } from './db'
import type { Project, SkipReason } from './db/schema'
import type { Signal } from './signals'

const { events, projects } = schema
type NewEvent = typeof events.$inferInsert

const AI_TIMEOUT_MS = 4_000
const DAY_MS = 24 * 60 * 60 * 1000

export interface Visitor {
  anonId: string
  sessionId: string | null
  test: boolean
}

function logEvent(project: Project, visitor: Visitor, event: Omit<NewEvent, 'projectId' | 'anonId'>) {
  return db.insert(events).values({
    projectId: project.id,
    anonId: visitor.anonId,
    sessionId: visitor.sessionId,
    isTest: visitor.test,
    ...event,
  })
}

/** What the widget needs to draw the ask. Marks the SDK as seen for 3.2. */
export async function initSdk(project: Project) {
  if (!project.sdkSeenAt) {
    await db
      .update(projects)
      .set({ sdkSeenAt: new Date() })
      .where(and(eq(projects.id, project.id), isNull(projects.sdkSeenAt)))
  }
  return {
    ok: true,
    project: {
      makerName: project.makerName,
      photoUrl: project.photoUrl,
      initial: project.makerName?.trim().charAt(0).toUpperCase() ?? null,
      productName: project.productName,
      headline: project.headline,
      message: project.message,
      amounts: project.amounts,
      defaultAmount: project.defaultAmount,
      currency: project.currency,
    },
  }
}

/** What the AI said, sent back for `?fren=debug` and the demo's verdict pill. */
type Judged = Pick<Verdict, 'isMoment' | 'confidence' | 'label'>

export type AskResult =
  | { show: true; headline?: string; label?: string; verdict?: Judged }
  | { show: false; reason?: SkipReason; verdict?: Judged }

async function skip(project: Project, visitor: Visitor, reason: SkipReason, verdict?: Judged): Promise<AskResult> {
  await logEvent(project, visitor, { type: 'skipped', reason })
  return { show: false, reason, verdict }
}

/** True when this visitor already has a `judged` event the AI said yes to. */
async function reachedBefore(project: Project, visitor: Visitor) {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.projectId, project.id),
        eq(events.anonId, visitor.anonId),
        eq(events.type, 'judged'),
        eq(events.isMoment, true),
      ),
    )
    .limit(1)
  return Boolean(row)
}

/**
 * The SDK resends its last 20 signals each time. Each is stored at its own time,
 * and a unique index keeps the ones already saved from being saved again.
 * Returns the trail, oldest first, or an empty list when nothing was new.
 */
async function saveNewSignals(project: Project, visitor: Visitor, signals: Signal[]): Promise<Signal[]> {
  const now = Date.now()
  const recent = signals.filter((s) => s.at > now - DAY_MS && s.at < now + 5 * 60_000).sort((a, b) => a.at - b.at)
  if (!recent.length) return []

  const added = await db
    .insert(events)
    .values(
      recent.map((s) => ({
        projectId: project.id,
        type: 'signal' as const,
        eventName: s.type,
        detail: s.label,
        anonId: visitor.anonId,
        sessionId: visitor.sessionId,
        isTest: visitor.test,
        createdAt: new Date(s.at),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: events.id })
  if (!added.length) return []

  if (!project.firstEventAt) {
    await db
      .update(projects)
      .set({ firstEventAt: new Date() })
      .where(and(eq(projects.id, project.id), isNull(projects.firstEventAt)))
  }
  return recent
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI check timed out')), ms)),
  ])
}

/** POST /api/sdk/signals: the main trigger, steps 1 to 7 of spec 6.5. */
export async function handleSignals(project: Project, visitor: Visitor, signals: Signal[]): Promise<AskResult> {
  const trail = await saveNewSignals(project, visitor, signals)
  // Nothing new since the last call, so there's nothing new to judge.
  if (!trail.length) return { show: false }

  const ruled = await tipRules(project.id, visitor.anonId, visitor.test)
  if (ruled) return skip(project, visitor, ruled)
  if (!visitor.sessionId || (await rateLimited(project.id, visitor.sessionId))) {
    return skip(project, visitor, 'rate_limited')
  }

  // A check is stamped with when it started, so the 3 second gap runs from there (rule 4).
  const checkedAt = new Date()
  let verdict: Verdict
  try {
    verdict = await withTimeout(judgeMoment(project, trail, await reachedBefore(project, visitor)), AI_TIMEOUT_MS)
  } catch (err) {
    console.error('moment check failed', err)
    await logEvent(project, visitor, { type: 'skipped', reason: 'ai_timeout', createdAt: checkedAt })
    return { show: false, reason: 'ai_timeout' }
  }

  let occurrence: number | null = null
  if (verdict.kind) {
    const [earlier] = await db
      .select({ n: count() })
      .from(events)
      .where(
        and(
          eq(events.projectId, project.id),
          eq(events.anonId, visitor.anonId),
          eq(events.type, 'judged'),
          eq(events.eventName, verdict.kind),
        ),
      )
    occurrence = earlier!.n + 1
  }
  await logEvent(project, visitor, {
    type: 'judged',
    eventName: verdict.kind,
    detail: verdict.label || null,
    confidence: verdict.confidence,
    occurrence,
    isMoment: verdict.isMoment,
    createdAt: checkedAt,
  })

  const judged: Judged = { isMoment: verdict.isMoment, confidence: verdict.confidence, label: verdict.label }
  if (!verdict.isMoment || verdict.confidence < project.aiThreshold) return skip(project, visitor, 'ai_no', judged)

  await logEvent(project, visitor, { type: 'shown', detail: verdict.label, confidence: verdict.confidence })
  if (!project.firstSpottedAt) {
    await db
      .update(projects)
      .set({ firstSpottedAt: new Date() })
      .where(and(eq(projects.id, project.id), isNull(projects.firstSpottedAt)))
  }
  return { show: true, headline: verdict.headline || undefined, label: verdict.label, verdict: judged }
}

/** POST /api/sdk/moment: the manual override. Rules 2 and 3 only, no AI. */
export async function handleMoment(project: Project, visitor: Visitor, name: string): Promise<AskResult> {
  await logEvent(project, visitor, { type: 'moment', eventName: name })
  const ruled = await tipRules(project.id, visitor.anonId, visitor.test)
  if (ruled) return skip(project, visitor, ruled)
  await logEvent(project, visitor, { type: 'shown', eventName: name, detail: name })
  return { show: true }
}

export async function trackAsk(project: Project, visitor: Visitor, type: 'clicked' | 'dismissed') {
  await logEvent(project, visitor, { type })
  return { ok: true }
}
