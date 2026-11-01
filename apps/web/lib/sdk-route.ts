import type { z } from 'zod'
import type { Project } from './db/schema'
import { projectByKey, TipFailure } from './donations'
import { originAllowed, sdkJson } from './sdk-origin'

/** Parses the body, finds the project by key, checks the origin, maps errors to JSON. */
export async function sdkRoute<S extends z.ZodType<{ key: string }>>(
  req: Request,
  schema: S,
  run: (project: Project, input: z.infer<S>) => Promise<unknown>,
): Promise<Response> {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return sdkJson(req, { error: 'bad_request' }, 400)
  try {
    const project = await projectByKey(parsed.data.key)
    if (!originAllowed(req.headers.get('origin'), project)) {
      return sdkJson(req, { error: 'origin_not_allowed' }, 403)
    }
    return sdkJson(req, await run(project, parsed.data))
  } catch (err) {
    if (err instanceof TipFailure) return sdkJson(req, { error: err.code }, err.status)
    console.error(err)
    return sdkJson(req, { error: 'server_error' }, 502)
  }
}
