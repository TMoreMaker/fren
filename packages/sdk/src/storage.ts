// localStorage can throw (private mode, blocked storage), so every call is wrapped.

export function readStorage(name: string): string | null {
  try {
    return window.localStorage.getItem(name)
  } catch {
    return null
  }
}

export function writeStorage(name: string, value: string): void {
  try {
    window.localStorage.setItem(name, value)
  } catch {
    // Storage is a nice-to-have.
  }
}

let memoryAnonId: string | null = null

export function anonId(): string {
  const stored = readStorage('fren_anon')
  if (stored) return stored
  memoryAnonId ??= `a_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  writeStorage('fren_anon', memoryAnonId)
  return memoryAnonId
}
