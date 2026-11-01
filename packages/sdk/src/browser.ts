import { defaults, Fren, type FrenApi } from './index'

declare global {
  interface Window {
    fren?: FrenApi
  }
}

// Script tag entry. Reads data-key from its own <script> and exposes window.fren.
// The API lives wherever fren.js was served from.
try {
  const script = document.currentScript as HTMLScriptElement | null
  if (script?.src) defaults.apiBase = new URL(script.src).origin
  const key = script?.dataset.key
  window.fren = Fren
  if (key) Fren.init({ key })
} catch {
  // Never throw into the host page.
}
