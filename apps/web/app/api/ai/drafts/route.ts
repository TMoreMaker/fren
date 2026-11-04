// The three versions on frame 2.6 (spec 5.1 and 7.3). Does not save: saveAnswers does, on Next.
import { writeDrafts } from '@/lib/ai'
import { requireProject } from '@/lib/onboarding'

export async function POST() {
  let project
  try {
    project = await requireProject()
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return Response.json(await writeDrafts(project))
}
