# Fren

Fren asks your users for a tip at the right moment. Add one script tag and one line of code at your product's aha moment. When a user hits it, a small toast asks for a tip, and the money goes straight to your PayPal account.

Built for the PayPal AI Hackathon. Everything PayPal runs in sandbox.

> Work in progress. Full judge instructions, live links and the AI and PayPal write-up land in build plan step 6.2.

## Live

- Dashboard: https://fren-tips.vercel.app
- Demo product: https://fren-demo.vercel.app

## Repo

| Path | What it is |
|---|---|
| `apps/web` | Next.js dashboard, onboarding and API routes. Serves `fren.js`. |
| `packages/sdk` | The browser SDK and widget, built to `fren.js` and an ESM build. |
| `apps/demo-host` | A tiny stand-in product used to demo the install. |
| `docs/` | Product brief, build spec, build plan, design notes. |

## Setup

Prerequisites: Node 22 or later, pnpm 11, a Neon Postgres database, a GitHub OAuth app, a PayPal sandbox REST app, an Anthropic API key.

```bash
pnpm i
cp .env.example .env    # fill in every value
ln -s ../../.env apps/web/.env   # Next reads env from its own folder
pnpm db:push
pnpm dev                # web on :3000, demo host on :3001, sdk watch
```

The web app (through the symlink), scripts and demo host all read the root `.env`.

## How the widget renders PayPal

The widget lives in a Shadow DOM so it never touches the host page's CSS. PayPal's JS SDK handles that itself: when its container is inside a shadow root, it puts a `<slot>` there and renders its button iframe as a light-DOM child of Fren's host element, so the buttons still show inside the widget. Their styles are scoped to the iframe, so host CSS can't restyle them. Fren loads the PayPal SDK under its own namespace (`frenPayPal`), so a host page that already uses `window.paypal` is left alone.

## Licence

MIT
