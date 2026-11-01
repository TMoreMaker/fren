// Public API: docs/02-BUILD-SPEC.md section 6.2. Behaviour lands in build plan step 2.1.
import type { ApiConfig } from './api'
import { showPaySpike } from './pay-spike'

export interface InitOptions {
  key: string
  apiBase?: string
}

// Where fren.js is served from. The script tag entry fills this in from its own src.
export const defaults = { apiBase: 'https://fren-tips.vercel.app' }

let config: ApiConfig | null = null

function safe<A extends unknown[]>(fn: (...args: A) => void) {
  return (...args: A): void => {
    try {
      fn(...args)
    } catch {
      // Never throw into the host page.
    }
  }
}

export const Fren = {
  init: safe((options: InitOptions) => {
    config = { key: options.key, apiBase: (options.apiBase ?? defaults.apiBase).replace(/\/$/, '') }
  }),
  moment: safe((_eventName: string) => {}),
  // Step 1.2: shows the PayPal buttons for $5. Step 2.2 swaps in the real toast.
  test: safe(() => {
    if (config) showPaySpike(config).catch(() => {})
  }),
}

export type FrenApi = typeof Fren
