import { loadAnswers } from '../load'

// Frame 2.6. Blank until build plan step 3.4.
export default async function Page() {
  await loadAnswers()
  return <main />
}
