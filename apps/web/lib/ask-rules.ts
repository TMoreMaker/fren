// Should we ask? Rules 2 to 4 of docs/02-BUILD-SPEC.md section 6.5.
import { and, count, eq, gt, inArray, max, or } from 'drizzle-orm'
import { db, schema } from './db'
import type { SkipReason } from './db/schema'

const { events, donations } = schema
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000
const CHECK_GAP_MS = 3_000
const CHECKS_PER_SESSION = 12

/** Rules 2 and 3. Both are off in test mode. */
export async function tipRules(projectId: string, anonId: string, test: boolean): Promise<SkipReason | null> {
  if (test) return null
  const [tipped] = await db
    .select({ n: count() })
    .from(donations)
    .where(and(eq(donations.projectId, projectId), eq(donations.anonId, anonId), eq(donations.status, 'completed')))
  if (tipped!.n > 0) return 'already_tipped'

  // Test asks don't put a real user in cooldown.
  const [shown] = await db
    .select({ n: count() })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        eq(events.anonId, anonId),
        eq(events.type, 'shown'),
        eq(events.isTest, false),
        gt(events.createdAt, new Date(Date.now() - COOLDOWN_MS)),
      ),
    )
  if (shown!.n > 0) return 'cooldown'
  return null
}

/** Rule 4: one AI check every 3 seconds, 12 per session. A check is a `judged` or an `ai_timeout`. */
export async function rateLimited(projectId: string, sessionId: string): Promise<boolean> {
  const [checks] = await db
    .select({ n: count(), last: max(events.createdAt) })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        eq(events.sessionId, sessionId),
        or(eq(events.type, 'judged'), and(eq(events.type, 'skipped'), inArray(events.reason, ['ai_timeout']))),
      ),
    )
  if (checks!.n >= CHECKS_PER_SESSION) return true
  return checks!.last != null && Date.now() - checks!.last.getTime() < CHECK_GAP_MS
}
