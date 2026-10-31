# Fren: build plan

Deadline: **Thu 12 Nov 2026, 12:00 PST = 22:00 SAST**. Aim to submit on **Wed 11 Nov** and keep the last day as a buffer.

The order is built around risk. The riskiest part (PayPal paying the developer's account from inside a widget on someone else's site) gets proven first. Every step ends with a "done when" check. Do not start the next step until the check passes.

---

## Phase 0: accounts and setup (Sat 31 Oct to Sun 1 Nov)

### Step 0.1 Accounts and keys
- PayPal Developer: create the **Fren** sandbox REST app. Copy the client id and secret.
- PayPal sandbox: create a **Business** account (the developer, Lebo) and a **Personal** account with balance (the end user, Mpho). Note both logins.
- Anthropic: API key with access to `claude-sonnet-5-5`.
- Neon: a Postgres database.
- GitHub: a new **public** repo `fren` with an **MIT licence**. Set the licence so it shows in the About section (a submission requirement).
- GitHub OAuth app for Auth.js (callback `http://localhost:3000/api/auth/callback/github`, add the Vercel URL later).
- Vercel: two projects from the same repo, `apps/web` and `apps/demo-host`.

**Done when:** every value in `.env.example` has a real value in your local `.env`.

### Step 0.2 Scaffold
- pnpm workspace with `apps/web`, `apps/demo-host`, `packages/sdk`.
- Next.js App Router in `apps/web`, TypeScript strict, Tailwind or CSS modules (pick one and stick to it).
- Fonts: Archivo, Figtree, JetBrains Mono via `next/font`.
- Design tokens from spec section 10 in a global stylesheet.
- Drizzle set up with the schema from spec section 4. `pnpm db:push`.
- Auth.js with GitHub. Signing in creates a user and an empty project.
- Deploy both apps to Vercel.

**Done when:** you can sign in with GitHub on the deployed URL and see a blank `/onboarding/paypal` page. The project row exists in the database with a `public_key`.

---

## Phase 1: prove the money path (Mon 2 Nov)

This is the most important day. Everything else depends on it.

### Step 1.1 PayPal spike, server only
- Write `lib/paypal.ts`: token, create order with `payee.email_address`, capture.
- A throwaway script or route that creates a $5 order with the Business account as payee and prints the approval link.
- Open the link, log in as the Personal account, approve. Capture from the script.

**Done when:** the $5 shows up in the **Business** account's sandbox activity, not in Fren's app account. If it lands in the wrong account, stop and switch to the fallback in spec 7.3 before going further.

### Step 1.2 PayPal buttons on a different site
- In `apps/demo-host`, load the PayPal JS SDK with the Fren client id and render `paypal.Buttons` inside a Shadow DOM host element. Wire `createOrder` and `onApprove` to the deployed `apps/web` routes `/api/paypal/orders` and `/capture`.
- Handle CORS on those routes.

**Done when:** from the **deployed** demo host, you can click the PayPal button, pay as Mpho in the popup, and see a `completed` donation row in the database. If the buttons will not render inside the Shadow DOM, move their container into the light DOM next to the widget and note it in the README.

---

## Phase 2: the SDK and the ask (Tue 3 Nov to Wed 4 Nov)

### Step 2.1 SDK core
- `packages/sdk`: `init`, `moment`, `test`, call queue before init, `?fren=test` and `?fren=debug`.
- `anonId` in localStorage (wrapped in try/catch).
- tsup builds `fren.js` (IIFE, reads `data-key` from its own script tag) and the ESM build. A build step copies `fren.js` to `apps/web/public/v1/fren.js`.
- SDK routes: `/api/sdk/init`, `/api/sdk/moment`, `/api/sdk/track`, with the origin check.
- `lib/ask-rules.ts` with the four rules from spec 6.4.

**Done when:** the demo host loads `fren.js` from the deployed web app, calling `fren.moment('first_export')` creates a `moment` and a `shown` event, and calling it again within 30 days creates a `skipped` event with reason `cooldown`.

### Step 2.2 Widget
- Shadow DOM toast exactly as spec 6.3 and frame 4.2: avatar or initial, name and byline, headline, message, three amount pills, the Donate button, "Maybe later", "powered by fren".
- Donate swaps in the PayPal buttons from step 1.2.
- Thank-you state (frame 4.4).
- Mobile layout under 480px. Keyboard and screen reader basics.

**Done when:** on the deployed demo host, clicking the aha button shows the toast, a sandbox payment completes, the thank-you shows, and the donation row is `completed`. Test in Chrome and Safari, and at phone width.

### Step 2.3 Demo host
- One page with a header, some blank-block content and one clear action (for example an "Export" button) that fires `fren.moment('first_export')` after a fake 1 second "export".
- A small dark pill that briefly shows "fren.moment('first_export') fired" for the video (frame 4.1). Hide it with `?clean`.

**Done when:** a stranger can open the demo host URL, click Export, see the ask and pay with the sandbox Personal account.

---

## Phase 3: onboarding (Thu 5 Nov to Sat 7 Nov)

### Step 3.1 Sign up and PayPal connect (1.1 to 1.3)
- Sign up page with "Continue with GitHub".
- PayPal step with **Plan B** (email input), and the connected state.

**Done when:** a new GitHub account can sign up and land on the 2.1 step with `paypal_email` saved.

