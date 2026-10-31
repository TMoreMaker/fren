# Fren: instructions for Claude Code

Fren is a hackathon entry for the PayPal AI Hackathon (Devpost). Deadline: **12 Nov 2026, 12:00 PST (22:00 SAST)**.

Fren is a drop-in SDK for indie products. The developer adds one script and one line of code. When a user hits the product's "aha moment", Fren shows a small tip ask. The user tips through PayPal and the money goes straight to the developer's PayPal account.

## Read these first

- `docs/01-PRODUCT-BRIEF.md`: what we are building, the demo story, what is out of scope.
- `docs/02-BUILD-SPEC.md`: architecture, data model, API, SDK, PayPal flow, AI prompts, screens, design tokens.
- `docs/03-BUILD-PLAN.md`: ordered steps with a "done when" check for each. Work through it in order.
- `docs/04-DESIGN-NOTES.md`: how the design and the docs fit together, known conflicts, extra tokens, states built without a frame.

Design reference: the "Hackathon build" page of the Fren Hi-fi canvas (Claude Design, https://claude.ai/artifact/PPUh4TJEQ2honEXztz5vtu). Frame numbers in the docs (e.g. `2.6`) refer to that page. Read the frame's source before building a screen. The design decides the look, the docs decide scope. Never invent a state: build it from existing design parts and log it in `docs/04-DESIGN-NOTES.md`.

## Hard rules

1. **Scope is the hackathon build only.** One developer, one product, one aha moment, toast style only. If something is not in the brief, do not build it. Ask first.
2. **Everything PayPal runs in sandbox.** Never use live credentials.
3. **Money is checked on the server.** The amount captured must match an amount the project allows. Never trust the client.
4. **The SDK must not break the host site.** Render inside a Shadow DOM, catch every error, never throw into the host page, no global CSS.
5. **Sample data is always labelled.** Seeded rows have `is_sample = true` and the UI says "Includes sample traffic".
6. **Secrets live in env vars only.** Never commit `.env*`. Keep `.env.example` up to date.

## Stack

- pnpm workspace, TypeScript everywhere, strict mode.
- `apps/web`: Next.js (App Router) for the dashboard, onboarding and API routes. Deployed on Vercel.
- `packages/sdk`: the browser SDK. Built with tsup into an ESM build and an IIFE build (`fren.js`) for the script tag.
- `apps/demo-host`: a tiny stand-in "product" used to demo the install. One page, one button that triggers the aha moment.
- Database: Postgres (Neon) with Drizzle ORM.
- Auth: Auth.js with GitHub.
- AI: Anthropic API, model `claude-sonnet-5-5`, via `@anthropic-ai/sdk`.
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
