# Fren: build spec (hackathon build)

Screen numbers (e.g. `2.6`) match the "Hackathon build" page of the Fren Hi-fi canvas.

---

## 1. System overview

```
 Developer's browser                     End user's browser (on the developer's site)
 ┌──────────────────────┐               ┌────────────────────────────────────────────┐
 │ apps/web (Next.js)   │               │ Host product (apps/demo-host or real site) │
 │ sign up, onboarding, │               │  <script src=".../fren.js" data-key=...>   │
 │ install, dashboard   │               │  fren.moment('first_export')               │
 └─────────┬────────────┘               │        │                                   │
           │                            │  Fren widget (Shadow DOM toast)            │
           │                            │  PayPal JS SDK buttons (loaded on demand)  │
           │                            └────────┬───────────────────────────────────┘
           ▼                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ apps/web API routes                                                    │
 │  /api/onboarding/*   /api/ai/*   /api/sdk/*   /api/paypal/*            │
 └───────┬─────────────────────┬─────────────────────┬────────────────────┘
         ▼                     ▼                     ▼
   Postgres (Neon)      Anthropic API          PayPal REST (sandbox)
   via Drizzle          claude-sonnet-5-5      Orders v2: create, capture
```

Three deployables:

| Package | What it is | Where it runs |
|---|---|---|
| `apps/web` | Dashboard, onboarding, all API routes, serves `fren.js` | Vercel, e.g. `fren-app.vercel.app` |
| `packages/sdk` | Browser SDK and widget, built to `fren.js` (IIFE) and ESM | Copied to `apps/web/public/v1/fren.js` at build |
| `apps/demo-host` | A tiny fake product with one aha action | Vercel, a separate domain, e.g. `fren-demo.vercel.app` |

The demo host must be on a **different origin** from `apps/web` so the demo proves the cross-site install works.

---

## 2. Repo layout

```
fren/
├─ CLAUDE.md
├─ LICENSE                      # MIT
├─ README.md                    # setup, env vars, run, deploy
├─ .env.example
├─ docs/
├─ apps/
│  ├─ web/
│  │  ├─ app/
│  │  │  ├─ (marketing)/page.tsx              # 1.1 sign up
│  │  │  ├─ onboarding/paypal/page.tsx        # 1.2, 1.3
│  │  │  ├─ onboarding/ask/[step]/page.tsx    # 2.1 to 2.8
│  │  │  ├─ onboarding/install/page.tsx       # 3.1
│  │  │  ├─ onboarding/live/page.tsx          # 3.2
│  │  │  ├─ dashboard/page.tsx                # 5.1
│  │  │  └─ api/...                           # section 5
│  │  ├─ components/
│  │  │  ├─ ask-preview/                      # the live preview panel (shared with SDK look)
│  │  │  ├─ onboarding/                       # QuestionLayout, OptionRow, DraftCard, ProgressBar
│  │  │  └─ dashboard/                        # StatCard, RaisedChart, Funnel, TipList, AiSuggestionCard
│  │  ├─ lib/
│  │  │  ├─ db/schema.ts, db/index.ts
│  │  │  ├─ paypal.ts                         # token, createOrder, captureOrder
│  │  │  ├─ ai.ts                             # writeDrafts, suggestMoment
│  │  │  ├─ metrics.ts                        # overview queries
│  │  │  ├─ ask-rules.ts                      # should we show the ask?
│  │  │  └─ keys.ts                           # public key generation
│  │  └─ scripts/seed.ts
│  └─ demo-host/
│     └─ index.html (or a small Next page)
└─ packages/
   └─ sdk/
      ├─ src/index.ts                         # init, moment, test mode
      ├─ src/widget.ts                        # Shadow DOM toast
      ├─ src/paypal.ts                        # lazy-load PayPal JS SDK, render buttons
      ├─ src/api.ts                           # fetch wrappers to /api/sdk/*
      ├─ src/styles.ts                        # widget CSS string
      └─ tsup.config.ts
```

---

## 3. Environment variables

```
# apps/web
DATABASE_URL=                      # Neon Postgres
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ANTHROPIC_API_KEY=
PAYPAL_CLIENT_ID=                  # sandbox REST app (Fren's own app)
PAYPAL_CLIENT_SECRET=
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
NEXT_PUBLIC_APP_URL=https://fren-app.vercel.app
NEXT_PUBLIC_PAYPAL_CLIENT_ID=      # same client id, safe to expose, used by the widget
BLOB_READ_WRITE_TOKEN=             # Vercel Blob, for profile photos (optional)

# apps/demo-host
FREN_SCRIPT_URL=https://fren-app.vercel.app/v1/fren.js
FREN_PUBLIC_KEY=fk_test_...
```

