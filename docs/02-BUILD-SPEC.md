# Fren: build spec (hackathon build)

Screen numbers (e.g. `2.6`) match the "Hackathon build" page of the Fren Hi-fi canvas.

---

## 1. System overview

```
 Developer's browser                     End user's browser (on the developer's site)
 ┌──────────────────────┐               ┌────────────────────────────────────────────┐
 │ apps/web (Next.js)   │               │ Host product (apps/demo-host or real site) │
 │ sign up, onboarding, │               │  <script src=".../fren.js" data-key=...>   │
 │ install, dashboard   │               │  (no other code: SDK watches user actions) │
 └─────────┬────────────┘               │        │                                   │
           │                            │  Fren widget (Shadow DOM toast)            │
           │                            │  PayPal checkout window (approve link)     │
           │                            └────────┬───────────────────────────────────┘
           ▼                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ apps/web API routes                                                    │
 │  /api/onboarding/*   /api/ai/*   /api/sdk/*   /api/paypal/*            │
 └───────┬─────────────────────┬─────────────────────┬────────────────────┘
         ▼                     ▼                     ▼
   Postgres (Neon)      Anthropic API          PayPal REST (sandbox)
   via Drizzle          haiku 4.5: live check  Orders v2: create, capture
                        sonnet 5.5: setup, dash
```

**The core idea:** the developer only adds the script tag. The SDK records what the end user does (clicks, downloads, page changes, never typed text). After each meaningful action, the server asks Claude: "given how this developer described their aha moment, did this user just reach it?" If Claude says yes with enough confidence, and the user hasn't tipped or been asked recently, the toast shows. **Fren AI is the trigger.**

Three deployables:

| Package | What it is | Where it runs |
|---|---|---|
| `apps/web` | Dashboard, onboarding, all API routes, serves `fren.js` | Vercel, e.g. `fren-app.vercel.app` |
| `packages/sdk` | Browser SDK and widget, built to `fren.js` (IIFE) and ESM | Copied to `apps/web/public/v1/fren.js` at build |
| `apps/demo-host` | A tiny fake product with one aha action (Export) and a few ordinary buttons for the AI to ignore | Vercel, a separate domain, e.g. `fren-demo.vercel.app` |

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
│  │  │  ├─ ai.ts                             # judgeMoment, planMoment, writeDrafts, suggestMoment
│  │  │  ├─ metrics.ts                        # overview queries
│  │  │  ├─ ask-rules.ts                      # should we show the ask?
│  │  │  └─ keys.ts                           # public key generation
│  │  └─ scripts/seed.ts
│  └─ demo-host/
│     └─ index.html (or a small Next page)
└─ packages/
   └─ sdk/
      ├─ src/index.ts                         # init, moment, track, test mode
      ├─ src/signals.ts                       # watches clicks, downloads, submits, route changes
      ├─ src/widget.ts                        # Shadow DOM toast
      ├─ src/checkout.ts                      # open PayPal's checkout window, wait for the result
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
  moment_description text              // the developer's words: "When someone exports their first chapter as a PDF or ePub."
  moment_hints    jsonb                // Fren AI's plan, 3 short strings: ["A click on Export", "A PDF or ePub download", "The first time only"]
  ai_threshold    real default 0.75    // minimum confidence to show the ask
  tone            text                 // "warm" | "playful" | "straight"
  headline        text                 // "Glad that export worked."
  message         text                 // the chosen AI draft, editable
  amounts         jsonb                // [3, 5, 10], whole dollars
  default_amount  int                  // 5, the middle one
  currency        text default 'USD'
  paypal_email    text null            // the developer's sandbox business email
  paypal_payer_id text null            // if using Log in with PayPal
  onboarding_step text                 // where to resume
  first_event_at  timestamptz null     // set by the first signal, drives 3.2
  first_spotted_at timestamptz null    // set the first time Fren AI says yes, drives 3.2
  created_at      timestamptz default now()

