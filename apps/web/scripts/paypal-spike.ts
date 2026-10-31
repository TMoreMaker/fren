// Build plan step 1.1: prove payee routing in sandbox. Throwaway.
//   pnpm --filter @fren/web exec tsx scripts/paypal-spike.ts create
//   pnpm --filter @fren/web exec tsx scripts/paypal-spike.ts capture <orderId>
import '../load-env'
import { captureOrder, createOrder, PayPalError, readCapture } from '../lib/paypal'

const [mode, orderId] = process.argv.slice(2)
const payeeEmail = process.env.PAYPAL_SANDBOX_PAYEE_EMAIL

try {
  if (mode === 'create') {
    if (!payeeEmail) throw new Error('PAYPAL_SANDBOX_PAYEE_EMAIL is not set')
    const order = await createOrder({
      projectId: 'spike',
      makerName: 'Lebo',
      productName: 'Inkwell',
      payeeEmail,
      amount: 5,
      returnUrl: 'https://example.com/fren-spike-approved',
      cancelUrl: 'https://example.com/fren-spike-cancelled',
    })
    const approve = order.links.find((l) => l.rel === 'payer-action' || l.rel === 'approve')
    console.log(JSON.stringify({ orderId: order.id, status: order.status, approve: approve?.href, payee: payeeEmail }))
  } else if (mode === 'capture' && orderId) {
    console.log(JSON.stringify(readCapture(await captureOrder(orderId))))
  } else {
    console.log('usage: paypal-spike.ts create | capture <orderId>')
  }
} catch (err) {
  if (err instanceof PayPalError) console.error(err.message, err.body)
  else console.error(err)
  process.exit(1)
}
