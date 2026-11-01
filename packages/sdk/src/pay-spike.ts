// Build plan step 1.2 only: PayPal buttons inside a Shadow DOM host, for a fixed $5.
// The real toast (frame 4.2) replaces this in step 2.2.
import type { ApiConfig } from './api'
import { renderButtons } from './paypal'
import { anonId } from './storage'

const css = `
:host { all: initial; }
.card { position: fixed; right: 28px; bottom: 28px; width: 352px; box-sizing: border-box;
  padding: 20px; border-radius: 20px; background: #FFFFFF; border: 1px solid #E1DCFF;
  box-shadow: 0 12px 40px rgba(28, 18, 85, 0.16); font: 15px/1.4 Figtree, system-ui, sans-serif;
  color: #0E0F0C; z-index: 2147483647; }
.title { margin: 0 0 12px; font: 800 20px/1.2 Archivo, system-ui, sans-serif; letter-spacing: -0.02em; }
.status { margin: 12px 0 0; color: #46474A; min-height: 1.4em; }
@media (max-width: 479px) { .card { left: 16px; right: 16px; bottom: 16px; width: auto; } }
`

let open = false

export async function showPaySpike(config: ApiConfig, amount = 5): Promise<void> {
  if (open) return
  open = true
  const host = document.createElement('div')
  host.setAttribute('data-fren', '')
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `<style>${css}</style>
    <div class="card" role="dialog" aria-label="Tip with PayPal">
      <p class="title">Donate $${amount} with PayPal</p>
      <div class="buttons"></div>
      <p class="status" aria-live="polite"></p>
    </div>`
  document.body.appendChild(host)

  const status = root.querySelector<HTMLElement>('.status')!
  const container = root.querySelector<HTMLElement>('.buttons')!
  try {
    await renderButtons(container, config, amount, anonId(), {
      onPaid: (payerName) => {
        container.remove()
        status.textContent = `Thank you${payerName ? `, ${payerName.split(' ')[0]}` : ''}. Your $${amount} went straight to the maker.`
      },
      onCancel: () => (status.textContent = ''),
      onError: (code) =>
        (status.textContent =
          code === 'capture_failed' ? "Payment didn't go through. You weren't charged." : 'Something went wrong. Try again.'),
    })
  } catch {
    status.textContent = "PayPal didn't load. Try again."
    open = false
  }
}
