// With ?fren=debug, briefly shows what Fren AI decided (frame 4.1, the indigo pill), for the demo video.

const css = `
:host { all: initial; }
.pill { position: fixed; top: 76px; right: 24px; z-index: 2147483647; display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 10px; background: #1C1255; color: #FFFFFF;
  font: 500 12.5px 'JetBrains Mono', monospace; animation: in 200ms ease-out; }
@keyframes in { from { opacity: 0; transform: translateY(-6px); } }
@media (prefers-reduced-motion: reduce) { .pill { animation: none; } }
`
const SPARK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#A397FF" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z"/></svg>`
const SHOW_MS = 5_000

export function showVerdictPill(verdict: { label: string; confidence: number }): void {
  const host = document.createElement('div')
  host.setAttribute('data-fren', '')
  host.setAttribute('data-fren-ignore', '')
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  const pill = document.createElement('div')
  pill.className = 'pill'
  pill.innerHTML = SPARK
  pill.append(`Fren AI: ${verdict.label}, ${Math.round(verdict.confidence * 100)}% sure`)
  root.append(style, pill)
  document.body.appendChild(host)
  setTimeout(() => host.remove(), SHOW_MS)
}
