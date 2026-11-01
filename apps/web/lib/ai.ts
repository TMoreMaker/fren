// Fren AI: docs/02-BUILD-SPEC.md section 7.
import type { Project } from './db/schema'
import type { Signal } from './signals'

export interface Verdict {
  isMoment: boolean
  confidence: number
  kind: string | null
  label: string
  headline: string
}

/**
 * Did the newest signal complete the developer's moment? (spec 7.1)
 * Build plan step 2.1 stub: always no. Step 2.2 replaces it with the Haiku call.
 */
export async function judgeMoment(
  _project: Project,
  _signals: Signal[],
  _reachedBefore: boolean,
): Promise<Verdict> {
  return { isMoment: false, confidence: 0, kind: null, label: '', headline: '' }
}