PayPal sandbox accounts to create in the PayPal Developer dashboard:

1. **Fren app**: a REST app. Its client id and secret go in the env above.
2. **Developer (Lebo)**: a sandbox **Business** account. Its email is what the developer connects. Tips land here.
3. **End user (Mpho)**: a sandbox **Personal** account with balance. Used to pay in the demo.

---

## 4. Data model (Drizzle, Postgres)

One developer has one project for the hackathon. Keep the `projects` table anyway so the model is honest.

```ts
users
  id            uuid pk
  email         text unique
  name          text
  image         text
  created_at    timestamptz default now()
  // plus the standard Auth.js tables (accounts, sessions, verification_tokens)

projects
  id              uuid pk
  user_id         uuid fk users
  public_key      text unique          // "fk_test_" + 24 random chars, shown in install
  product_name    text                 // "Inkwell"
  website         text                 // "inkwell.app", used to check the request origin
  maker_name      text                 // "Lebo"
  photo_url       text null            // null means show the first initial (2.3b)
  moment_event    text                 // "first_export" or a custom slug
  moment_label    text                 // "First export or download" or "Published a chapter"
  moment_kind     text                 // "preset" | "custom"
  tone            text                 // "warm" | "playful" | "straight"
  headline        text                 // "Glad that export worked."
  message         text                 // the chosen AI draft, editable
  amounts         jsonb                // [3, 5, 10], whole dollars
  default_amount  int                  // 5, the middle one
  currency        text default 'USD'
  paypal_email    text null            // the developer's sandbox business email
  paypal_payer_id text null            // if using Log in with PayPal
  onboarding_step text                 // where to resume
  first_event_at  timestamptz null     // set by the first non-test moment, drives 3.2
  created_at      timestamptz default now()

events
  id          uuid pk
  project_id  uuid fk projects
  type        text   // "moment" | "shown" | "skipped" | "clicked" | "dismissed" | "paid"
  event_name  text   // "first_export"
  anon_id     text   // random id stored in the end user's localStorage
  reason      text null  // for "skipped": "cooldown" | "already_tipped" | "test_off"
  is_test     boolean default false
  is_sample   boolean default false
  created_at  timestamptz default now()

donations
  id               uuid pk
  project_id       uuid fk projects
  paypal_order_id  text unique
  paypal_capture_id text null
  amount_cents     int
  currency         text
  payer_name       text null       // first name and last initial, e.g. "Mpho K."
  anon_id          text null
  status           text            // "created" | "completed" | "failed"
  is_sample        boolean default false
  created_at       timestamptz default now()

ai_suggestions
  id          uuid pk
  project_id  uuid fk projects
  headline    text     // "People who export twice tip about 2x more often."
  body        text
  action_label text    // "Ask after 2nd export"
  action_event text    // "second_export"
  created_at  timestamptz default now()
  dismissed_at timestamptz null
```

Indexes: `events (project_id, created_at)`, `donations (project_id, created_at)`, `projects (public_key)`.

---

## 5. API routes

All inputs validated with zod. Dashboard and onboarding routes need a session. SDK routes are public and identified by `public_key`.

### 5.1 Onboarding (session required)

| Method and path | Body | Does |
|---|---|---|
| `POST /api/onboarding/paypal` | `{ email }` | Saves `paypal_email`. Basic email check. (Or the Log in with PayPal callback sets it, see 7.4.) |
| `PATCH /api/project` | partial project fields | Saves answers step by step. Sets `onboarding_step`. |
| `POST /api/project/photo` | multipart file | Uploads to Vercel Blob, saves `photo_url`. Optional. |
| `POST /api/ai/drafts` | none (reads project) | Calls Claude, returns 3 drafts (7.1). Does not save. |
| `GET /api/project/status` | none | `{ sdkSeen: bool, firstEventAt, testAskShown: bool }` for 3.2. Poll every 2s. |

### 5.2 Dashboard (session required)

