import { MomentStep } from '@/components/onboarding/steps/MomentStep'
import { loadAnswers } from '../load'

export default async function MomentPage() {
  return <MomentStep saved={await loadAnswers()} />
}
