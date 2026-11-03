import { MessageStep } from '@/components/onboarding/steps/MessageStep'
import { loadAnswers } from '../load'

export default async function MessagePage() {
  return <MessageStep saved={await loadAnswers()} />
}
