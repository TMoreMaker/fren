import { z } from 'zod'
import { handleMoment } from '@/lib/sdk'
import { preflight } from '@/lib/sdk-origin'
import { sdkRoute } from '@/lib/sdk-route'

const body = z.object({
  key: z.string().min(1).max(64),
  event: z.string().trim().min(1).max(60),
  anonId: z.string().min(1).max(64),
  sessionId: z.string().min(1).max(64).nullish(),
  test: z.boolean().default(false),
})

export const OPTIONS = preflight

export function POST(req: Request) {
  return sdkRoute(req, body, (project, { event, anonId, sessionId, test }) =>
    handleMoment(project, { anonId, sessionId: sessionId ?? null, test }, event),
  )
}
