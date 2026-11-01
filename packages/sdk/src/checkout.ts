// Paying (spec 6.6): our own Donate button opens PayPal's checkout page in a window.
// PayPal sends that window back to the app's /paypal/done, which captures on the server and closes it.
// The widget learns the result by asking the server, since PayPal's page cuts the link between the windows.
import { type ApiConfig, ApiError, createOrder, orderStatus } from './api'

export interface CheckoutHandlers {
  onPaid(payerName: string | null): void
  onCancel(): void
  onError(code: string): void
}

const POLL_MS = 1_500
const GIVE_UP_MS = 15 * 60_000

function openWindow(): Window | null {
  const width = 480
  const height = 680
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2)
  return window.open('', 'fren-paypal', `popup,width=${width},height=${height},left=${left},top=${top}`)
}

/** Must run inside the click, so the browser allows the window. Returns a function that stops waiting. */
export function startCheckout(
  config: ApiConfig,
  amount: number,
  anonId: string | null,
  handlers: CheckoutHandlers,
): () => void {
  const win = openWindow()
  if (!win) {
    handlers.onError('blocked')
    return () => {}
  }
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    stopped = true
    clearTimeout(timer)
  }

  const poll = (orderId: string, startedAt: number) => {
    timer = setTimeout(async () => {
      if (stopped) return
      try {
        const { status, payerName } = await orderStatus(config, orderId)
        if (stopped) return
        if (status === 'completed') return handlers.onPaid(payerName)
        if (status === 'cancelled') return handlers.onCancel()
        if (status === 'failed') return handlers.onError('capture_failed')
      } catch {
        // A blip while waiting: keep asking.
      }
      if (Date.now() - startedAt < GIVE_UP_MS) poll(orderId, startedAt)
    }, POLL_MS)
  }

  createOrder(config, amount, anonId)
    .then(({ orderId, approveUrl }) => {
      if (stopped) return win.close()
      win.location.href = approveUrl
      poll(orderId, Date.now())
    })
    .catch((err) => {
      win.close()
      if (!stopped) handlers.onError(err instanceof ApiError ? err.code : 'load')
    })
  return stop
}
