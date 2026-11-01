import { z } from 'zod'
import { handleSignals } from '@/lib/sdk'
import { preflight } from '@/lib/sdk-origin'
import { sdkRoute } from '@/lib/sdk-route'
import { signalSchema } from '@/lib/signals'

const body = z.object({
  key: z.string().min(1).max(64),
  anonId: z.string().min(1).max(64),
  sessionId: z.string().min(1).max(64),
  signals: z.array(signalSchema).max(20),
  test: z.boolean().default(false),
})

export const OPTIONS = preflight

export function POST(req: Request) {
  return sdkRoute(req, body, (project, { anonId, sessionId, signals, test }) =>
    handleSignals(project, { anonId, sessionId, test }, signals),
  )
}
