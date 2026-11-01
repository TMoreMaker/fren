// Fills a project's empty fields with the demo answers (Inkwell, Lebo, $3/$5/$10),
// so payments can be tested before onboarding exists. Never overwrites a value.
//   pnpm --filter @fren/web exec tsx scripts/demo-project.ts <public key>
import '../load-env'
import { eq } from 'drizzle-orm'
import { db, schema } from '../lib/db'

const key = process.argv[2] ?? process.env.FREN_PUBLIC_KEY
if (!key) throw new Error('usage: demo-project.ts <public key>')

const [project] = await db.select().from(schema.projects).where(eq(schema.projects.publicKey, key))
if (!project) throw new Error(`no project with key ${key}`)

const demo = {
  productName: 'Inkwell',
  makerName: 'Lebo',
  momentDescription: 'When someone exports their first chapter as a PDF or ePub.',
  momentHints: ['A click on Export', 'A PDF or ePub download', 'The first time only'],
  // The ask copy from frame 4.2, until onboarding (step 3.x) writes it.
  tone: 'warm' as const,
  headline: 'Glad that export worked.',
  message: 'If Inkwell saves you time, a small tip helps me keep it free and ad-free.',
  amounts: [3, 5, 10],
  defaultAmount: 5,
  paypalEmail: process.env.PAYPAL_SANDBOX_PAYEE_EMAIL ?? null,
}
const fill = Object.fromEntries(
  Object.entries(demo).filter(([field, value]) => value != null && project[field as keyof typeof demo] == null),
)

if (Object.keys(fill).length) {
  await db.update(schema.projects).set(fill).where(eq(schema.projects.id, project.id))
}
console.log(`filled: ${Object.keys(fill).join(', ') || 'nothing, all set'}`)