| Method and path | Does |
|---|---|
| `GET /api/metrics/overview?range=30d` | Returns everything 5.1 needs (section 9). |
| `POST /api/ai/suggestion` | Builds stats, calls Claude (7.2), saves and returns a suggestion. Cache for 10 minutes. |
| `POST /api/ai/suggestion/:id/apply` | Sets `moment_event` to the suggested event. |
| `POST /api/ai/suggestion/:id/dismiss` | Sets `dismissed_at`. |

### 5.3 SDK (public, CORS open, keyed by `public_key`)

| Method and path | Body | Returns |
|---|---|---|
| `POST /api/sdk/init` | `{ key }` | `{ ok, project: { makerName, photoUrl, initial, productName, headline, message, amounts, defaultAmount, currency, momentEvent } }` and marks the SDK as seen. |
| `POST /api/sdk/moment` | `{ key, event, anonId, test }` | `{ show: bool, reason? }`. Logs `moment`, then `shown` or `skipped`. Applies the rules in 6.4. |
| `POST /api/sdk/track` | `{ key, type, anonId }` where type is `clicked` or `dismissed` | `{ ok }` |
| `POST /api/paypal/orders` | `{ key, amount, anonId }` | `{ orderId }`. Creates a PayPal order, see 7.3. |
| `POST /api/paypal/orders/:id/capture` | `{ key, anonId }` | `{ ok, payerName }`. Captures, saves donation, logs `paid`. |

Origin check on SDK routes: allow requests whose `Origin` host matches `projects.website`, plus `localhost` and the demo host domain when `is_test` or in development. Reject others with 403. Keep the allowlist simple for the hackathon.

---

## 6. The SDK

### 6.1 Install options (frame 3.1)

Script tag:

```html
<script src="https://fren-app.vercel.app/v1/fren.js" data-key="fk_test_xxx" defer></script>
<script>
  // right after the aha moment succeeds
  fren.moment('first_export')
</script>
```

npm:

```ts
import { Fren } from '@fren/sdk'
Fren.init({ key: 'fk_test_xxx' })
Fren.moment('first_export')
```

Agent prompt (shown in 3.1, key filled in):

```
Add Fren to this app.
1. Add the Fren script tag with data-key="fk_test_xxx" (or install @fren/sdk and call Fren.init).
2. Find where a user first exports or downloads a file.
3. Call fren.moment('first_export') right after it succeeds.
4. Show me the diff before committing.
```

### 6.2 Public API

```ts
fren.init({ key: string, apiBase?: string })   // auto-called by the script tag
fren.moment(eventName: string): void           // fire and forget, never throws
fren.test(): void                              // force the ask, ignores rules, logs is_test
```

Calling `moment()` before `init()` finishes must queue the call, not drop it.

Test mode: if the page URL has `?fren=test`, every `moment()` call shows the ask and logs `is_test = true`.

### 6.3 Widget (frames 4.2 and 4.4)

- Mount one host element at the end of `<body>`, attach a **Shadow DOM**, inject styles as a string. No global CSS.
- Position: fixed, bottom right, 28px from the edges, width 352px. On screens under 480px wide: bottom, full width minus 16px each side.
- Contents, top to bottom:
  1. Row: avatar (photo, or the first initial on a periwinkle circle when `photoUrl` is null) on the left, close button on the right.
  2. "Hey, I'm {makerName}" and "I build {productName} on my own".
  3. Headline (e.g. "Glad that export worked.").
  4. Message.
  5. Three amount pills, the default one selected.
  6. Primary button "Donate ${amount} with PayPal". Clicking it swaps the button area for the PayPal buttons (6.5).
  7. "Maybe later" link on the left, "powered by fren" on the right.
- Thank-you state (4.4): tick icon, "Thank you, {payerFirstName}.", "Your ${amount} went straight to {makerName}. We won't ask again for a while." Auto-hide after 8 seconds.
- Animate in: 200ms slide up and fade. Respect `prefers-reduced-motion`.
- Keyboard: focus moves to the toast when it opens, Escape closes it, tab order is logical. Buttons are real `<button>`s. `aria-live="polite"` region for the thank-you.
- Close or "Maybe later" logs `dismissed` and starts the cooldown.

### 6.4 When to show the ask (`lib/ask-rules.ts`)

For the hackathon, these rules only:

1. The event name must match `projects.moment_event`. Otherwise log `moment` only, no ask.
2. If this `anon_id` has a completed donation for this project, skip with `already_tipped`.
3. If this `anon_id` was shown the ask in the last 30 days, skip with `cooldown`.
4. Test mode overrides all of the above.