events
  id          uuid pk
  project_id  uuid fk projects
  type        text   // "signal" | "judged" | "moment" | "shown" | "skipped" | "clicked" | "dismissed" | "paid"
  event_name  text   // signal: "click" | "download" | "submit" | "route" | "custom". judged: the AI's kind, e.g. "export"
  detail      text null  // signal: the label ("Export", "chapter-1.pdf", "/editor"). judged and shown: the AI's label ("Exported chapter-1.pdf")
  confidence  real null  // judged and shown: the AI's confidence, 0 to 1
  occurrence  int null   // judged: how many times this anon_id has done this kind, 1 for the first
  is_moment   bool null  // judged: the AI's verdict, for "Reached this moment before"
  session_id  text null  // random per page session
  anon_id     text   // random id stored in the end user's localStorage
  reason      text null  // for "skipped": "cooldown" | "already_tipped" | "rate_limited" | "ai_no" | "ai_timeout"
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
  trigger_label    text null       // copied from the "shown" event, e.g. "Exported chapter-1.pdf". Shown on the Overview.
  status           text            // "created" | "completed" | "failed"
  is_sample        boolean default false
  created_at       timestamptz default now()

ai_suggestions
  id          uuid pk
  project_id  uuid fk projects
  headline    text     // "People who export twice tip about 2x more often."
  body        text
  action_label text    // "Wait for the 2nd export"
  action_description text  // new moment_description to apply, e.g. "When someone exports a chapter for the second time."
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
| `POST /api/onboarding/paypal` | `{ email }` | Saves `paypal_email`. Basic email check. (Or the Log in with PayPal callback sets it, see 7.6.) |
| Server action `saveAnswers(step)` | the step's form | Saves answers step by step (zod per step). Moves `onboarding_step` forward, never back. "Save and exit" saves, signs out and goes to `/`. |
| `POST /api/project/photo` | multipart file | Uploads to Vercel Blob, saves `photo_url`. Optional. |
| `POST /api/ai/moment-plan` | `{ description }` | Calls Claude, returns `{ lookFor: string[], headline }` (7.2). Saves `moment_description`, `moment_hints` and `headline`. |
| `POST /api/ai/drafts` | none (reads project) | Calls Claude, returns 3 drafts (7.3). Does not save. |
| `GET /api/project/status` | none | `{ sdkSeen, signalsSeen, spottedAt, spottedLabel, spottedConfidence, testAskShown }` for 3.2. Poll every 2s. |

### 5.2 Dashboard (session required)

| Method and path | Does |
|---|---|
| `GET /api/metrics/overview?range=30d` | Returns everything 5.1 needs (section 9). |
| `POST /api/ai/suggestion` | Builds stats, calls Claude (7.4), saves and returns a suggestion. Cache for 10 minutes. |
| `POST /api/ai/suggestion/:id/apply` | Sets `moment_description` to the suggested one and regenerates `moment_hints` (7.2). |
| `POST /api/ai/suggestion/:id/dismiss` | Sets `dismissed_at`. |

### 5.3 SDK (public, CORS open, keyed by `public_key`)

| Method and path | Body | Returns |
|---|---|---|
| `POST /api/sdk/init` | `{ key }` | `{ ok, project: { makerName, photoUrl, initial, productName, headline, message, amounts, defaultAmount, currency } }` and marks the SDK as seen. |
| `POST /api/sdk/signals` | `{ key, anonId, sessionId, signals: Signal[], test }` | `{ show: bool, headline?, label?, reason? }`. **The main trigger.** Saves new signals, applies the rules in 6.5, calls the AI check (7.1). |
| `POST /api/sdk/moment` | `{ key, event, anonId, sessionId, test }` | `{ show: bool, reason? }`. Manual override: skips the AI check, applies rules 2 and 3 of 6.5. |
| `POST /api/sdk/track` | `{ key, type, anonId }` where type is `clicked` or `dismissed` | `{ ok }` |
| `POST /api/paypal/orders` | `{ key, amount, anonId }` | `{ orderId }`. Creates a PayPal order, see 7.5. |
| `POST /api/paypal/orders/:id/capture` | `{ key, anonId }` | `{ ok, payerName }`. Captures, saves donation, logs `paid`. |

