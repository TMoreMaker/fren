import { z } from 'zod'
import { tipStatus } from '@/lib/donations'
import { preflight, sdkJson } from '@/lib/sdk-origin'
import { sdkRoute } from '@/lib/sdk-route'

const body = z.object({ key: z.string().min(1).max(64) })
const orderId = z.string().regex(/^[A-Z0-9]{8,32}$/)

export const OPTIONS = preflight

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = orderId.safeParse((await ctx.params).id)
  if (!id.success) return sdkJson(req, { error: 'bad_request' }, 400)
  return sdkRoute(req, body, (project) => tipStatus(project, id.data))
}
