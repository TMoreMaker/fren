# Fren: build plan

Deadline: **Thu 12 Nov 2026, 12:00 PST = 22:00 SAST**. Aim to submit on **Wed 11 Nov** and keep the last day as a buffer.

The order is built around risk. The riskiest part (PayPal paying the developer's account from inside a widget on someone else's site) gets proven first. Every step ends with a "done when" check. Do not start the next step until the check passes.

---

## Phase 0: accounts and setup (Sat 31 Oct to Sun 1 Nov)

### Step 0.1 Accounts and keys
- PayPal Developer: create the **Fren** sandbox REST app. Copy the client id and secret.
- PayPal sandbox: create a **Business** account (the developer, Lebo) and a **Personal** account with balance (the end user, Mpho). Note both logins.
- Anthropic: API key with access to `claude-sonnet-5-5` and `claude-haiku-4-5-20251001`.
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

**Done when:** the $5 shows up in the **Business** account's sandbox activity, not in Fren's app account. If it lands in the wrong account, stop and switch to the fallback in spec 7.5 before going further.

### Step 1.2 PayPal buttons on a different site
- In `apps/demo-host`, load the PayPal JS SDK with the Fren client id and render `paypal.Buttons` inside a Shadow DOM host element. Wire `createOrder` and `onApprove` to the deployed `apps/web` routes `/api/paypal/orders` and `/capture`.
- Handle CORS on those routes.

**Done when:** from the **deployed** demo host, you can click the PayPal button, pay as Mpho in the popup, and see a `completed` donation row in the database. If the buttons will not render inside the Shadow DOM, move their container into the light DOM next to the widget and note it in the README.

---

## Phase 2: the SDK, the AI trigger and the ask (Tue 3 Nov to Thu 5 Nov)

This phase holds the heart of the entry: Fren AI deciding when to ask. Give it the time.

### Step 2.1 SDK core and signals
- `packages/sdk`: `init`, `track`, `moment`, `test`, call queue before init, `?fren=test` and `?fren=debug`.
- `src/signals.ts` exactly as spec 6.4: clicks with labels, downloads, submits, route changes, `fren.track`. Never typed text.
- `anonId` in localStorage, `sessionId` per page load (wrapped in try/catch).
- tsup builds `fren.js` (IIFE, reads `data-key` from its own script tag) and the ESM build. A build step copies `fren.js` to `apps/web/public/v1/fren.js`.
- SDK routes: `/api/sdk/init`, `/api/sdk/signals`, `/api/sdk/moment`, `/api/sdk/track`, with the origin check.
- `lib/ask-rules.ts` with steps 2 to 4 of spec 6.5. Stub the AI check to always say no for now.

**Done when:** the demo host loads `fren.js` from the deployed web app, clicking around saves `signal` rows with sensible labels, typing in an input saves nothing, and `fren.moment('x')` twice in a row gives `shown` then `skipped` with reason `cooldown`.

### Step 2.2 The AI trigger
- `lib/ai.ts` `judgeMoment` with the prompt from spec 7.1 (Haiku 4.5, temperature 0, 4 second timeout, zod, no retry).
- Steps 5 to 7 of spec 6.5: log `judged` with kind, label, confidence and occurrence, then show or skip.
- For now, hard-code the Inkwell moment description and hints in the seed, so this can be tested before onboarding exists.
- With `?fren=debug`, log each verdict to the console.

**Done when**, on the deployed demo host with `?fren=test`, over 10 fresh sessions:
- Clicking the ordinary buttons never shows the ask.
- Exporting a file shows the ask at least 9 times out of 10.
- A second export in the same session says no (the description says "first").
- The ask appears within about 2 seconds of the export.
- Write the results in the README. If accuracy is poor, tighten the prompt, then the threshold, before moving on.

### Step 2.3 Widget
- Shadow DOM toast exactly as spec 6.3 and frame 4.2: avatar or initial, name and byline, the AI headline, message, three amount pills, the Donate button, "Maybe later", "powered by fren".
- Donate swaps in the PayPal buttons from step 1.2.
- Thank-you state (frame 4.4).
- Mobile layout under 480px. Keyboard and screen reader basics.

