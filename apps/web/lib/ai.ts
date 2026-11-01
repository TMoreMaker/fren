// Fren AI: docs/02-BUILD-SPEC.md section 7.
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Project } from './db/schema'
import type { Signal } from './signals'

const MOMENT_MODEL = 'claude-haiku-4-5-20251001'

// No retries: the moment check runs while the user waits (spec 7.1).
const client = new Anthropic({ maxRetries: 0, timeout: 4_000 })

const verdictSchema = z.object({
  isMoment: z.boolean(),
  confidence: z.number().min(0).max(1),
  kind: z.string().max(40).nullable(),
  label: z.string().max(80),
  headline: z.string(),
})

export type Verdict = z.infer<typeof verdictSchema>

// Structured output, so the reply is always this JSON shape. zod still checks the ranges.
const VERDICT_FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    properties: {
      isMoment: { type: 'boolean' },
      confidence: { type: 'number' },
      kind: { type: ['string', 'null'] },
      label: { type: 'string' },
      headline: { type: 'string' },
    },
    required: ['isMoment', 'confidence', 'kind', 'label', 'headline'],
    additionalProperties: false,
  },
}

const MOMENT_SYSTEM = `You decide if a user of a software product has just reached the moment the developer described as real value.
You get the developer's description, a short plan of what to look for, and the user's recent actions, oldest first. The last action is the newest.
Rules:
- Say yes only if the newest action completes the described moment. Starting something (opening an export menu) is not completing it.
- Prefer clear evidence: a download, a submit or a page change that matches the description.
- If the description says "first" and this user has reached the moment before, say no.
- When unsure, say no. Missing a moment is better than asking at the wrong time.
Return JSON only:
{"isMoment":true|false,"confidence":0.0-1.0,"kind":"..." or null,"label":"...","headline":"..."}
kind: a snake_case name of 1 to 3 words for the newest action if it is a meaningful product action (e.g. "export", "project_created"), otherwise null. Use the same kind for the same action every time.
label: 2 to 6 words saying what the user just did, e.g. "Exported chapter-1.pdf".
headline: 3 to 6 words reacting to it, in the given tone, e.g. "Glad that export worked." Empty if isMoment is false.`

function describe(signal: Signal) {
  return signal.type === 'click' ? `click "${signal.label}"` : `${signal.type} ${signal.label}`
}

const EMOJI = /\p{Extended_Pictographic}/u

/** Did the newest signal complete the developer's moment? (spec 7.1) Throws on an API error or bad JSON. */
export async function judgeMoment(project: Project, signals: Signal[], reachedBefore: boolean): Promise<Verdict> {
  const user = [
    `Product: ${project.productName ?? ''}`,
    `Moment: ${project.momentDescription ?? ''}`,
    `Look for: ${(project.momentHints ?? []).join('; ')}`,
    `Tone: ${project.tone ?? 'warm'}`,
    `Reached this moment before: ${reachedBefore ? 'yes' : 'no'}`,
    'Recent actions:',
    ...signals.map((s, i) => `${i + 1}. ${describe(s)}`),
  ].join('\n')

  const reply = await client.messages.create({
    model: MOMENT_MODEL,
    // Spec 7.1 says temperature 0, but the API no longer accepts sampling settings.
    max_tokens: 200,
    system: MOMENT_SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: { format: VERDICT_FORMAT },
  })
  const text = reply.content.find((b) => b.type === 'text')?.text ?? ''
  const verdict = verdictSchema.parse(JSON.parse(text))

  const headline = verdict.headline.trim()
  const fallback = project.headline ?? ''
  return {
    ...verdict,
    kind: verdict.kind?.trim() || null,
    label: verdict.label.trim(),
    headline: verdict.isMoment && headline && headline.length < 40 && !EMOJI.test(headline) ? headline : fallback,
  }
}
