import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { defineConfig } from 'tsup'

const webPublic = new URL('../../apps/web/public/v1/', import.meta.url)

// The sandbox client id is public. Locally it comes from the root .env, on Vercel from the project env.
const rootEnv = new URL('../../.env', import.meta.url)
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)
const define = { __FREN_PAYPAL_CLIENT_ID__: JSON.stringify(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '') }

export default defineConfig([
  // npm: import { Fren } from '@fren/sdk'
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    target: 'es2020',
    define,
  },
  // script tag: fren.js, served by apps/web at /v1/fren.js
  {
    entry: { fren: 'src/browser.ts' },
    format: ['iife'],
    minify: true,
    target: 'es2020',
    define,
    outExtension: () => ({ js: '.js' }),
    async onSuccess() {
      await mkdir(webPublic, { recursive: true })
      await copyFile(new URL('./dist/fren.js', import.meta.url), new URL('fren.js', webPublic))
    },
  },
])
