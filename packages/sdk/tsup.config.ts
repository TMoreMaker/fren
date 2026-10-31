import { copyFile, mkdir } from 'node:fs/promises'
import { defineConfig } from 'tsup'

const webPublic = new URL('../../apps/web/public/v1/', import.meta.url)

export default defineConfig([
  // npm: import { Fren } from '@fren/sdk'
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    target: 'es2020',
  },
  // script tag: fren.js, served by apps/web at /v1/fren.js
  {
    entry: { fren: 'src/browser.ts' },
    format: ['iife'],
    minify: true,
    target: 'es2020',
    outExtension: () => ({ js: '.js' }),
    async onSuccess() {
      await mkdir(webPublic, { recursive: true })
      await copyFile(new URL('./dist/fren.js', import.meta.url), new URL('fren.js', webPublic))
    },
  },
])
