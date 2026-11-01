// Fetch wrappers for the web app's public routes: docs/02-BUILD-SPEC.md section 5.3.

export interface ApiConfig {
  key: string
  apiBase: string
}

export class ApiError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

async function post<T>(config: ApiConfig, path: string, body: object): Promise<T> {
  const res = await fetch(`${config.apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: config.key, ...body }),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new ApiError(data.error ?? `http_${res.status}`)
  return data
}

export const createOrder = (config: ApiConfig, amount: number, anonId: string | null) =>
  post<{ orderId: string }>(config, '/api/paypal/orders', { amount, anonId })

export const captureOrder = (config: ApiConfig, orderId: string, anonId: string | null) =>
  post<{ ok: true; payerName: string | null }>(
    config,
    `/api/paypal/orders/${encodeURIComponent(orderId)}/capture`,
    { anonId },
  )