Origin check on SDK routes: allow requests whose `Origin` host matches `projects.website`, plus `localhost` and the demo host domain when `is_test` or in development. Reject others with 403. Keep the allowlist simple for the hackathon.

---

## 6. The SDK

### 6.1 Install options (frame 3.1)

The script tag is the whole install. No moment code.

Script tag:

```html
<script src="https://fren-app.vercel.app/v1/fren.js" data-key="fk_test_xxx" defer></script>
```

npm:

```ts
import { Fren } from '@fren/sdk'
Fren.init({ key: 'fk_test_xxx' })
// that's it. Fren AI watches for the moment
```

Agent prompt (shown in 3.1, key filled in):

```
Add Fren to this app.
1. Add this tag before the closing body tag:
   <script src="https://fren-app.vercel.app/v1/fren.js" data-key="fk_test_xxx" defer></script>
2. Don't add any other Fren code.
3. Show me the diff before committing.
```

Under the tabs, one line: "Want full control? Call `fren.moment()` yourself and Fren skips the AI check."

### 6.2 Public API

```ts
fren.init({ key: string, apiBase?: string })   // auto-called by the script tag, starts watching
fren.track(name: string): void                 // optional: add a named signal the AI can see, e.g. 'chapter_published'
fren.moment(name: string): void                // optional manual override: skip the AI check
fren.test(): void                              // force the ask now, ignores rules and AI, logs is_test
```

All calls are fire and forget and never throw. Calls before `init()` finishes are queued, not dropped.

Test mode: if the page URL has `?fren=test`, the cooldown and already-tipped rules are off and events log `is_test = true`. **The AI still decides**, so the demo shows the real trigger. `fren.test()` is the escape hatch if the AI says no during recording.

### 6.3 Widget (frames 4.2 and 4.4)

- Mount one host element at the end of `<body>`, attach a **Shadow DOM**, inject styles as a string. No global CSS.
- Position: fixed, bottom right, 28px from the edges, width 352px. On screens under 480px wide: bottom, full width minus 16px each side.
- The widget shows the `headline` the AI check returned. If it's missing or fails validation, use `projects.headline`.
- Contents, top to bottom:
  1. Row: avatar (photo, or the first initial on a periwinkle circle when `photoUrl` is null) on the left, close button on the right.
  2. "Hey, I'm {makerName}" and "I build {productName} on my own".
  3. Headline (e.g. "Glad that export worked.").
  4. Message.
  5. Three amount pills, the default one selected.
  6. Primary button "Donate ${amount} with PayPal". Clicking it opens PayPal's checkout in a window (6.6), so paying is one click.
  7. "Maybe later" link on the left, "powered by fren" on the right.
- Thank-you state (4.4): tick icon, "Thank you, {payerFirstName}.", "Your ${amount} went straight to {makerName}. We won't ask again for a while." Auto-hide after 8 seconds.
- Animate in: 200ms slide up and fade. Respect `prefers-reduced-motion`.
- Keyboard: focus moves to the toast when it opens, Escape closes it, tab order is logical. Buttons are real `<button>`s. `aria-live="polite"` region for the thank-you.
- Close or "Maybe later" logs `dismissed` and starts the cooldown.

### 6.4 Signals: what the SDK watches (`src/signals.ts`)

One capture-phase listener on `document`, plus a small history patch. A signal is `{ type, label, path, at }`.

