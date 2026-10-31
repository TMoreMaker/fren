import { randomBytes } from 'node:crypto'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// "fk_test_" + 24 random chars (spec section 4). Sandbox only, so always fk_test_.
export function newPublicKey(): string {
  const bytes = randomBytes(24)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return `fk_test_${out}`
}
