// What the SDK sends: docs/02-BUILD-SPEC.md section 6.4.
import { z } from 'zod'

const label = z.string().trim().min(1).transform((s) => s.slice(0, 60))

export const signalSchema = z.object({
  type: z.enum(['click', 'download', 'submit', 'route', 'custom']),
  label,
  path: z.string().max(300).transform((p) => p.split(/[?#]/)[0]!),
  at: z.number().int().positive(),
})

export type Signal = z.infer<typeof signalSchema>
