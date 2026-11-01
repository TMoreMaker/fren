# Fren: instructions for Claude Code

Fren is a hackathon entry for the PayPal AI Hackathon (Devpost). Deadline: **12 Nov 2026, 12:00 PST (22:00 SAST)**.

Fren is a drop-in SDK for indie products. The developer describes their product's "aha moment" in plain words and adds one script tag. The SDK watches what users do, and **Fren AI (Claude) decides live when a user has reached that moment**. Then Fren shows a small tip ask. The user tips through PayPal and the money goes straight to the developer's PayPal account.

The AI trigger is the heart of the entry. Read spec sections 6.4, 6.5 and 7.1 before touching the SDK.

## Read these first

- `docs/01-PRODUCT-BRIEF.md`: what we are building, the demo story, what is out of scope.
- `docs/02-BUILD-SPEC.md`: architecture, data model, API, SDK, PayPal flow, AI prompts, screens, design tokens.
- `docs/03-BUILD-PLAN.md`: ordered steps with a "done when" check for each. Work through it in order.
- `docs/04-DESIGN-NOTES.md`: where a frame and the docs disagree and what we build, plus the extra tokens taken from the canvas.

Design reference: the "Hackathon build" page of the Fren Hi-fi canvas (Claude Design): https://claude.ai/artifact/PPUh4TJEQ2honEXztz5vtu. Frame numbers in the docs (e.g. `2.6`) refer to that page. Ignore the "Explorations" page.

## Hard rules

1. **Build the UI from the canvas, exactly.** Match the layout, copy, spacing, colours and states of each frame. Do not invent screens, components or styles. If a screen or state you need is not on the canvas, stop and ask.
2. **Fren AI is the trigger.** Never replace the AI check with a hard-coded event. `fren.moment()` is only a manual override.
3. **Scope is the hackathon build only.** One developer, one product, one aha moment, toast style only. If something is not in the brief, do not build it. Ask first.
4. **Everything PayPal runs in sandbox.** Never use live credentials.
5. **Money is checked on the server.** The amount captured must match an amount the project allows. Never trust the client.
6. **The SDK must not break the host site, and it never reads what users type.** Render inside a Shadow DOM, catch every error, never throw into the host page, no global CSS, passive listeners only.
7. **Sample data is always labelled.** Seeded rows have `is_sample = true` and the UI says "Includes sample traffic".
8. **Secrets live in env vars only.** Never commit `.env*`. Keep `.env.example` up to date.

## Stack

- pnpm workspace, TypeScript everywhere, strict mode.
- `apps/web`: Next.js (App Router) for the dashboard, onboarding and API routes. Deployed on Vercel.
- `packages/sdk`: the browser SDK. Built with tsup into an ESM build and an IIFE build (`fren.js`) for the script tag.
- `apps/demo-host`: a tiny stand-in "product" used to demo the install. One page, one button that triggers the aha moment.
- Database: Postgres (Neon) with Drizzle ORM.
- Auth: Auth.js with GitHub.
- AI: Anthropic API via `@anthropic-ai/sdk`. `claude-haiku-4-5-20251001` for the live moment check (speed). `claude-sonnet-5-5` for the watch plan, the ask drafts and the dashboard suggestion.
- Payments: PayPal Orders v2 REST API (server) and PayPal JS SDK buttons (in the widget).

## Conventions

- Validate every API input with zod.
- Keep API handlers thin: logic goes in `apps/web/lib/`.
- Use the design tokens in `docs/02-BUILD-SPEC.md` section 10, plus the extra tokens in `docs/04-DESIGN-NOTES.md`. No other new colours or fonts.
- Write UI copy in plain, short sentences. No emoji.
- After each step in the build plan, run the "done when" check before moving on.

## Commands

One `.env` at the repo root, read by every app.

```
pnpm dev            # web on :3000 + demo-host on :3001 + sdk watch
pnpm typecheck      # all packages
pnpm build          # sdk, then web and demo-host
pnpm db:push        # push Drizzle schema
pnpm db:seed        # seed sample traffic for the demo project
pnpm sdk:build      # build fren.js, copied to apps/web/public/v1/fren.js
```

Styling: plain CSS with the tokens in `apps/web/app/globals.css` (CSS modules per component). No Tailwind.
