import { Fren, type FrenApi } from './index'

declare global {
  interface Window {
    fren?: FrenApi
  }
}

// Script tag entry. Reads data-key from its own <script> and exposes window.fren.
try {
  const script = document.currentScript as HTMLScriptElement | null
  const key = script?.dataset.key
  window.fren = Fren
  if (key) Fren.init({ key })
} catch {
  // Never throw into the host page.
}
