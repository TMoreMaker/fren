import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// @next/env is CommonJS. Next's config loader and tsx disagree on how to import it,
// so require it directly.
const { loadEnvConfig } = createRequire(import.meta.url)('@next/env') as typeof import('@next/env')

// The monorepo keeps one .env at the root. Load it for Next, drizzle-kit and scripts.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
loadEnvConfig(root)
