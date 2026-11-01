import { ProductStep } from '@/components/onboarding/steps/ProductStep'
import { loadAnswers } from '../load'

export default async function ProductPage() {
  return <ProductStep saved={await loadAnswers()} />
}
