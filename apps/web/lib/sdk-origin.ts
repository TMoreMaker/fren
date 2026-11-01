// CORS and the origin check for public SDK routes: docs/02-BUILD-SPEC.md section 5.3.
import type { Project } from './db/schema'

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

/** The project's own website, the demo host, and localhost outside production. */
export function originAllowed(origin: string | null, project: Pick<Project, 'website'>): boolean {
  const host = hostOf(origin)
  if (!host) return false
  if (host === hostOf(project.website)) return true
  if (host === hostOf(process.env.NEXT_PUBLIC_DEMO_HOST_URL)) return true
  return process.env.VERCEL_ENV !== 'production' && localHosts.has(host)
}

// Preflight carries no key, so it can't be checked against a project. It only
// allows the request to be sent; the POST handler does the real origin check.
export function preflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req.headers.get('origin')),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

function corsHeaders(origin: string | null): Record<string, string> {
  return origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}
}

export function sdkJson(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req.headers.get('origin')) })
}
