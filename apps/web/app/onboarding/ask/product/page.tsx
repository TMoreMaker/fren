import { redirect } from 'next/navigation'
import { auth } from '@/auth'

// Frame 2.1. Blank until build plan step 3.3.
export default async function ProductPage() {
  const session = await auth()
  if (!session?.user) redirect('/')
  return <main />
}
