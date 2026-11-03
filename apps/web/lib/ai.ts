// Fren AI: docs/02-BUILD-SPEC.md section 7.
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { Project } from './db/schema'
import type { Signal } from './signals'
import { DRAFT_MAX, fallbackDrafts } from './draft-fallback'

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

// Sonnet for the slower, once-per-setup jobs (spec 7.2 to 7.4).
const SETUP_MODEL = 'claude-sonnet-5-5'
const setupClient = new Anthropic({ maxRetries: 1, timeout: 15_000 })

const PLAN_SYSTEM = `An indie developer describes the moment their users get real value from their product.
Turn it into a short plan of what a browser script could see when it happens: clicks, downloads, form submits, page changes.
Exactly 3 items, each under 45 characters, plain words, no code. The last item should say if it is the first time only or every time.
Also write a headline for the tip ask the user sees right after that moment: 3 to 6 words reacting to it, in the given tone, e.g. "Glad that export worked." No emoji.`

const PLAN_FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    properties: {
      lookFor: { type: 'array', items: { type: 'string' } },
      headline: { type: 'string' },
    },
    required: ['lookFor', 'headline'],
    additionalProperties: false,
  },
}

const planSchema = z.object({
  lookFor: z.array(z.string().trim().min(1).max(60)).length(3),
  headline: z.string(),
})

/**
 * "Fren AI will watch for" (spec 7.2), plus the headline the preview shows from step 2.4.
 * Throws on an API error or bad JSON; the caller hides the box.
 */
export async function planMoment(
  project: Pick<Project, 'productName' | 'website' | 'tone'>,
  description: string,
): Promise<{ lookFor: string[]; headline: string | null }> {
  const reply = await setupClient.beta.messages.create({
    model: SETUP_MODEL,
    max_tokens: 2_000,
    system: PLAN_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          `Product: ${project.productName ?? ''}`,
          `Website: ${project.website ?? ''}`,
          `Tone: ${project.tone ?? 'warm'}`,
          `Moment: ${description}`,
        ].join('\n'),
      },
    ],
    output_config: { effort: 'low', format: PLAN_FORMAT },
    // If Sonnet declines, the API retries on a fallback model in the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })
  if (reply.stop_reason === 'refusal') throw new Error('Plan refused')
  const text = reply.content.find((b) => b.type === 'text')?.text ?? ''
  const plan = planSchema.parse(JSON.parse(text))
  const headline = plan.headline.trim()
  return {
    lookFor: plan.lookFor,
    headline: headline && headline.length < 40 && !EMOJI.test(headline) ? headline : null,
  }
}

const DRAFTS_SYSTEM = `You write short tip requests that indie developers show inside their product, right after a user gets value.
Rules:
- Write as the developer, first person, singular ("I", "me").
- 1 sentence, at most 90 characters.
- Mention the product by name once.
- Never guilt the user. Never say "please donate". No emoji. No exclamation marks unless the tone is playful.
- Do not invent facts about the product.
Return JSON only: {"drafts":[{"text":"..."},{"text":"..."},{"text":"..."}],"headline":"..."}
The headline is 3 to 6 words reacting to the moment, e.g. "Glad that export worked."`

const DRAFTS_FORMAT = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    properties: {
      drafts: {
        type: 'array',
        items: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      },
      headline: { type: 'string' },
    },
    required: ['drafts', 'headline'],
    additionalProperties: false,
  },
}

const TONE_WORDS = {
  warm: 'friendly and grateful',
  playful: 'light and a bit cheeky',
  straight: 'short and plain',
} as const

/** Fren AI's three drafts for frame 2.6 (spec 7.3). Throws on an API error or bad JSON. */
async function draftOnce(
  project: Pick<Project, 'productName' | 'website' | 'makerName' | 'momentDescription' | 'tone'>,
  timeout: number,
): Promise<{ drafts: string[]; headline: string | null }> {
  const tone = project.tone ?? 'warm'
  const draftSchema = z.object({
    drafts: z
      .array(
        z.object({
          text: z
            .string()
            .trim()
            .min(1)
            .max(DRAFT_MAX)
            .refine((t) => !EMOJI.test(t))
            .refine((t) => tone === 'playful' || !t.includes('!')),
        }),
      )
      .length(3),
    headline: z.string(),
  })

  const reply = await setupClient.beta.messages.create({
    model: SETUP_MODEL,
    max_tokens: 2_000,
    system: DRAFTS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          `Product: ${project.productName ?? ''}`,
          `Website: ${project.website ?? ''}`,
          `Developer first name: ${project.makerName ?? ''}`,
          `The moment: ${project.momentDescription ?? ''}`,
          `Tone: ${tone} (${TONE_WORDS[tone]})`,
        ].join('\n'),
      },
    ],
    output_config: { effort: 'low', format: DRAFTS_FORMAT },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  }, { maxRetries: 0, timeout })
  if (reply.stop_reason === 'refusal') throw new Error('Drafts refused')
  const text = reply.content.find((b) => b.type === 'text')?.text ?? ''
  const parsed = draftSchema.parse(JSON.parse(text))
  const headline = parsed.headline.trim()
  return {
    drafts: parsed.drafts.map((d) => d.text),
    headline: headline && headline.length < 40 && !EMOJI.test(headline) ? headline : null,
  }
}

/**
 * Three drafts for frame 2.6 (spec 7.3). One retry, then template drafts so the step never breaks.
 * `fallback` is true when the templates were used. Never throws.
 */
export async function writeDrafts(
  project: Pick<Project, 'productName' | 'website' | 'makerName' | 'momentDescription' | 'tone'>,
): Promise<{ drafts: string[]; headline: string | null; fallback: boolean }> {
  // Spec 7.3: 15 seconds in all, for the first try and the retry together.
  const deadline = Date.now() + 15_000
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now()
    if (left < 1_000) break
    try {
      return { ...(await draftOnce(project, left)), fallback: false }
    } catch (err) {
      console.error(`drafts attempt ${attempt + 1} failed`, err)
    }
  }
  return { drafts: fallbackDrafts(project.productName, project.tone), headline: null, fallback: true }
}