The SDK also stores `fren_last_shown` and `fren_tipped` in the end user's `localStorage` as a cheap first check before calling the server. Wrap every storage call in try/catch.

### 6.5 Paying (frame 4.3)

1. When the user clicks Donate, the widget loads the PayPal JS SDK once:
   `https://www.paypal.com/sdk/js?client-id={NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture`
2. Render `paypal.Buttons` into a container inside the toast. (The PayPal buttons render their own iframe, which is fine inside the Shadow DOM host. If it misbehaves, render the container in the light DOM next to the host element. Test this early, it is a known risk.)
3. `createOrder` calls `POST /api/paypal/orders` and returns the `orderId`.
4. `onApprove` calls `POST /api/paypal/orders/:id/capture`, then shows the thank-you state.
5. `onCancel` returns to the ask. `onError` shows "Something went wrong. Try again." and logs it.

### 6.6 Size and safety

- Target under 15 KB gzipped for `fren.js`, excluding the PayPal SDK.
- No dependencies in the SDK.
- Every public function is wrapped in try/catch and logs to `console.debug` only with `?fren=debug`.

---

## 7. Integrations

### 7.1 AI: write the ask (frame 2.6)

Called from `POST /api/ai/drafts`. Model `claude-sonnet-5-5`. Ask for JSON only.

System prompt:

```
You write short tip requests that indie developers show inside their product, right after a user gets value.
Rules:
- Write as the developer, first person, singular ("I", "me").
- 1 sentence, at most 90 characters.
- Mention the product by name once.
- Never guilt the user. Never say "please donate". No emoji. No exclamation marks unless the tone is playful.
- Do not invent facts about the product.
Return JSON only: {"drafts":[{"text":"..."},{"text":"..."},{"text":"..."}],"headline":"..."}
The headline is 3 to 6 words reacting to the moment, e.g. "Glad that export worked."
```

User message:

```
Product: {productName}
Website: {website}
Developer first name: {makerName}
The moment: {momentLabel}
Tone: {tone}   (warm = friendly and grateful, playful = light and a bit cheeky, straight = short and plain)
```

Handling:

- Parse with zod. If parsing fails, retry once. If it fails again, return 3 fallback drafts written from a template so the demo never breaks.
- Return the character count with each draft for the UI ("Warm · 74 characters").
- "Write new ones" calls the endpoint again.
- Timeout 15 seconds, show a skeleton while waiting.

### 7.2 AI: suggest a better moment (frame 5.1 card)

Called from `POST /api/ai/suggestion`. Build a small stats object first in code, then ask Claude to explain it. Claude does not do the maths.

Stats object (computed in `lib/metrics.ts`):

```json
{
  "product": "Inkwell",
  "currentMoment": { "event": "first_export", "shown": 412, "paid": 23, "rate": 0.056 },
  "otherMoments": [
    { "event": "second_export", "reached": 740, "laterTippedRate": 0.089 },
    { "event": "third_session", "reached": 1120, "laterTippedRate": 0.062 }
  ],
  "window": "last 30 days",
  "includesSampleData": true
}
```

`laterTippedRate` means: of the users who reached that event, what share tipped at any point after it. This needs the SDK to log every `moment()` call even when no ask is shown, which 6.4 rule 1 already does.

System prompt:

```
You help an indie developer decide when to ask users for a tip.
You get stats as JSON. Only use numbers from the JSON. Do not invent numbers.
If no other moment beats the current one by at least 20 percent, say the current moment is working and suggest nothing.
Return JSON only:
{"headline":"...","body":"...","actionLabel":"...","actionEvent":"..." or null}
headline: one plain sentence, under 60 characters.
body: one or two sentences, under 200 characters, mentioning the numbers.
actionLabel: 2 to 4 words, e.g. "Ask after 2nd export".
```

Render the result in the dark "Fren AI noticed" card. "Ask after 2nd export" calls apply. "Not now" calls dismiss.

### 7.3 PayPal: orders (server, `lib/paypal.ts`)

