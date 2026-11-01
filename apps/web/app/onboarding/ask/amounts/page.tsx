import { AmountsStep } from '@/components/onboarding/steps/AmountsStep'
import { loadAnswers } from '../load'

export default async function AmountsPage() {
  return <AmountsStep saved={await loadAnswers()} />
}
