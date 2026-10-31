// PayPal Orders v2, sandbox only: docs/02-BUILD-SPEC.md section 7.3.
import { randomUUID } from 'node:crypto'

const base = () => process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com'

if (process.env.PAYPAL_API_BASE && !process.env.PAYPAL_API_BASE.includes('sandbox')) {
  throw new Error('PAYPAL_API_BASE must point at the PayPal sandbox')
}

let cached: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  // Refresh a minute before PayPal's expiry.
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set')

  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new PayPalError('token', res.status, await res.text())
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

export class PayPalError extends Error {
  constructor(
    public step: string,
    public status: number,
    public body: string,
  ) {
    super(`PayPal ${step} failed with ${status}`)
  }
}

async function call<T>(step: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
      // Idempotency key so a retry does not double charge.
      'PayPal-Request-Id': randomUUID(),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new PayPalError(step, res.status, await res.text())
  return (await res.json()) as T
}

export interface CreateOrderInput {
  projectId: string
  makerName: string
  productName: string
  payeeEmail: string
  /** Whole dollars. The caller must check it is one of the project's amounts first. */
  amount: number
  currency?: string
  /** Only for approving by link (the spike). The widget's PayPal buttons don't need it. */
  returnUrl?: string
  cancelUrl?: string
}

export interface PayPalOrder {
  id: string
  status: string
  links: { href: string; rel: string; method: string }[]
}

export function createOrder(input: CreateOrderInput): Promise<PayPalOrder> {
  const currency = input.currency ?? 'USD'
  return call<PayPalOrder>('create order', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: input.projectId,
        description: `Tip to ${input.makerName} for ${input.productName}`,
        amount: { currency_code: currency, value: input.amount.toFixed(2) },
        // Sends the money to the developer's account, not Fren's.
        payee: { email_address: input.payeeEmail },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: `Fren for ${input.productName}`,
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          ...(input.returnUrl ? { return_url: input.returnUrl, cancel_url: input.cancelUrl ?? input.returnUrl } : {}),
        },
      },
    },
  })
}

export interface CapturedOrder {
  id: string
  status: string
  payer?: { name?: { given_name?: string; surname?: string }; email_address?: string }
  purchase_units: {
    payments?: {
      captures?: {
        id: string
        status: string
        amount: { currency_code: string; value: string }
        seller_receivable_breakdown?: { net_amount?: { value: string } }
      }[]
    }
  }[]
}

export function captureOrder(orderId: string): Promise<CapturedOrder> {
  return call<CapturedOrder>('capture', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {})
}

/** Reads what PayPal says was captured. Never use the client's amount. */
export function readCapture(order: CapturedOrder) {
  const unit = order.purchase_units[0]
  const capture = unit?.payments?.captures?.[0]
  const name = order.payer?.name
  return {
    completed: order.status === 'COMPLETED' && capture?.status === 'COMPLETED',
    captureId: capture?.id ?? null,
    amountCents: capture ? Math.round(Number(capture.amount.value) * 100) : 0,
    currency: capture?.amount.currency_code ?? null,
    // "Mpho K." style: first name and last initial.
    payerName: name?.given_name ? `${name.given_name}${name.surname ? ` ${name.surname[0]}.` : ''}` : null,
  }
}
