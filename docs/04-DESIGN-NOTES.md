# Fren: design notes (hackathon build)

Canvas: Fren Hi-fi, page "Hackathon build" (https://claude.ai/artifact/PPUh4TJEQ2honEXztz5vtu). Frames 1.1 to 5.2 all exist there.

## The rule

1. **The design decides the look.** Copy colours, type, spacing, radii and copy from the frame's source.
2. **The docs decide scope.** If a frame shows something out of scope, leave it out.
3. **A screen or state that isn't on the canvas:** stop and ask (CLAUDE.md rule 1). Once agreed, add it to the conflicts table.

## Conflicts and what we do

| Frame | Design shows | Docs say | We build |
|---|---|---|---|
| 1.1 | GitHub, Google, email field | GitHub only | GitHub button only. Hide Google and email. |
| 1.2 | "Connect PayPal" OAuth button | Plan B email input first | Email input "Your PayPal email" (spec 7.6 Plan B). Keep the design's panel, copy and checks. |
| 1.3 | "PayPal Personal · USD · Sandbox" | Developer uses a sandbox Business account | "PayPal Business · USD · Sandbox" |
| 2.2 | "Found your logo on inkwell.app" | Logo is out of scope | No logo note. Callout "Name and domain added". |
| 2.7 | Third option "Let them choose" | Two presets | Two presets only. |
| 3.1 | Snippet loads `cdn.fren.dev/v1.js` | `fren-app.vercel.app/v1/fren.js` | Real URL from `NEXT_PUBLIC_APP_URL`. |
| 3.1 | Agent prompt says install `@fren/sdk` | Script tag or npm | Spec 6.1 wording. |
| 5.1 | $136, 24 tips | Seed gives about $131, 23 tips | Whatever the data says. |
| 5.1 | "Preview your ask", "Share report", chart tabs | Not listed | Ask first before building. |
| 4.2 | Donate opens a PayPal checkout stand-in (4.3) | PayPal buttons in the toast (spec 6.6) | Agreed 1 Nov: PayPal's own buttons (gold pill, 44px) take the Donate button's place. Until they load, the button reads "Loading PayPal…", disabled (`--surface`, `--ink-disabled`). |
| 4.2 | No error states | Spec 12 copy | Agreed 1 Nov: one line in the message style above the button area. "PayPal didn't load. Try again." turns Donate into "Try again". Capture failed and other errors keep the PayPal buttons. |
| 4.4 | "Thank you, Mpho." | Payer name can be missing | Agreed 1 Nov: "Thank you." when PayPal gives no name. |

## Extra colours from the design

The design uses shades beyond spec section 10. They become named tokens (no other new colours):

| Token | Value | Used for |
|---|---|---|
| `--ink-disabled` | `#7A7A85` | Disabled text, inactive step labels |
| `--ink-body` | `#3D3C39` | Toast message text |
| `--surface-hover` | `#E2DEFF` | Secondary pill hover |

Add others here as they come up, with the frame they came from.

## Temporary

| What | Why | Goes away |
|---|---|---|
| Plain test buttons, link, form and Export on the demo host | Steps 1.2 to 2.2 checks (Export waits 1 second, as in 2.4) | Step 2.4, replaced by frame 4.1 |
