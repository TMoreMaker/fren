// Tiny static server for local dev on :3001. Vercel serves dist/ directly.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const port = 3001
const index = new URL('../dist/index.html', import.meta.url)

createServer(async (_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(await readFile(index))
}).listen(port, () => console.log(`demo-host: http://localhost:${port}`))