1. **Access token**: `POST {PAYPAL_API_BASE}/v1/oauth2/token` with basic auth (client id and secret) and `grant_type=client_credentials`. Cache until shortly before expiry.
2. **Create order**: `POST {PAYPAL_API_BASE}/v2/checkout/orders`

   ```json
   {
     "intent": "CAPTURE",
     "purchase_units": [{
       "reference_id": "<projectId>",
       "description": "Tip to Lebo for Inkwell",
       "amount": { "currency_code": "USD", "value": "5.00" },
       "payee": { "email_address": "<projects.paypal_email>" }
     }],
     "payment_source": { "paypal": { "experience_context": {
       "brand_name": "Fren for Inkwell",
       "shipping_preference": "NO_SHIPPING",
       "user_action": "PAY_NOW"
     } } }
   }
   ```

   The `payee` field sends the money to the developer's PayPal account instead of Fren's. PayPal documents this as "Pay another account". **Prove this works in sandbox on day 1** (build plan step 2). If it does not work for any reason, the fallback is to collect into Fren's sandbox business account and show "paid out to Lebo" in the UI. Say so honestly in the README.
3. Before creating, check that `amount` is one of `projects.amounts`. Reject anything else.
4. Save a `donations` row with `status = created`.
5. **Capture**: `POST {PAYPAL_API_BASE}/v2/checkout/orders/{id}/capture`. On `COMPLETED`, update the donation with the capture id, the amount from PayPal's response (not the client's), the payer's first name and last initial, and `status = completed`. Log a `paid` event.
6. Use a `PayPal-Request-Id` header (a uuid) on create and capture so retries do not double charge.

### 7.4 PayPal: connect (frames 1.2 and 1.3)

Plan A, if time allows: **Log in with PayPal** (OAuth, scopes `openid email`) using the same sandbox app. On callback, read the user's email from the userinfo endpoint and save it as `paypal_email`. This matches the "PayPal permission window" in the design.

Plan B, ship this first: a single input "Your PayPal email" with the note "Use your sandbox business account email". Show the connected state (1.3) once it is saved.

Build Plan B on day 2. Swap to Plan A only if everything else in the demo path works.

### 7.5 Auth

Auth.js with the GitHub provider only. "Continue with Google" on 1.1 can be hidden. On first sign in, create the user and an empty project, then redirect to `/onboarding/paypal`. If onboarding is finished, redirect to `/dashboard`.

---

## 8. Screens

Shared onboarding layout (from the canvas):

- Top bar: back button (round, periwinkle) on the left, "fren" logo in the middle, "Save and exit" pill on the right.
- A thin progress bar under the top bar for the 2.x steps.
- Left column (max 460px): eyebrow "Set up your ask · 3 of 6", big heading, helper text, the input, a primary pill button "Next" with an arrow.
- Right column: the periwinkle "Live preview" panel with a blank-blocks browser mock and the ask toast in the bottom right. The part that just changed has a dashed periwinkle outline.

Build the preview with the **same component** as the SDK widget's look (`components/ask-preview`), fed by the current answers. Missing answers render as grey skeleton bars.

| Frame | Route | What the user does | Saves |
|---|---|---|---|
| 1.1 | `/` | Continue with GitHub | user, empty project |
| 1.2 | `/onboarding/paypal` | Enter PayPal email (Plan B) or Connect (Plan A) | `paypal_email` |
| 1.3 | same | Sees connected state, Continue | |
| 2.1 to 2.2 | `/onboarding/ask/product` | Product name, website | `product_name`, `website` |
| 2.3, 2.3b | `/onboarding/ask/you` | Name, optional photo. No photo shows the initial. | `maker_name`, `photo_url` |
| 2.4, 2.4b | `/onboarding/ask/moment` | Pick a preset or a custom event. Custom: "What does the user do?" and an auto slug for the event name, editable. Shows the one line of code. | `moment_*` |
| 2.5 | `/onboarding/ask/tone` | Warm, Playful or Straight | `tone` |
| 2.6 | `/onboarding/ask/message` | Fren AI writes 3 drafts. Pick one, edit it, or "Write new ones". | `message`, `headline` |
| 2.7 | `/onboarding/ask/amounts` | $3/$5/$10, $5/$10/$20 | `amounts`, `default_amount` |
| 2.8 | `/onboarding/ask/review` | Review with Edit links | |
| 3.1 | `/onboarding/install` | Agent prompt, npm and snippet tabs with the key filled in. Copy buttons. | |
| 3.2 | `/onboarding/live` | Waits. Ticks: SDK loaded, event received, test ask shown. "See it" opens the demo host with `?fren=test`. | |
| 5.1 | `/dashboard` | Reads the overview | |

Preset moments for 2.4 (event names):

| Label | Event |
|---|---|
| First export or download | `first_export` |
| First project created | `first_project` |
| Third session | `third_session` |
| A custom event | developer's slug |

