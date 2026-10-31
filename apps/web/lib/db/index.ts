import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Don't throw at import time, so `next build` works without a database.
// Queries fail with a connection error until DATABASE_URL is set.
const url = process.env.DATABASE_URL || 'postgresql://unset:unset@db-url-not-set.invalid/unset'

export const db = drizzle(neon(url), { schema })
export { schema }
