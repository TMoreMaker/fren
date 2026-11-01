import { ToneStep } from '@/components/onboarding/steps/ToneStep'
import { loadAnswers } from '../load'

export default async function TonePage() {
  return <ToneStep saved={await loadAnswers()} />
}