Slug rule for custom events: lowercase, spaces to underscores, only `a-z 0-9 _`, max 40 characters. No AI needed.

---

## 9. Overview (frame 5.1)

Sidebar: Overview (active), Your ask (links back to review), Install, Settings (can be a stub). "Live on {website}" status at the bottom with "Last event N min ago".

Header chips: "Includes sample traffic" (only when sample rows exist) and "{productName} · Live".

`GET /api/metrics/overview` returns:

```ts
{
  raisedCents: number,            // completed donations, last 30 days
  raisedChangePct: number | null, // vs the 30 days before
  tips: number,
  tipsLastMinute: number,
  conversion: number,             // paid / shown
  avgTipCents: number,
  mostPickedCents: number,
  raisedPerDay: { date: string, cents: number }[],   // 30 points
  funnel: { reached: number, shown: number, clicked: number, paid: number },
  recentTips: { name: string, note: string, cents: number, at: string, isNew: boolean }[], // 3 rows
  hasSampleData: boolean
}
```

`isNew` is true for donations from the last 10 minutes. The newest real tip gets the "New" chip and the highlighted row.

Refresh the overview every 5 seconds while the page is open, so the tip appears live in the demo.

Below the lists: the AI suggestion card (7.2). Generate it on page load if none exists from the last 10 minutes.

---

## 10. Design tokens

From the "Hackathon build" canvas. Use these exact values.

```css
:root {
  /* colour */
  --ink: #0E0F0C;           /* main text */
  --ink-2: #46474A;         /* secondary text */
  --ink-3: #9C9CA6;         /* hints, "powered by fren" */
  --brand: #A397FF;         /* periwinkle: primary buttons, selected states, avatar initial */
  --brand-hover: #9387F7;
  --brand-ink: #1C1255;     /* dark indigo: text on --brand, dark cards, chart lines */
  --surface: #ECE8FF;       /* periwinkle surfaces, panels, input wells */
  --surface-2: #F5F3FF;     /* lighter surface inside cards */
  --tint: #ECE9FF;          /* chips, focus ring */
  --line: #E1DCFF;          /* card borders */
  --input-line: #D9D3FF;
  --page: #FFFFFF;

  /* type */
  --font-display: 'Archivo', sans-serif;   /* weight 800, letter-spacing -0.02em */
  --font-body: 'Figtree', sans-serif;      /* 400 to 700 */
  --font-mono: 'JetBrains Mono', monospace;

  /* radius */
  --r-pill: 999px;
  --r-card: 20px;
  --r-panel: 24px;
  --r-input: 12px;
}
```

Type scale: page headings 40px Archivo 800, big numbers 32 to 52px Archivo 800, body 15 to 16px Figtree, labels 13.5px Figtree 500.

Buttons: primary pill is `--brand` background with `--brand-ink` text, 44 to 52px tall. Secondary pill is `--tint` with `--brand-ink` text. Disabled is `--surface` with grey text.

Focus ring: 2px `--brand-ink` outline plus 4px `--tint` halo.

The SDK widget uses the same tokens, hard-coded in its style string (it cannot read the host's CSS variables).

---

## 11. Sample data (seed script)

`pnpm db:seed` creates, for the demo developer's project:

- 30 days of `moment`, `shown`, `clicked` and `paid` events with `is_sample = true`, shaped so the funnel reads roughly 1,980 reached, 412 shown, 61 clicked, 23 paid.
- 23 sample donations totalling about $131, mostly $5.
- `moment` events for `second_export` (about 740 users) and `third_session` (about 1,120 users), with later tips weighted so second export comes out around 8.9 percent. This gives the AI suggestion something real to read.

The seed must be re-runnable: delete sample rows for the project, then insert. Never touch real rows.

---

## 12. Error states worth building

| Where | State | Copy |
|---|---|---|
| 2.6 | AI is slow | Skeleton cards, "Writing your message…" |
| 2.6 | AI failed twice | Show the fallback drafts, no error message |
| 3.2 | No event after 60s | "Still waiting. Check the script tag is on the page, or open your site with ?fren=test." |
| Widget | PayPal failed to load | "PayPal didn't load. Try again." with a retry button |
| Widget | Capture failed | "Payment didn't go through. You weren't charged." |
| 5.1 | No data yet | "No tips yet. Your first ask shows when a user hits {momentLabel}." |
