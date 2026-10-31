import { DrizzleAdapter } from '@auth/drizzle-adapter'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { db, schema } from './lib/db'
import { createEmptyProject } from './lib/project'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [GitHub],
  // Vercel and localhost only; lets `next start` work locally too.
  trustHost: true,
  events: {
    async createUser({ user }) {
      if (user.id) await createEmptyProject(user.id)
    },
  },
})
