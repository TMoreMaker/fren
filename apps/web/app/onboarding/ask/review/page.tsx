import { loadAnswers } from '../load'

// Frame 2.8. Blank until build plan step 3.5.
export default async function Page() {
  await loadAnswers()
  return <main />
}
