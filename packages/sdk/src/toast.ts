// The tip ask: docs/02-BUILD-SPEC.md sections 6.3 and 6.6, frames 4.2 (ask) and 4.4 (thank-you).
// The states the frames don't show (loading, errors) are agreed in docs/04-DESIGN-NOTES.md.
import type { ApiConfig, ProjectInfo } from './api'
import { startCheckout } from './checkout'
import { anonId } from './storage'

export interface ToastOptions {
  config: ApiConfig
  project: ProjectInfo
  headline?: string
  onDonate(): void
  onDismiss(): void
  onPaid(): void
}

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap'
const THANKS_MS = 8_000

// Tokens from spec section 10 and docs/04-DESIGN-NOTES.md, hard-coded: the widget can't read the host's CSS.
const css = `
:host { all: initial; }
.ask { position: fixed; right: 28px; bottom: 28px; z-index: 2147483647; width: 352px; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 14px; padding: 20px; background: #FFFFFF; border: 1px solid #E1DCFF;
  border-radius: 24px; box-shadow: 0 2px 4px rgba(28,18,85,.06), 0 28px 56px -18px rgba(28,18,85,.4);
  font-family: 'Figtree', system-ui, sans-serif; color: #0E0F0C; -webkit-font-smoothing: antialiased;
  animation: in 200ms ease-out; outline: none; }
.ask.thanks { gap: 16px; }
@keyframes in { from { opacity: 0; transform: translateY(12px); } }
@media (prefers-reduced-motion: reduce) { .ask { animation: none; } }
@media (max-width: 479px) { .ask { left: 16px; right: 16px; bottom: 16px; width: auto; } }
.row { display: flex; align-items: center; gap: 12px; }
.top { justify-content: space-between; align-items: flex-start; }
.av { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center;
  justify-content: center; background: #A397FF; color: #1C1255; font: 800 17px 'Archivo', sans-serif; object-fit: cover; }
.av.tick { background: #ECE9FF; }
.who { display: flex; flex-direction: column; gap: 2px; }
.name { font: 700 15px 'Figtree', sans-serif; }
.by { font: 400 13px 'Figtree', sans-serif; color: #46474A; }
.hd { margin: 0; font: 800 22px/1.15 'Archivo', sans-serif; letter-spacing: -.015em; color: #0E0F0C; }
.thanks .hd { font-size: 24px; }
.bd { margin: 0; font: 400 14.5px/1.5 'Figtree', sans-serif; color: #3D3C39; }
.err:empty { display: none; }
.amts { gap: 6px; }
.amt { flex: 1; height: 42px; border-radius: 999px; background: #ECE8FF; border: 0; font: 600 15px 'Figtree', sans-serif;
  color: #1C1255; cursor: pointer; }
.amt[aria-pressed="true"] { background: #1C1255; color: #FFFFFF; }
.pay { width: 100%; display: flex; align-items: center; justify-content: center; height: 48px; border: 0; border-radius: 999px;
  background: #A397FF; color: #1C1255; font: 700 15px 'Figtree', sans-serif; cursor: pointer; }
.pay:hover { background: #9387F7; }
.pay:disabled { background: #ECE8FF; color: #7A7A85; cursor: default; }
.x { width: 32px; height: 32px; border-radius: 50%; border: 0; padding: 0; background: #ECE8FF; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; cursor: pointer; }
.foot { justify-content: space-between; }
.thanks .foot { padding-top: 12px; border-top: 1px solid #ECE8FF; }
.later { border: 0; padding: 0; background: none; font: 500 13px 'Figtree', sans-serif; color: #46474A;
  text-decoration: underline; cursor: pointer; }
.note { font: 500 13px 'Figtree', sans-serif; color: #46474A; }
.mono { font: 400 11px 'JetBrains Mono', monospace; color: #9C9CA6; }
.thanks-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
button:focus-visible { outline: 2px solid #1C1255; outline-offset: 2px; box-shadow: 0 0 0 6px #ECE9FF; }
`

const CLOSE_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1C1255" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`
const TICK_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1255" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`

const ERRORS: Record<string, string> = {
  load: "PayPal didn't load. Try again.",
  blocked: 'Allow pop-ups to pay with PayPal.',
  capture_failed: "Payment didn't go through. You weren't charged.",
}
const GENERIC_ERROR = 'Something went wrong. Try again.'

let current: { close(): void } | null = null

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text != null) node.textContent = text
  return node
}

function button(className: string, text: string, label?: string): HTMLButtonElement {
  const b = el('button', className, text)
  b.type = 'button'
  if (label) b.setAttribute('aria-label', label)
  return b
}

function closeButton(label: string): HTMLButtonElement {
  const b = button('x', '', label)
  b.innerHTML = CLOSE_ICON
  return b
}

function loadFonts() {
  // @font-face only works from the document, not inside a shadow root.
  if (document.getElementById('fren-fonts')) return
  const link = document.createElement('link')
  link.id = 'fren-fonts'
  link.rel = 'stylesheet'
  link.href = FONTS_URL
  document.head.appendChild(link)
}

