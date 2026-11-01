// Lazy-loads the PayPal JS SDK and renders its buttons: docs/02-BUILD-SPEC.md section 6.5.
import { type ApiConfig, ApiError, captureOrder, createOrder } from './api'

declare const __FREN_PAYPAL_CLIENT_ID__: string

// Our own namespace, so we never touch a window.paypal the host page may use.
const NAMESPACE = 'frenPayPal'

interface PayPalButtons {
  isEligible(): boolean
  render(container: HTMLElement): Promise<void>
  close(): Promise<void>
}
interface PayPalNamespace {
  Buttons(options: object): PayPalButtons
}

let loading: Promise<PayPalNamespace> | null = null

export function loadPayPal(currency = 'USD'): Promise<PayPalNamespace> {
  loading ??= new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement('script')
    const params = new URLSearchParams({
      'client-id': __FREN_PAYPAL_CLIENT_ID__,
      currency,
      intent: 'capture',
      components: 'buttons',
    })
    script.src = `https://www.paypal.com/sdk/js?${params}`
    script.async = true
    script.dataset.namespace = NAMESPACE
    script.onload = () => {
      const ns = (window as unknown as Record<string, PayPalNamespace | undefined>)[NAMESPACE]
      if (ns) resolve(ns)
      else reject(new Error('PayPal SDK loaded without its namespace'))
    }
    script.onerror = () => reject(new Error('PayPal SDK failed to load'))
    document.head.appendChild(script)
  }).catch((err) => {
    loading = null // let the retry button try again
    throw err
  })
  return loading
}

export interface PayHandlers {
  onPaid(payerName: string | null): void
  onCancel(): void
  onError(code: string): void
}

export async function renderButtons(
  container: HTMLElement,
  config: ApiConfig,
  amount: () => number,
  anonId: string | null,
  handlers: PayHandlers,
): Promise<PayPalButtons> {
  const paypal = await loadPayPal()
  const buttons = paypal.Buttons({
    fundingSource: 'paypal',
    style: { layout: 'vertical', shape: 'pill', color: 'gold', label: 'paypal', height: 44 },
    // Read at click time, so a pill changed after the buttons appeared still counts.
    createOrder: async () => (await createOrder(config, amount(), anonId)).orderId,
    onApprove: async (data: { orderID: string }, actions: { restart(): Promise<void> }) => {
      try {
        const { payerName } = await captureOrder(config, data.orderID, anonId)
        handlers.onPaid(payerName)
      } catch (err) {
        // PayPal's advice for a declined card: reopen the popup on the same order.
        if (err instanceof ApiError && err.code === 'declined') return actions.restart()
        handlers.onError(err instanceof ApiError ? err.code : 'capture_failed')
      }
    },
    onCancel: () => handlers.onCancel(),
    onError: (err: unknown) => handlers.onError(err instanceof ApiError ? err.code : 'paypal_error'),
  })
  await buttons.render(container)
  return buttons
}
