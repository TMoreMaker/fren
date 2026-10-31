import { redirect } from 'next/navigation'
import { auth } from '@/auth'

// Frames 1.2 and 1.3. Blank until build plan step 3.1.
export default async function PayPalPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <main />
}
