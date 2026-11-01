// What the SDK watches: docs/02-BUILD-SPEC.md section 6.4.
// Labelled clicks, downloads, submits and page changes. Never anything typed or page text.

export type SignalType = 'click' | 'download' | 'submit' | 'route' | 'custom'

export interface Signal {
  type: SignalType
  label: string
  path: string
  at: number
}

const CLICKABLE = 'button, a, [role=button], input[type=submit], input[type=button]'
const PRIVATE = 'textarea, [contenteditable]:not([contenteditable=false]), [data-fren-ignore]'

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)

function fileName(a: HTMLAnchorElement): string {
  const named = a.getAttribute('download')
  if (named) return clean(named)
  if (a.protocol === 'blob:' || a.protocol === 'data:') return 'file'
  return clean(decodeURIComponent(a.pathname.split('/').pop() ?? '')) || 'file'
}

function isDownload(a: HTMLAnchorElement): boolean {
  return a.hasAttribute('download') || a.protocol === 'blob:' || a.protocol === 'data:'
}

function labelOf(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria) return clean(aria)
  // Button-type inputs show their value as the button text. Text inputs never get here.
  if (el instanceof HTMLInputElement) return clean(el.value)
  return clean(el.textContent)
}

export function watchSignals(emit: (signal: Signal) => void): void {
  const send = (type: SignalType, label: string) => {
    if (label) emit({ type, label, path: location.pathname, at: Date.now() })
  }

  document.addEventListener(
    'click',
    (event) => {
      try {
        const target = event.target instanceof Element ? event.target : null
        const el = target?.closest(CLICKABLE)
        if (!el || el.closest(PRIVATE)) return
        if (el instanceof HTMLAnchorElement && isDownload(el)) send('download', fileName(el))
        else send('click', labelOf(el))
      } catch {
        // Never get in the way of the host page.
      }
    },
    { capture: true, passive: true },
  )

  document.addEventListener(
    'submit',
    (event) => {
      try {
        const form = event.target
        if (!(form instanceof HTMLFormElement) || form.closest('[data-fren-ignore]')) return
        const name = clean(form.getAttribute('aria-label') || form.getAttribute('name') || form.id)
        const submitter = (event as SubmitEvent).submitter
        send('submit', clean([name, submitter ? labelOf(submitter) : ''].filter(Boolean).join(' ')))
      } catch {
        // Never get in the way of the host page.
      }
    },
    { capture: true, passive: true },
  )

  // Programmatic downloads often click an anchor that was never added to the page,
  // so the click never reaches document. Watch those through the click method itself.
  try {
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      try {
        if (!this.isConnected && isDownload(this)) send('download', fileName(this))
      } catch {
        // Fall through to the real click.
      }
      return click.call(this)
    }
  } catch {
    // Leave the prototype alone if it can't be wrapped.
  }

  // Page changes in single-page apps. The path only, and only when it changes.
  let lastPath = location.pathname
  const onRoute = () => {
    try {
      if (location.pathname === lastPath) return
      lastPath = location.pathname
      send('route', lastPath)
    } catch {
      // Never get in the way of the host page.
    }
  }
  for (const method of ['pushState', 'replaceState'] as const) {
    try {
      const original = history[method]
      history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
        const result = original.apply(this, args)
        onRoute()
        return result
      }
    } catch {
      // Leave history alone if it can't be wrapped.
    }
  }
  window.addEventListener('popstate', onRoute, { passive: true })
}

export function customSignal(name: string): Signal | null {
  const label = clean(name)
  return label ? { type: 'custom', label, path: location.pathname, at: Date.now() } : null
}