### Step 3.2 Shared onboarding layout and live preview
- `QuestionLayout` (top bar, progress, left column, right preview panel).
- `AskPreview` component that renders the toast from partial answers, with grey skeletons for anything missing and a dashed outline on the part that just changed.

**Done when:** a dev-only page shows the preview at every step state from the canvas (2.1 empty through 2.8 full).

### Step 3.3 Questions 2.1 to 2.5 and 2.7
- Product and website, you (name and optional photo, initial fallback), moment (presets and custom with the slug rule and the code line), tone, amounts.
- Save on Next with `PATCH /api/project`. Back keeps answers. Refresh resumes at `onboarding_step`.

**Done when:** you can go through every step, refresh in the middle, and come back to the same place with answers kept.

### Step 3.4 AI message (2.6)
- `lib/ai.ts` `writeDrafts` with the prompt from spec 7.1, zod parsing, one retry, template fallback.
- Draft cards with character counts, pick one, edit inline, "Write new ones".

**Done when:** three different products with three tones each give sensible drafts under 90 characters, and turning off the API key still shows the fallback drafts without an error.

### Step 3.5 Review (2.8)
- Summary rows with Edit links that jump back to the right step.

**Done when:** editing from review and coming back shows the change in the preview.

---

## Phase 4: install and go live (Sun 8 Nov)

### Step 4.1 Install (3.1)
- Three tabs: agent prompt, npm, snippet. Key and event name filled in from the project. Copy buttons.

**Done when:** pasting the snippet into a plain HTML file on any static host makes the ask appear with `?fren=test`.

### Step 4.2 Live check (3.2)
- Poll `/api/project/status` every 2 seconds. Tick "SDK loaded", "event received", "test ask shown" as they happen. "See it" opens the demo host with `?fren=test`. The 60 second hint from spec section 12.

**Done when:** with the install page open in one tab and the demo host in another, the ticks turn on within a few seconds of each action.

---

## Phase 5: dashboard and the second AI feature (Mon 9 Nov to Tue 10 Nov)

### Step 5.1 Seed data
- `scripts/seed.ts` as spec section 11. Re-runnable, sample rows only.

**Done when:** `pnpm db:seed` twice in a row gives the same numbers, and real donations are untouched.

### Step 5.2 Overview (5.1)
- `lib/metrics.ts` and `GET /api/metrics/overview`.
- Raised headline with the change chip, three stat panels, raised per day chart, funnel, recent tips with the "New" row, sidebar, "Includes sample traffic" chip.
- Poll every 5 seconds.

**Done when:** you make a sandbox payment on the demo host and it appears at the top of recent tips, marked New, within 10 seconds, and the totals go up.

### Step 5.3 Fren AI suggestion
- Stats builder, prompt from spec 7.2, the dark suggestion card, apply and dismiss.

**Done when:** with seeded data the card suggests the second export with real numbers from the stats. Clicking apply changes `moment_event`. With the current moment best, the card says it is working and offers no action.

---

## Phase 6: polish, record, submit (Tue 10 Nov to Wed 11 Nov)

### Step 6.1 Polish pass
- Walk the full demo path on the deployed apps. Fix anything that looks off against the canvas.
- Empty and error states from spec section 12.
- Page titles, favicon, Open Graph image.
- Optional, only if everything works: Log in with PayPal (spec 7.4 Plan A).

### Step 6.2 README
Must include:
- One paragraph on what Fren is and the problem.
- Live links: dashboard, demo host.
- How to try it as a judge: demo host URL, sandbox Personal login to pay with, where to see the result.
- Setup: prerequisites, env vars, `pnpm i`, `pnpm db:push`, `pnpm db:seed`, `pnpm dev`.
- **AI used and how**: Claude `claude-sonnet-5-5` for writing the ask and for the moment suggestion.
- **PayPal used and how**: Orders v2 create and capture, JS SDK buttons, payee routing, sandbox only.
- Known limits: sandbox only, one project per account, sample traffic is labelled.

### Step 6.3 Demo video (under 3 minutes)
- Follow the script in the product brief.
- Record at 1080p. No copyrighted music, no third-party logos beyond PayPal's own checkout.
- Upload to YouTube as **public**.

### Step 6.4 Submit on Devpost
- Text description, features, AI tools used, repo link, demo URL, YouTube link.
- Check the repo is public and the licence shows in About.

**Done when:** the submission is in on Wednesday 11 Nov. Thursday is buffer only.

---

## Daily checklist

At the end of each day:
1. The deployed demo path still works end to end (demo host to payment to dashboard once Phase 5 exists).
2. Commit and push.
3. Note anything cut in the README "Known limits" section.

## If you fall behind

Cut in this order, last cut first:
1. Log in with PayPal (keep the email input).
2. Photo upload (initials only).
3. Custom events (presets only).
4. npm and agent prompt tabs (snippet only).
5. The AI suggestion card (keep the AI message, it is the stronger AI story).

Never cut: the PayPal payment, the toast, the AI message step, the Overview showing the new tip.

## Risks

| Risk | What to do |
|---|---|
| `payee` routing does not work in sandbox | Found on day 1 in step 1.1. Fall back to collecting in Fren's account and say so. |
| PayPal buttons fail inside Shadow DOM | Render their container in the light DOM next to the widget. |
| Sandbox is slow during recording | Record the payment several times and keep the best take. |
| Claude returns bad JSON | zod plus one retry plus the template fallback. |
| CORS or origin check blocks the demo host | Allow the demo host domain explicitly in the allowlist. |
