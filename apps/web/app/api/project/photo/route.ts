// Profile photo for the ask (spec 5.1, frame 2.3). Optional: without one, the ask shows the initial.
import { put } from '@vercel/blob'
import { requireProject, updateProject } from '@/lib/onboarding'

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_BYTES = 4 * 1024 * 1024

export async function POST(req: Request) {
  let project
  try {
    project = await requireProject()
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const file = (await req.formData().catch(() => null))?.get('photo')
  if (!(file instanceof File) || !TYPES[file.type]) return Response.json({ error: 'bad_type' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'too_big' }, { status: 413 })

  // Keep the developer's file name so 2.3 can show it ("lebo.jpg"). Blob adds a random suffix.
  const base = file.name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'photo'
  const blob = await put(`photos/${project.id}/${base}.${TYPES[file.type]}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
  })
  await updateProject(project.id, { photoUrl: blob.url })
  return Response.json({ url: blob.url })
}