**Done when:** on the deployed demo host, exporting shows the toast (triggered by the AI), a sandbox payment completes, the thank-you shows, and the donation row is `completed` with a `trigger_label`. Test in Chrome and Safari, and at phone width.

### Step 2.4 Demo host
- One page that looks like frame 4.1: sidebar, header, blank-block content.
- A few ordinary buttons (for example "New chapter", "Rename", "Settings") that do nothing much. They give the AI something to ignore.
- One clear action, an "Export" button. After a fake 1 second "export", it downloads a real small file (`chapter-1.pdf`) through a `blob:` link with the `download` attribute, so the SDK sees a `download` signal.
- **No Fren code except the script tag.** That's the point of the demo.
- A small dark pill that briefly shows the AI verdict for the video, e.g. "Fren AI: first export spotted, 92% sure" (frame 4.1). Show it with `?fren=debug`, using the label and confidence from the `/api/sdk/signals` response.

**Done when:** a stranger can open the demo host URL, click around without seeing an ask, click Export, see the ask and pay with the sandbox Personal account.

---

## Phase 3: onboarding (Fri 6 Nov to Sat 7 Nov)

### Step 3.1 Sign up and PayPal connect (1.1 to 1.3)
- Sign up page with "Continue with GitHub".
- PayPal step with **Plan B** (email input), and the connected state.

**Done when:** a new GitHub account can sign up and land on the 2.1 step with `paypal_email` saved.

### Step 3.2 Shared onboarding layout and live preview
- `QuestionLayout` (top bar, progress, left column, right preview panel).
- `AskPreview` component that renders the toast from partial answers, with grey skeletons for anything missing and a dashed outline on the part that just changed.

**Done when:** a dev-only page shows the preview at every step state from the canvas (2.1 empty through 2.8 full).

### Step 3.3 Questions 2.1 to 2.5 and 2.7
- Product and website, you (name and optional photo, initial fallback), moment, tone, amounts.
- Moment (2.4b, 2.4): the "Describe the moment" text box with the 3 starter chips. On pause or blur, call `POST /api/ai/moment-plan` (spec 7.2) and show the "Fren AI will watch for" box. Replace the hard-coded description from step 2.2 with the saved one.
- Save on Next with `PATCH /api/project`. Back keeps answers. Refresh resumes at `onboarding_step`.

**Done when:** you can go through every step, refresh in the middle, and come back to the same place with answers kept. Three different moment descriptions each give a sensible 3-item plan.

### Step 3.4 AI message (2.6)
- `lib/ai.ts` `writeDrafts` with the prompt from spec 7.3, zod parsing, one retry, template fallback.
- Draft cards with character counts, pick one, edit inline, "Write new ones".

**Done when:** three different products with three tones each give sensible drafts under 90 characters, and turning off the API key still shows the fallback drafts without an error.

### Step 3.5 Review (2.8)
- Summary rows with Edit links that jump back to the right step.

**Done when:** editing from review and coming back shows the change in the preview.

---

## Phase 4: install and go live (Sun 8 Nov)

### Step 4.1 Install (3.1)
- Three tabs: agent prompt, npm, snippet. Key filled in from the project. Script tag only, no moment code. Copy buttons. The "full control" line under the tabs.

**Done when:** pasting the snippet into a plain HTML file with an export-style download on any static host makes the ask appear after the download, with `?fren=test`.

### Step 4.2 Live check (3.2)
- Poll `/api/project/status` every 2 seconds. Tick "SDK loaded", "Watching user actions" (with the count), "Fren AI spotted the moment" (label and confidence), "Test ask shown" as they happen. "See it" opens the demo host with `?fren=test`. The 60 second hints from spec section 12.

**Done when:** with the install page open in one tab and the demo host in another, the ticks turn on within a few seconds of each action.

---

## Phase 5: dashboard and the second AI feature (Mon 9 Nov to Tue 10 Nov)

