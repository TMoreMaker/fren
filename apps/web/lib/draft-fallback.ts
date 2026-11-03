// Template drafts for frame 2.6 when Fren AI fails twice (spec 7.3, spec 12). Shared by the
// server and the browser, so the demo never shows an empty step.
import type { Tone } from './db/schema'

export const DRAFT_MAX = 90

const TEMPLATES: Record<Tone, ((p: string) => string)[]> = {
  warm: [
    (p) => `If ${p} saves you time, a small tip helps me keep it going.`,
    (p) => `${p} is made by one person, me. A tip helps me keep building it.`,
    (p) => `Thanks for using ${p}. If it helped, a small tip means a lot.`,
  ],
  playful: [
    (p) => `${p} just did its thing. Fancy buying me a coffee for it?`,
    (p) => `If ${p} made your day a bit easier, a tip would make mine.`,
    (p) => `I build ${p} on my own, fuelled by coffee. Tips keep it brewing.`,
  ],
  straight: [
    (p) => `${p} is built by one person. Tips keep it running.`,
    (p) => `If ${p} helped, you can leave a tip.`,
    (p) => `Tips pay for ${p}'s servers and my time.`,
  ],
}

export function fallbackDrafts(productName: string | null, tone: Tone | null): string[] {
  const name = productName?.trim() || 'this'
  return TEMPLATES[tone ?? 'warm'].map((t) => {
    const text = t(name)
    // A very long product name: fall back to "it" so the draft still fits.
    return text.length <= DRAFT_MAX ? text : t('it').replace(/^it/, 'It')
  })
}
