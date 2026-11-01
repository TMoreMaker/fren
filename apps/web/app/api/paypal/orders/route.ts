import { z } from 'zod'
import { startTip } from '@/lib/donations'
import { preflight } from '@/lib/sdk-origin'
import { sdkRoute } from '@/lib/sdk-route'

const body = z.object({
  key: z.string().min(1).max(64),
  amount: z.number().int().positive().max(1000),
  anonId: z.string().max(64).nullish(),
})

export const OPTIONS = preflight

export function POST(req: Request) {
  return sdkRoute(req, body, async (project, { amount, anonId }) => ({
    orderId: await startTip(project, amount, anonId ?? null),
  }))
}