| Type | When | Label |
|---|---|---|
| `click` | A click on `button`, `a`, `[role=button]`, `input[type=submit]`, `input[type=button]` | `aria-label` or visible text, trimmed, max 60 chars |
| `download` | A click (real or programmatic) on `a[download]`, or a link to a `blob:` or `data:` URL | The file name, e.g. `chapter-1.pdf` |
| `submit` | A form submit | The form's `aria-label`, `name` or `id`, plus the submit button's text |
| `route` | `pushState`, `replaceState`, `popstate` | The path only, no query string or hash |
| `custom` | `fren.track(name)` | The name |

Never captured: anything typed, input values, page text, query strings, anything inside `input`, `textarea` or `[contenteditable]`, anything inside an element with `data-fren-ignore`. Clicks with no label are dropped.

Batching:
- Keep the last 20 signals in memory (and in `sessionStorage`, best effort, so a page change keeps the trail).
- After each signal, wait for more, then `POST /api/sdk/signals` with the last 20. Wait 1.5s after a click (it often starts something, like an export, that finishes a moment later) and 600ms after anything else.
- Don't send while the toast is open, after the ask was shown in this session, or when `localStorage` says tipped or in cooldown.
- `anonId` lives in `localStorage`. `sessionId` is new for each page load. Wrap every storage call in try/catch.

### 6.5 When to show the ask (`lib/ask-rules.ts`, then `lib/ai.ts`)

On every `POST /api/sdk/signals`, in this order. Stop at the first "skip".

1. Save the new signals as `signal` events. Set `first_event_at` if empty.
2. If this `anon_id` has a completed donation, skip with `already_tipped`. (Off in test mode.)
3. If this `anon_id` was shown the ask in the last 30 days, skip with `cooldown`. (Off in test mode.)
4. Rate limit per `sessionId`: at most one AI check every 3 seconds (counted from when a check starts) and 12 per session. Otherwise skip with `rate_limited` and **don't call the AI**.
5. Call the AI check (7.1) with a 4 second timeout. On timeout or bad JSON, skip with `ai_timeout`. Never show the ask on an error.
6. Log a `judged` event with the verdict, kind, label, confidence and occurrence.
7. If `isMoment` is true and `confidence >= projects.ai_threshold`, log `shown` (with the label and confidence) and return `{ show: true, headline, label }`. Set `first_spotted_at` if empty. Otherwise skip with `ai_no`.

`POST /api/sdk/moment` (manual) runs steps 2 and 3 only, then shows.

The SDK also stores `fren_last_shown` and `fren_tipped` in `localStorage` as a cheap first check before calling the server.

Cost and speed: only labelled actions are sent, never mouse moves or scrolls. Haiku answers in about a second. The rate limit caps a heavy user at 12 checks per session.

### 6.6 Paying (frame 4.3)

Our own Donate button opens PayPal's checkout page (Orders v2 approve link) in a window. No PayPal script is loaded into the host page. Changed on 1 Nov from PayPal JS SDK buttons, which forced a second click or PayPal's own colours.

