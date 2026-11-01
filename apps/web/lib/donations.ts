// Tip payments: docs/02-BUILD-SPEC.md sections 5.3 and 7.3.
import { and, eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { Project } from './db/schema'
import { captureOrder, createOrder, PayPalError, paypalIssue, readCapture } from './paypal'

export type TipError =
  | 'unknown_key'
  | 'origin_not_allowed'
  | 'not_ready'
  | 'amount_not_allowed'
  | 'unknown_order'
  | 'declined'
  | 'capture_failed'

export class TipFailure extends Error {
  constructor(
    public code: TipError,
    public status: number,
  ) {
    super(code)
  }
}

export async function projectByKey(key: string): Promise<Project> {
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.publicKey, key)).limit(1)
  if (!project) throw new TipFailure('unknown_key', 404)
  return project
}

/** Creates the PayPal order and a `created` donation row. Returns the order id. */
export async function startTip(project: Project, amount: number, anonId: string | null): Promise<string> {
  if (!project.paypalEmail || !project.amounts?.length) throw new TipFailure('not_ready', 409)
  // Money is checked on the server: only the project's own amounts.
  if (!project.amounts.includes(amount)) throw new TipFailure('amount_not_allowed', 400)

  const order = await createOrder({
    projectId: project.id,
    makerName: project.makerName ?? 'the maker',
    productName: project.productName ?? 'this product',
    payeeEmail: project.paypalEmail,
    amount,
    currency: project.currency,
  })
  await db.insert(schema.donations).values({
    projectId: project.id,
    paypalOrderId: order.id,
    amountCents: amount * 100,
    currency: project.currency,
    anonId,
    status: 'created',
  })
  return order.id
}

/** Captures the order, completes the donation and logs `paid`. Safe to call twice. */
export async function finishTip(project: Project, orderId: string, anonId: string | null) {
  const [donation] = await db
    .select()
    .from(schema.donations)
    .where(and(eq(schema.donations.paypalOrderId, orderId), eq(schema.donations.projectId, project.id)))
    .limit(1)
  if (!donation) throw new TipFailure('unknown_order', 404)
  if (donation.status === 'completed') return { payerName: donation.payerName }

  let captured
  try {
    captured = readCapture(await captureOrder(orderId))
  } catch (err) {
    // A declined card can be retried on the same order, so keep it open.
    if (err instanceof PayPalError && paypalIssue(err) === 'INSTRUMENT_DECLINED') {
      throw new TipFailure('declined', 402)
    }
    console.error(err)
    await markFailed(donation.id)
    throw new TipFailure('capture_failed', 402)
  }
  if (!captured.completed) {
    await markFailed(donation.id)
    throw new TipFailure('capture_failed', 402)
  }

  // Record what PayPal captured, not what anyone sent us.
  await db
    .update(schema.donations)
    .set({
      status: 'completed',
      paypalCaptureId: captured.captureId,
      amountCents: captured.amountCents,
      currency: captured.currency ?? donation.currency,
      payerName: captured.payerName,
    })
    .where(eq(schema.donations.id, donation.id))
  await db.insert(schema.events).values({
    projectId: project.id,
    type: 'paid',
    anonId: anonId ?? donation.anonId,
  })
  return { payerName: captured.payerName }
}

async function markFailed(id: string) {
  await db.update(schema.donations).set({ status: 'failed' }).where(eq(schema.donations.id, id))
}
