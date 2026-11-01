# Fren: design notes (hackathon build)

Canvas: Fren Hi-fi, page "Hackathon build" (https://claude.ai/artifact/PPUh4TJEQ2honEXztz5vtu). Frames 1.1 to 5.2 all exist there.

## The rule

1. **The design decides the look.** Copy colours, type, spacing, radii and copy from the frame's source.
2. **The docs decide scope.** If a frame shows something out of scope, leave it out.
3. **Undesigned states** are built only from parts that already exist in the design, and each one is listed under "Built without a frame" below so it can be checked.

## Conflicts and what we do

| Frame | Design shows | Docs say | We build |
|---|---|---|---|
| 1.1 | GitHub, Google, email field | GitHub only | GitHub button only. Hide Google and email. |
| 1.2 | "Connect PayPal" OAuth button | Plan B email input first | Email input (see below). Keep the design's panel, copy and checks. |
| 1.3 | "PayPal Personal · USD · Sandbox" | Developer uses a sandbox Business account | "PayPal Business · USD · Sandbox" |
| 2.2 | "Found your logo on inkwell.app" | Logo is out of scope | No logo note. Callout "Name and domain added". |
| 2.7 | Third option "Let them choose" | Two presets | Two presets only. |
| 3.1 | Snippet loads `cdn.fren.dev/v1.js` | `fren-app.vercel.app/v1/fren.js` | Real URL from `NEXT_PUBLIC_APP_URL`. |
| 3.1 | Agent prompt says install `@fren/sdk` | Script tag or npm | Spec 6.1 wording. |
| 5.1 | $136, 24 tips | Seed gives about $131, 23 tips | Whatever the data says. |
| 5.1 | "Preview your ask", "Share report", chart tabs | Not listed | Ask first before building. |

## Extra colours from the design

The design uses shades beyond spec section 10. They become named tokens (no other new colours):

| Token | Value | Used for |
|---|---|---|
| `--ink-disabled` | `#7A7A85` | Disabled text, inactive step labels |
| `--ink-body` | `#3D3C39` | Toast message text |
| `--surface-hover` | `#E2DEFF` | Secondary pill hover |

Add others here as they come up, with the frame they came from.

## Built without a frame

Fill this in as each one is built, so it can be reviewed on the canvas.

| State | Built from | Status |
|---|---|---|
| 1.2 PayPal email input (Plan B) | 1.2 panel, `.fi` input from 2.x | not built |
| 3.2 waiting and 60s hint | 3.2 check rows with grey ticks | not built |
| 4.2 PayPal buttons inside the toast | 4.2 toast, buttons replace the Donate pill | not built |
| 1.2 spike: bare card with the PayPal buttons (`fren.test()`) | 4.2 toast card (white, `--line` border, 20px radius, 352px, bottom right) with a title line | temporary, replaced by the toast in step 2.2 |
| 4.2 toast with a real photo | 4.2 avatar circle, 2.3 photo | not built |
| 4.2 toast under 480px | 4.2 toast, full width minus 16px | not built |
| Section 12 error and empty states | Skeleton bars from the live preview, toast body text | not built |
