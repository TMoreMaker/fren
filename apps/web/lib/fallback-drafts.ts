// The drafts shown when Fren AI can't write any (spec 7.3 and 12), so frame 2.6 never shows an error.
// No server code here: the message step also uses these if the request itself fails.
import type { Tone } from './db/schema'

export const MESSAGE_MAX = 90

const TEMPLATES: Record<Tone, ((product: string) => string)[]> = {
  warm: [
    (p) => `If ${p} saves you time, a small tip helps me keep it going.`,
    (p) => `Thanks for using ${p}. If it helped, a small tip means a lot to me.`,
    (p) => `I build ${p} on my own, so every tip helps. Thank you.`,
  ],
  playful: [
    (p) => `${p} runs on coffee and tips. Got a spare one for me?`,
    (p) => `Did ${p} earn a coffee today? I won't say no to one!`,
    (p) => `I build ${p} alone, so tips are my whole team. Fancy helping?`,
  ],
  straight: [
    (p) => `I build ${p} on my own. A tip helps me keep it running.`,
    (p) => `If ${p} helped, you can leave a tip here.`,
    (p) => `Tips keep ${p} going. Thanks for using it.`,
  ],
}

export function fallbackDrafts(productName: string | null, tone: Tone | null): string[] {
  return TEMPLATES[tone ?? 'warm'].map((write) => {
    const text = write(productName?.trim() || 'this')
    // Product names can be up to 60 characters.
    return text.length <= MESSAGE_MAX ? text : write('this')
  })
}