1. Clicking Donate opens a window at once (inside the click, so it isn't blocked), then calls `POST /api/paypal/orders`. The server returns the `orderId` and PayPal's approve URL, and the window goes there. The button reads "Waiting for PayPal…".
2. PayPal sends the window back to `/paypal/done?token={orderId}` on the app (or `&cancelled=1`). That page captures on the server, sets the donation to `completed`, `failed` or `cancelled`, shows one line and closes the window.
3. The widget asks `POST /api/paypal/orders/:id/status` every 1.5 seconds (PayPal's page cuts the link between the windows). `completed` shows the thank-you, `cancelled` resets the button, `failed` shows "Payment didn't go through. You weren't charged."
4. A blocked window shows "Allow pop-ups to pay with PayPal." A failed order shows "PayPal didn't load. Try again." Clicking Donate again while waiting starts over.

### 6.7 Size and safety

- Target under 15 KB gzipped for `fren.js`, excluding the PayPal SDK.
- The listeners must be passive and cheap. Never block a click, never call `preventDefault`.
- No dependencies in the SDK.
- Every public function is wrapped in try/catch and logs to `console.debug` only with `?fren=debug`.

---

## 7. Integrations

### 7.1 AI: spot the moment (the trigger)

Called from `POST /api/sdk/signals` (step 5 of 6.5). Model `claude-haiku-4-5-20251001`, because it runs while the user waits. `max_tokens` 200. Structured output (`output_config.format`) for the JSON; the API no longer accepts `temperature`.

System prompt:

```
You decide if a user of a software product has just reached the moment the developer described as real value.
You get the developer's description, a short plan of what to look for, and the user's recent actions, oldest first. The last action is the newest.
Rules:
- Say yes only if the newest action completes the described moment. Starting something (opening an export menu) is not completing it.
- Prefer clear evidence: a download, a submit or a page change that matches the description.
- If the description says "first" and this user has reached the moment before, say no.
- When unsure, say no. Missing a moment is better than asking at the wrong time.
Return JSON only:
{"isMoment":true|false,"confidence":0.0-1.0,"kind":"..." or null,"label":"...","headline":"..."}
kind: a snake_case name of 1 to 3 words for the newest action if it is a meaningful product action (e.g. "export", "project_created"), otherwise null. Use the same kind for the same action every time.
label: 2 to 6 words saying what the user just did, e.g. "Exported chapter-1.pdf".
headline: 3 to 6 words reacting to it, in the given tone, e.g. "Glad that export worked." Empty if isMoment is false.
```

User message:

```
Product: {productName}
Moment: {momentDescription}
Look for: {momentHints joined with "; "}
Tone: {tone}
Reached this moment before: {yes|no}
Recent actions:
1. route /editor/chapter-1
2. click "Export"
3. click "PDF"
4. download chapter-1.pdf
```

"Reached this moment before" is yes when this `anon_id` already has a `judged` event with `is_moment` true.

Handling:

- Parse with zod. No retry (speed matters here). Bad JSON means no ask.
- `occurrence` = 1 plus the number of earlier `judged` events for this `anon_id` with the same `kind`. Save it on the `judged` event. The suggestion card (7.4) uses it.
- Validate `headline`: under 40 characters, no emoji. Otherwise use `projects.headline`.
- Log the confidence on every `judged` event so the threshold can be tuned later.

### 7.2 AI: plan the moment (frame 2.4)

Called from `POST /api/ai/moment-plan` when the developer stops typing in "Describe the moment" (800ms pause or blur). Model `claude-sonnet-5-5`. JSON only.

System prompt:

```
An indie developer describes the moment their users get real value from their product.
Turn it into a short plan of what a browser script could see when it happens: clicks, downloads, form submits, page changes.
Return JSON only: {"lookFor":["...","...","..."]}
Exactly 3 items, each under 45 characters, plain words, no code. The last item should say if it is the first time only or every time.
Also write a headline for the tip ask the user sees right after that moment: 3 to 6 words reacting to it, in the given tone, e.g. "Glad that export worked." No emoji.
```

The headline was added on 1 Nov so the preview changes at 2.4, as on the canvas. It is saved as `headline`; 2.6 can replace it. Structured output (`output_config.format`), effort low, server-side fallback on.

User message: `Product: {productName}\nWebsite: {website}\nTone: {tone, or warm}\nMoment: {description}`

Show the result in the "Fren AI will watch for" box (2.4). Save it as `moment_hints`. On failure, hide the box and save an empty list. The check in 7.1 still works with the description alone.

### 7.3 AI: write the ask (frame 2.6)

Called from `POST /api/ai/drafts`. Model `claude-sonnet-5-5`. Ask for JSON only.

System prompt:

```
You write short tip requests that indie developers show inside their product, right after a user gets value.
Rules:
- Write as the developer, first person, singular ("I", "me").
- 1 sentence. Aim for about 70 characters. Never go over 90.
- Mention the product by name once. Do not use the developer's name: the ask already shows it above your sentence.
- No semicolons.
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
The moment: {momentDescription}
Tone: {tone}   (warm = friendly and grateful, playful = light and a bit cheeky, straight = short and plain)
```

Handling:

- Parse with zod and check each draft against the rules. If a reply has fewer than 3 good drafts, retry once and keep the good ones. Templates fill any gap, so the demo never breaks.
- The headline written at 2.4 stays. The one written here is only used if the project has none (the plan failed).
- Coming back to 2.6 with a saved message: that message is the first card and stays picked, with 2 new drafts under it.
- Return the character count with each draft for the UI ("Warm · 74 characters").
- "Write new ones" calls the endpoint again.
- Timeout 15 seconds in all, for the first try and the retry together. Show a skeleton while waiting.

### 7.4 AI: suggest a better moment (frame 5.1 card)

Called from `POST /api/ai/suggestion`. Build a small stats object first in code, then ask Claude to explain it. Claude does not do the maths.

Stats object (computed in `lib/metrics.ts`):

```json
{
  "product": "Inkwell",
  "currentMoment": { "description": "When someone exports their first chapter as a PDF or ePub.", "shown": 412, "paid": 23, "rate": 0.056 },
  "otherMoments": [
    { "kind": "export", "occurrence": 2, "reached": 740, "laterTippedRate": 0.089 },
    { "kind": "project_created", "occurrence": 3, "reached": 1120, "laterTippedRate": 0.062 }
  ],
  "window": "last 30 days",
  "includesSampleData": true
}
```

`otherMoments` comes from `judged` events grouped by `kind` and `occurrence`. `laterTippedRate` means: of the users who reached that kind for that occurrence, what share tipped at any point after it. This works because 7.1 labels every meaningful action, even when it says no.

System prompt:

```
You help an indie developer decide when to ask users for a tip.
You get stats as JSON. Only use numbers from the JSON. Do not invent numbers.
If no other moment beats the current one by at least 20 percent, say the current moment is working and suggest nothing.
Return JSON only:
{"headline":"...","body":"...","actionLabel":"...","actionDescription":"..." or null}
headline: one plain sentence, under 60 characters.
body: one or two sentences, under 200 characters, mentioning the numbers.
actionLabel: 2 to 5 words, e.g. "Wait for the 2nd export".
actionDescription: the new moment description in the developer's style, e.g. "When someone exports a chapter for the second time."
```

Render the result in the dark "Fren AI noticed" card. The action button calls apply, which swaps the moment description and reruns 7.2. "Not now" calls dismiss.

### 7.5 PayPal: orders (server, `lib/paypal.ts`)

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

   The `payee` field sends the money to the developer's PayPal account instead of Fren's. PayPal documents this as "Pay another account". **Prove this works in sandbox on day 1** (build plan step 1.1). If it does not work for any reason, the fallback is to collect into Fren's sandbox business account and show "paid out to Lebo" in the UI. Say so honestly in the README.
3. Before creating, check that `amount` is one of `projects.amounts`. Reject anything else.
4. Save a `donations` row with `status = created`.
5. **Capture**: `POST {PAYPAL_API_BASE}/v2/checkout/orders/{id}/capture`. On `COMPLETED`, update the donation with the capture id, the amount from PayPal's response (not the client's), the payer's first name and last initial, and `status = completed`. Log a `paid` event.
6. Use a `PayPal-Request-Id` header (a uuid) on create and capture so retries do not double charge.

### 7.6 PayPal: connect (frames 1.2 and 1.3)

Plan A, if time allows: **Log in with PayPal** (OAuth, scopes `openid email`) using the same sandbox app. On callback, read the user's email from the userinfo endpoint and save it as `paypal_email`. This matches the "PayPal permission window" in the design.

Plan B, ship this first: a single input "Your PayPal email" with the note "Use your sandbox business account email". Show the connected state (1.3) once it is saved.

Build Plan B on day 2. Swap to Plan A only if everything else in the demo path works.

### 7.7 Auth

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
| 2.4b, 2.4 | `/onboarding/ask/moment` | 2.4b is the empty state: a text box "Describe the moment" and 3 starter chips that fill it. 2.4 is filled: Fren AI shows "Fren AI will watch for" with 3 items (7.2). Next is off until there's text. | `moment_description`, `moment_hints` |
| 2.5 | `/onboarding/ask/tone` | Warm, Playful or Straight | `tone` |
| 2.6 | `/onboarding/ask/message` | Fren AI writes 3 drafts. Pick one, edit it, or "Write new ones". | `message`, `headline` |
| 2.7 | `/onboarding/ask/amounts` | $3/$5/$10, $5/$10/$20 | `amounts`, `default_amount` |
| 2.8 | `/onboarding/ask/review` | Review with Edit links | |
| 3.1 | `/onboarding/install` | Agent prompt, npm and snippet tabs with the key filled in. Only the script tag, no moment code. Copy buttons. The "full control" line. | |
| 3.2 | `/onboarding/live` | Waits. Ticks: SDK loaded, watching user actions (with a count), Fren AI spotted the moment (label and confidence), test ask shown. "See it" opens the demo host with `?fren=test`. | |
| 5.1 | `/dashboard` | Reads the overview | |

Starter chips for 2.4b (they fill the text box, the developer can edit):

- "Exports or downloads a file" → "When someone exports or downloads their first file."
- "Creates their first project" → "When someone creates their first project."
- "Finishes a task" → "When someone finishes their first task."

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
  funnel: { spotted: number, shown: number, clicked: number, paid: number },   // spotted = judged yes
  recentTips: { name: string, note: string, cents: number, at: string, isNew: boolean }[], // 3 rows. note = "Fren AI asked after: {trigger_label}"
  hasSampleData: boolean
}
```

`isNew` is true for donations from the last 10 minutes. The newest real tip gets the "New" chip and the highlighted row.

Refresh the overview every 5 seconds while the page is open, so the tip appears live in the demo.

Funnel row labels: "Fren AI spotted the moment", "Saw the ask", "Tapped donate", "Paid". Note under it: "Not every spotted moment shows an ask. Fren skips users who already tipped or saw it recently."

Below the lists: the AI suggestion card (7.4). Generate it on page load if none exists from the last 10 minutes.

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

- 30 days of `judged`, `shown`, `clicked` and `paid` events with `is_sample = true`, shaped so the funnel reads roughly 1,980 spotted, 412 shown, 61 clicked, 23 paid. Shown events carry labels like "Exported chapter-3.pdf".
- 23 sample donations totalling about $131, mostly $5, each with a `trigger_label`.
- `judged` events with kind `export` occurrence 2 (about 740 users) and kind `project_created` occurrence 3 (about 1,120 users), with later tips weighted so the second export comes out around 8.9 percent. This gives the AI suggestion something real to read.
- No `signal` rows. They aren't needed for the numbers.

The seed must be re-runnable: delete sample rows for the project, then insert. Never touch real rows.

---

## 12. Error states worth building

| Where | State | Copy |
|---|---|---|
| 2.4 | Plan failed | Hide the "Fren AI will watch for" box. No error message. |
| 2.6 | AI is slow | Skeleton cards, "Writing your message…" |
| 2.6 | AI failed twice | Show the fallback drafts, no error message |
| 3.2 | No signals after 60s | "Still waiting. Check the script tag is on the page, then click around your site." |
| 3.2 | Signals but no moment after 60s | "Fren AI hasn't spotted the moment yet. Try doing it on your site, or open it with ?fren=test." |
| Widget | AI check slow or failed | Nothing shows. The user never sees an error. |
| Widget | PayPal failed to load | "PayPal didn't load. Try again." with a retry button |
| Widget | Capture failed | "Payment didn't go through. You weren't charged." |
| 5.1 | No data yet | "No tips yet. Fren AI is watching for: {momentDescription}" |
