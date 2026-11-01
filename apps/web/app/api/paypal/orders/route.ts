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
  // PayPal sends the buyer back to this app, which captures and closes the window.
  const returnUrl = new URL('/paypal/done', req.url).toString()
  return sdkRoute(req, body, (project, { amount, anonId }) => startTip(project, amount, anonId ?? null, returnUrl))
}
