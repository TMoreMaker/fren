// Browser storage can throw (private mode, blocked storage), so every call is wrapped.

function store(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return window[kind]
  } catch {
    return null
  }
}

export function readStorage(name: string, kind: 'localStorage' | 'sessionStorage' = 'localStorage'): string | null {
  try {
    return store(kind)?.getItem(name) ?? null
  } catch {
    return null
  }
}

export function writeStorage(name: string, value: string, kind: 'localStorage' | 'sessionStorage' = 'localStorage') {
  try {
    store(kind)?.setItem(name, value)
  } catch {
    // Storage is a nice-to-have.
  }
}

export const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

let memoryAnonId: string | null = null

export function anonId(): string {
  const stored = readStorage('fren_anon')
  if (stored) return stored
  memoryAnonId ??= randomId('a')
  writeStorage('fren_anon', memoryAnonId)
  return memoryAnonId
}

// New for each page load (spec 6.4).
export const sessionId = randomId('s')

const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

/** The cheap first check before calling the server (spec 6.5). */
export function askedOrTipped(): boolean {
  if (readStorage('fren_tipped')) return true
  const last = Number(readStorage('fren_last_shown'))
  return last > 0 && Date.now() - last < COOLDOWN_MS
}
