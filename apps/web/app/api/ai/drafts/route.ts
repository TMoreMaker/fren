// Frame 2.6: Fren AI writes three drafts of the ask (spec 7.3). Reads the project, does not save.
import { writeDrafts } from '@/lib/ai'
import { requireProject } from '@/lib/onboarding'

export async function POST() {
  let project
  try {
    project = await requireProject()
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { drafts, headline } = await writeDrafts(project)
  return Response.json({ drafts: drafts.map((text) => ({ text, chars: text.length })), headline })
}
