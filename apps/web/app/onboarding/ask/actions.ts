'use server'
// Saves one ask question (frames 2.1 to 2.7). Next moves on; "Save and exit" saves what is valid,
// signs out and goes home (agreed 1 Nov). Signing back in resumes at `onboarding_step`.
import { redirect } from 'next/navigation'
import { signOut } from '@/auth'
import { planMoment } from '@/lib/ai'
import {
  type AnswerStep,
  answerSchemas,
  fieldsFor,
  laterStep,
  nextStepOf,
  requireProject,
  stepPath,
  updateProject,
} from '@/lib/onboarding'

export async function saveAnswers(step: AnswerStep, form: FormData) {
  const project = await requireProject()
  const exit = form.get('intent') === 'exit'
  const parsed = answerSchemas[step].safeParse(Object.fromEntries(form))

  if (parsed.success) {
    const fields = fieldsFor(step, parsed.data)
    // The plan is made as the developer types. If the text changed since, make it again now.
    if (step === 'moment' && fields.momentDescription !== project.momentDescription) {
      const plan = await planMoment(project, String(fields.momentDescription)).catch(() => null)
      fields.momentHints = plan?.lookFor ?? []
      if (plan?.headline) fields.headline = plan.headline
    }
    // The headline from 2.4 stays. The one written here only fills the gap if that plan failed.
    if (step === 'message' && project.headline) delete fields.headline
    if (!exit) fields.onboardingStep = laterStep(project.onboardingStep, nextStepOf(step))
    await updateProject(project.id, fields)
  }

  if (exit) await signOut({ redirectTo: '/' })
  if (!parsed.success) return
  redirect(stepPath(nextStepOf(step)))
}