export function showToast(options: ToastOptions): void {
  if (current) return
  const { config, project } = options
  const maker = project.makerName ?? 'the maker'
  const amounts = project.amounts?.length ? project.amounts : [5]
  let amount = project.defaultAmount && amounts.includes(project.defaultAmount) ? project.defaultAmount : amounts[0]!

  loadFonts()
  const host = document.createElement('div')
  host.setAttribute('data-fren', '')
  // Keep the toast's own clicks out of the signals.
  host.setAttribute('data-fren-ignore', '')
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  const live = el('div', '')
  live.setAttribute('aria-live', 'polite')
  root.append(style, live)

  let thanksTimer: ReturnType<typeof setTimeout> | undefined
  let paid = false
  const close = () => {
    clearTimeout(thanksTimer)
    stopWaiting?.()
    document.removeEventListener('keydown', onKey, true)
    host.remove()
    current = null
  }
  const dismiss = () => {
    options.onDismiss()
    close()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') (paid ? close : dismiss)()
  }
  document.addEventListener('keydown', onKey, true)
  current = { close }

  // Ask (frame 4.2).
  const card = el('div', 'ask')
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-label', `Tip ${maker}`)
  card.tabIndex = -1

  const top = el('div', 'row top')
  if (project.photoUrl) {
    const img = el('img', 'av')
    img.src = project.photoUrl
    img.alt = ''
    top.append(img)
  } else {
    top.append(el('span', 'av', project.initial ?? maker.charAt(0).toUpperCase()))
  }
  const x = closeButton('Close')
  x.onclick = dismiss
  top.append(x)

  const who = el('div', 'who')
  who.append(el('span', 'name', `Hey, I'm ${maker}`), el('span', 'by', `I build ${project.productName ?? 'this'} on my own`))

  const headline = options.headline || project.headline
  const err = el('p', 'bd err')
  err.setAttribute('role', 'status')

  // Set while the PayPal window is open.
  let stopWaiting: (() => void) | null = null
  const pills = el('div', 'row amts')
  const pay = button('pay', '')
  const payArea = el('div', '')
  payArea.append(pay)
  const setAmount = (value: number) => {
    amount = value
    for (const b of pills.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.amount === String(value)))
    if (!stopWaiting) pay.textContent = `Donate $${value} with PayPal`
  }
  for (const value of amounts) {
    const b = button('amt', `$${value}`)
    b.dataset.amount = String(value)
    b.onclick = () => setAmount(value)
    pills.append(b)
  }
  setAmount(amount)

  const foot = el('div', 'row foot')
  const later = button('later', 'Maybe later')
  later.onclick = dismiss
  foot.append(later, el('span', 'mono', 'powered by fren'))

  card.append(top, who)
  if (headline) card.append(el('p', 'hd', headline))
  if (project.message) card.append(el('p', 'bd', project.message))
  card.append(pills, err, payArea, foot)
  root.append(card)
  document.body.appendChild(host)
  card.focus()

  // Paying (spec 6.6): the Donate button opens PayPal's checkout in a window.
  const resetPay = () => {
    stopWaiting = null
    pay.textContent = `Donate $${amount} with PayPal`
  }
  pay.onclick = () => {
    // Clicking again while waiting starts over, e.g. after closing the PayPal window.
    stopWaiting?.()
    err.textContent = ''
    options.onDonate()
    pay.textContent = 'Waiting for PayPal…'
    stopWaiting = startCheckout(config, amount, anonId(), {
      onPaid: (payerName) => {
        paid = true
        stopWaiting = null
        options.onPaid()
        showThanks(payerName)
      },
      onCancel: resetPay,
      onError: (code) => {
        resetPay()
        err.textContent = ERRORS[code] ?? GENERIC_ERROR
      },
    })
  }

  // Thank-you (frame 4.4).
  const showThanks = (payerName: string | null) => {
    const first = payerName?.trim().split(/\s+/)[0]
    const thanks = el('div', 'ask thanks')
    thanks.setAttribute('role', 'dialog')
    thanks.setAttribute('aria-label', 'Thank you')
    thanks.tabIndex = -1
    const row = el('div', 'row top')
    row.style.gap = '14px'
    const tick = el('span', 'av tick')
    tick.innerHTML = TICK_ICON
    const text = el('div', 'thanks-text')
    const title = first ? `Thank you, ${first}.` : 'Thank you.'
    const body = `Your $${amount} went straight to ${maker}. We won't ask again for a while.`
    text.append(el('p', 'hd', title), el('p', 'bd', body))
    const done = closeButton('Close')
    done.onclick = close
    row.append(tick, text, done)
    const tFoot = el('div', 'row foot')
    tFoot.append(el('span', 'note', 'Receipt sent by PayPal'), el('span', 'mono', 'powered by fren'))
    thanks.append(row, tFoot)
    card.replaceWith(thanks)
    live.textContent = `${title} ${body}`
    thanks.focus()
    thanksTimer = setTimeout(close, THANKS_MS)
  }
}
