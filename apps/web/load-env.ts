import { loadEnvConfig } from '@next/env'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The monorepo keeps one .env at the root. Load it for Next, drizzle-kit and scripts.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
loadEnvConfig(root)
