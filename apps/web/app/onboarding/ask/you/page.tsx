import { YouStep } from '@/components/onboarding/steps/YouStep'
import { loadAnswers } from '../load'

export default async function YouPage() {
  return <YouStep saved={await loadAnswers()} />
}
