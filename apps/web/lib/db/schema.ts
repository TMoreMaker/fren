// Data model: docs/02-BUILD-SPEC.md section 4.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { AdapterAccountType } from 'next-auth/adapters'

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull()

// Auth.js tables. Column names follow the Drizzle adapter's expected shape.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  name: text('name'),
  image: text('image'),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  createdAt: createdAt(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
)

export type Tone = 'warm' | 'playful' | 'straight'

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull().unique(),
    productName: text('product_name'),
    website: text('website'),
    makerName: text('maker_name'),
    photoUrl: text('photo_url'),
    // The developer's words, and Fren AI's 3-item plan of what to watch for (spec 7.2).
    momentDescription: text('moment_description'),
    momentHints: jsonb('moment_hints').$type<string[]>(),
    // Minimum confidence for the AI check to show the ask (spec 6.5).
    aiThreshold: real('ai_threshold').default(0.75).notNull(),
    tone: text('tone').$type<Tone>(),
    headline: text('headline'),
    message: text('message'),
    amounts: jsonb('amounts').$type<number[]>(),
    defaultAmount: integer('default_amount'),
    currency: text('currency').default('USD').notNull(),
    paypalEmail: text('paypal_email'),
    paypalPayerId: text('paypal_payer_id'),
    onboardingStep: text('onboarding_step').default('paypal').notNull(),
    // Set by /api/sdk/init, drives the "SDK loaded" tick on 3.2.
    sdkSeenAt: timestamp('sdk_seen_at', { withTimezone: true }),
    firstEventAt: timestamp('first_event_at', { withTimezone: true }),
    firstSpottedAt: timestamp('first_spotted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('projects_public_key_idx').on(t.publicKey)],
)

export type EventType = 'signal' | 'judged' | 'moment' | 'shown' | 'skipped' | 'clicked' | 'dismissed' | 'paid'
export type SkipReason = 'cooldown' | 'already_tipped' | 'rate_limited' | 'ai_no' | 'ai_timeout'

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type').$type<EventType>().notNull(),
    // signal: "click" | "download" | "submit" | "route" | "custom". judged: the AI's kind, e.g. "export".
    eventName: text('event_name'),
    // signal: the label ("Export", "chapter-1.pdf"). judged and shown: the AI's label.
    detail: text('detail'),
    confidence: real('confidence'),
    // judged: how many times this anon_id has done this kind, 1 for the first.
    occurrence: integer('occurrence'),
    sessionId: text('session_id'),
    anonId: text('anon_id'),
    reason: text('reason').$type<SkipReason>(),
    isTest: boolean('is_test').default(false).notNull(),
    isSample: boolean('is_sample').default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('events_project_created_idx').on(t.projectId, t.createdAt),
    // The SDK resends its recent signals; each is stored once (lib/sdk.ts).
    uniqueIndex('events_signal_once_idx')
      .on(t.projectId, t.anonId, t.createdAt, t.eventName, t.detail)
      .where(sql`type = 'signal'`),
  ],
)

export type DonationStatus = 'created' | 'completed' | 'failed'

export const donations = pgTable(
  'donations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    paypalOrderId: text('paypal_order_id').notNull().unique(),
    paypalCaptureId: text('paypal_capture_id'),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    payerName: text('payer_name'),
    anonId: text('anon_id'),
    // Copied from the "shown" event, e.g. "Exported chapter-1.pdf". Shown on the Overview.
    triggerLabel: text('trigger_label'),
    status: text('status').$type<DonationStatus>().notNull(),
    isSample: boolean('is_sample').default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('donations_project_created_idx').on(t.projectId, t.createdAt)],
)

export const aiSuggestions = pgTable('ai_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  headline: text('headline').notNull(),
  body: text('body').notNull(),
  actionLabel: text('action_label'),
  // The new moment_description to apply.
  actionDescription: text('action_description'),
  createdAt: createdAt(),
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
})

export type Project = typeof projects.$inferSelect
