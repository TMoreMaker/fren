// "Fren AI will watch for" (spec 5.1 and 7.2), called as the developer types the moment.
import { z } from 'zod'
import { planMoment } from '@/lib/ai'
import { requireProject, updateProject } from '@/lib/onboarding'

const body = z.object({ description: z.string().trim().min(1).max(300) })

export async function POST(req: Request) {
  let project
  try {
    project = await requireProject()
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'bad_request' }, { status: 400 })

  const description = parsed.data.description
  try {
    const plan = await planMoment(project, description)
    await updateProject(project.id, {
      momentDescription: description,
      momentHints: plan.lookFor,
      ...(plan.headline ? { headline: plan.headline } : {}),
    })
    return Response.json(plan)
  } catch (err) {
    // Spec 12: hide the box, save an empty plan. The moment check works from the description alone.
    console.error('moment plan failed', err)
    await updateProject(project.id, { momentDescription: description, momentHints: [] })
    return Response.json({ lookFor: [], headline: null })
  }
}
