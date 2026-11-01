// Fetch wrappers for the web app's public routes: docs/02-BUILD-SPEC.md section 5.3.
import type { Signal } from './signals'

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

export interface ProjectInfo {
  makerName: string | null
  photoUrl: string | null
  initial: string | null
  productName: string | null
  headline: string | null
  message: string | null
  amounts: number[] | null
  defaultAmount: number | null
  currency: string
}

export interface AskResult {
  show: boolean
  headline?: string
  label?: string
  reason?: string
  verdict?: { isMoment: boolean; confidence: number; label: string }
}

export interface Visitor {
  anonId: string
  sessionId: string
  test: boolean
}

export const initSdk = (config: ApiConfig) => post<{ ok: true; project: ProjectInfo }>(config, '/api/sdk/init', {})

export const sendSignals = (config: ApiConfig, visitor: Visitor, signals: Signal[]) =>
  post<AskResult>(config, '/api/sdk/signals', { ...visitor, signals })

export const sendMoment = (config: ApiConfig, visitor: Visitor, event: string) =>
  post<AskResult>(config, '/api/sdk/moment', { ...visitor, event })

export const trackAsk = (config: ApiConfig, visitor: Visitor, type: 'clicked' | 'dismissed') =>
  post<{ ok: true }>(config, '/api/sdk/track', { ...visitor, type })

export const createOrder = (config: ApiConfig, amount: number, anonId: string | null) =>
  post<{ orderId: string; approveUrl: string }>(config, '/api/paypal/orders', { amount, anonId })

export const orderStatus = (config: ApiConfig, orderId: string) =>
  post<{ status: 'created' | 'completed' | 'failed' | 'cancelled'; payerName: string | null }>(
    config,
    `/api/paypal/orders/${encodeURIComponent(orderId)}/status`,
    {},
  )
