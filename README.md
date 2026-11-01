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

## Fren AI accuracy (build plan step 2.2)

Tested on 1 Nov 2026 on the deployed demo host with `?fren=test`, Claude Haiku 4.5, threshold 0.75. The product is Inkwell, a writing app, and the moment is "When someone exports their first chapter as a PDF or ePub." There were 10 fresh visitors. Each clicked "New chapter", then "Rename", then "Export", which finishes a 1 second fake export and downloads `chapter-1.pdf`.

| Check | Result |
|---|---|
| Ordinary buttons show the ask | 0 of 20 clicks (all said no, confidence 0.95 to 0.98) |
| Export shows the ask | 10 of 10 (all said yes, confidence 0.95, "Exported chapter-1.pdf") |
| Export again by a visitor who already exported | Said no ("Exported chapter-1.pdf again", 0.95) |
| Time from download to ask | 2.3 to 2.8 seconds (600ms wait, then about 1.7s for Haiku) |

Within the same page session the SDK stops sending once the ask has shown, so a second export there never reaches the AI. The repeat test was a reload by the same visitor.

Changes from the spec, found while testing:

- **Clicks wait 1.5 seconds, other signals 600ms** (spec 6.4 says 600ms for all). Clicking Export only starts the export, and the download follows about a second later. With one wait for everything, the click used up the 3 second rate limit, the download was skipped and the moment was missed every time. Now the click and the download reach the AI together in one check. The 3 second gap is also counted from when a check starts, not when it ends.
- **No `temperature`** (spec 7.1 says 0). The API no longer accepts sampling settings. Fren uses structured output instead, so the reply always has the right JSON shape.
- **`events.is_moment`** stores the AI's yes or no on each `judged` event, which "Reached this moment before" needs (spec 7.1).

## Licence

MIT
