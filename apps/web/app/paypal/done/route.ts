// PayPal sends the tip window here after the buyer approves or cancels (spec 6.6).
// The tip is captured on the server, then the window closes and the widget picks up the result.
import { finishFromReturn } from '@/lib/donations'

export const dynamic = 'force-dynamic'

const MESSAGES = {
  completed: 'Thank you. You can close this window.',
  cancelled: 'Payment cancelled. You can close this window.',
  failed: "Payment didn't go through. You weren't charged.",
  created: "Payment didn't go through. You weren't charged.",
} as const

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get('token') ?? ''
  const status = /^[A-Z0-9]{8,32}$/.test(orderId)
    ? await finishFromReturn(orderId, url.searchParams.has('cancelled'))
    : 'failed'

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fren</title>
<style>
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #FFFFFF; color: #3D3C39; font: 400 15px/1.5 system-ui, sans-serif; text-align: center; padding: 24px; }
</style>
</head>
<body>
<p>${MESSAGES[status]}</p>
<script>setTimeout(function () { window.close() }, 400)</script>
</body>
</html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
