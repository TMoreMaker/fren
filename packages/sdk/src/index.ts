// Public API: docs/02-BUILD-SPEC.md section 6.2.
import { type ApiConfig, initSdk, type ProjectInfo, sendMoment, sendSignals, type Visitor } from './api'
import { showPaySpike } from './pay-spike'
import { customSignal, type Signal, watchSignals } from './signals'
import { anonId, askedOrTipped, readStorage, sessionId, writeStorage } from './storage'

export interface InitOptions {
  key: string
  apiBase?: string
}

// Where fren.js is served from. The script tag entry fills this in from its own src.
export const defaults = { apiBase: 'https://fren-tips.vercel.app' }

const flag = (() => {
  try {
    return new URLSearchParams(location.search).get('fren')
  } catch {
    return null
  }
})()
const testMode = flag === 'test'
const debugMode = flag === 'debug'

const debug = (...args: unknown[]) => {
  if (debugMode) console.debug('[fren]', ...args)
}

const TRAIL_KEY = 'fren_trail'
const TRAIL_MAX = 20
const SETTLE_MS = 600

let config: ApiConfig | null = null
let project: ProjectInfo | null = null
let watching = false
let askOpen = false
let askedThisSession = false
let sendTimer: ReturnType<typeof setTimeout> | undefined
// Calls made before init() finishes run once it does.
let queue: (() => void)[] | null = []

let trail: Signal[] = (() => {
  try {
    return (JSON.parse(readStorage(TRAIL_KEY, 'sessionStorage') ?? '[]') as Signal[]).slice(-TRAIL_MAX)
  } catch {
    return []
  }
})()

const visitor = (test = testMode): Visitor => ({ anonId: anonId(), sessionId, test })

function whenReady(fn: () => void) {
  if (queue) queue.push(fn)
  else if (config && project) fn()
}

function addSignal(signal: Signal) {
  trail = [...trail, signal].slice(-TRAIL_MAX)
  writeStorage(TRAIL_KEY, JSON.stringify(trail), 'sessionStorage')
  debug('signal', signal)
  clearTimeout(sendTimer)
  sendTimer = setTimeout(() => whenReady(flushSignals), SETTLE_MS)
}

// One batch in flight per page, so the server's rate limit sees each check in turn.
let sending = false
let sendAgain = false

function flushSignals() {
  if (!config || askOpen || askedThisSession) return
  if (!testMode && askedOrTipped()) return
  if (sending) {
    sendAgain = true
    return
  }
  sending = true
  sendSignals(config, visitor(), trail)
    .then((result) => {
      debug('verdict', result)
      if (result.show) openAsk()
    })
    .catch((err) => debug('signals failed', err))
    .finally(() => {
      sending = false
      if (sendAgain) {
        sendAgain = false
        flushSignals()
      }
    })
}

function openAsk() {
  if (!config || askOpen) return
  askOpen = true
  askedThisSession = true
  writeStorage('fren_last_shown', String(Date.now()))
  // Step 2.1: the step 1.2 PayPal card stands in for the toast until step 2.3.
  const amount = project?.defaultAmount ?? project?.amounts?.[0] ?? 5
  showPaySpike(config, amount, () => writeStorage('fren_tipped', '1')).catch((err) => debug('ask failed', err))
}

function safe<A extends unknown[]>(fn: (...args: A) => void) {
  return (...args: A): void => {
    try {
      fn(...args)
    } catch (err) {
      // Never throw into the host page.
      debug('error', err)
    }
  }
}

export const Fren = {
  init: safe((options: InitOptions) => {
    if (config) return
    config = { key: options.key, apiBase: (options.apiBase ?? defaults.apiBase).replace(/\/$/, '') }
    if (!watching) {
      watching = true
      watchSignals(addSignal)
    }
    initSdk(config)
      .then((res) => {
        project = res.project
        const pending = queue ?? []
        queue = null
        debug('ready', { testMode, queued: pending.length })
        for (const fn of pending) safe(fn)()
      })
      .catch((err) => {
        // Unknown key or origin not allowed: stay quiet and do nothing.
        queue = null
        config = null
        debug('init failed', err)
      })
  }),

  track: safe((name: string) => {
    const signal = customSignal(name)
    if (signal) addSignal(signal)
  }),

  moment: safe((name: string) => {
    whenReady(() => {
      // Always tell the server, so the rules (and the cooldown) are logged there.
      if (!config) return
      sendMoment(config, visitor(), name)
        .then((result) => {
          debug('moment', name, result)
          if (result.show) openAsk()
        })
        .catch((err) => debug('moment failed', err))
    })
  }),

  test: safe(() => {
    whenReady(() => {
      if (!config) return
      sendMoment(config, visitor(true), 'fren_test')
        .then(() => openAsk())
        .catch((err) => debug('test failed', err))
    })
  }),
}

export type FrenApi = typeof Fren
