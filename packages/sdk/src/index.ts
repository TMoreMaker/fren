// Public API: docs/02-BUILD-SPEC.md section 6.2. Behaviour lands in build plan step 2.1.

export interface InitOptions {
  key: string
  apiBase?: string
}

function safe<A extends unknown[]>(fn: (...args: A) => void) {
  return (...args: A): void => {
    try {
      fn(...args)
    } catch {
      // Never throw into the host page.
    }
  }
}

export const Fren = {
  init: safe((_options: InitOptions) => {}),
  moment: safe((_eventName: string) => {}),
  test: safe(() => {}),
}

export type FrenApi = typeof Fren
