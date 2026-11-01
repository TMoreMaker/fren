import { z } from 'zod'
import { initSdk } from '@/lib/sdk'
import { preflight } from '@/lib/sdk-origin'
import { sdkRoute } from '@/lib/sdk-route'

const body = z.object({ key: z.string().min(1).max(64) })

export const OPTIONS = preflight

export function POST(req: Request) {
  return sdkRoute(req, body, (project) => initSdk(project))
}
