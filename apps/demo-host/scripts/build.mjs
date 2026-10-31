// Writes dist/index.html with the Fren script URL and key filled in from env.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const rootEnv = new URL('../../../.env', import.meta.url)
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const vars = {
  FREN_SCRIPT_URL: process.env.FREN_SCRIPT_URL ?? 'http://localhost:3000/v1/fren.js',
  FREN_PUBLIC_KEY: process.env.FREN_PUBLIC_KEY ?? '',
}

let html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8')
for (const [name, value] of Object.entries(vars)) {
  html = html.replaceAll(`%${name}%`, value.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`))
}

await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
await writeFile(new URL('../dist/index.html', import.meta.url), html)
console.log('demo-host: wrote dist/index.html')