### Step 5.1 Seed data
- `scripts/seed.ts` as spec section 11. Re-runnable, sample rows only.

**Done when:** `pnpm db:seed` twice in a row gives the same numbers, and real donations are untouched.

### Step 5.2 Overview (5.1)
- `lib/metrics.ts` and `GET /api/metrics/overview`.
- Raised headline with the change chip, three stat panels, raised per day chart, funnel (starting at "Fren AI spotted the moment"), recent tips with the "New" row and "Fren AI asked after: …", sidebar, "Includes sample traffic" chip.
- Poll every 5 seconds.

**Done when:** you make a sandbox payment on the demo host and it appears at the top of recent tips, marked New, within 10 seconds, and the totals go up.

### Step 5.3 Fren AI suggestion
- Stats builder (grouped by `kind` and `occurrence`), prompt from spec 7.4, the dark suggestion card, apply and dismiss.

**Done when:** with seeded data the card suggests waiting for the second export, with real numbers from the stats. Clicking apply changes `moment_description` and the plan. With the current moment best, the card says it is working and offers no action.

---

## Phase 6: polish, record, submit (Tue 10 Nov to Wed 11 Nov)

### Step 6.1 Polish pass
- Walk the full demo path on the deployed apps. Fix anything that looks off against the canvas.
- Empty and error states from spec section 12.
- Page titles, favicon, Open Graph image.
- Optional, only if everything works: Log in with PayPal (spec 7.6 Plan A).

### Step 6.2 README
Must include:
- One paragraph on what Fren is and the problem.
- Live links: dashboard, demo host.
- How to try it as a judge: demo host URL, sandbox Personal login to pay with, where to see the result.
- Setup: prerequisites, env vars, `pnpm i`, `pnpm db:push`, `pnpm db:seed`, `pnpm dev`.
- **AI used and how**: Claude Haiku 4.5 decides live when a user has reached the aha moment, which triggers the PayPal ask. Claude Sonnet 5.5 turns the developer's description into a watch plan, writes the ask, and suggests a better moment. Include the accuracy results from step 2.2.
- **Privacy**: what the SDK sees (labelled clicks, downloads, page paths) and what it never sees (typed text, page content).
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
1. The deployed demo path still works end to end (click around, export, AI shows the ask, payment, dashboard once Phase 5 exists).
2. Commit and push.
3. Note anything cut in the README "Known limits" section.

## If you fall behind

Cut in this order, last cut first:
1. Log in with PayPal (keep the email input).
2. Photo upload (initials only).
3. npm and agent prompt tabs (snippet only).
4. The AI suggestion card.
5. The "Fren AI will watch for" box on 2.4 (keep the text box, the AI check works from the description alone).

Never cut: the AI trigger, the PayPal payment, the toast, the AI message step, the Overview showing the new tip.

## If there's time (one feature, after everything above)

Not in scope until the user says so. Pick at most one, and only once Phase 6 is safe.

- **Animated thank-you card** (raised 1 Nov). After a tip, the thank-you (frame 4.4) becomes a personal card that opens with a short animation and shows a thank-you note from the founder, with a hand-written feel. Needs a design on the canvas first.

## Risks

| Risk | What to do |
|---|---|
| `payee` routing does not work in sandbox | Found on day 1 in step 1.1. Fall back to collecting in Fren's account and say so. |
| PayPal buttons fail inside Shadow DOM | Render their container in the light DOM next to the widget. |
| Sandbox is slow during recording | Record the payment several times and keep the best take. |
| Claude returns bad JSON | Drafts: zod plus one retry plus the template fallback. Trigger: no ask, never an error. |
| The AI trigger misses the moment or fires too early | Tighten the prompt first, then the threshold. Keep `fren.test()` ready as the escape hatch while recording. |
| The AI check is slow | Haiku, 4 second timeout, signals only after labelled actions. If the ask lands late, it is still after the moment, which is fine. |
| Cost runs away | Rate limit of 1 check per 3 seconds and 12 per session (spec 6.5). |
| CORS or origin check blocks the demo host | Allow the demo host domain explicitly in the allowlist. |
