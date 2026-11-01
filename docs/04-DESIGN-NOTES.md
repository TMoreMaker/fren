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
| 4.1 | Product drawn as grey blocks | The AI needs labelled buttons (spec 6.4) | Agreed 1 Nov: the frame's blocks get labels using its own classes. Sidebar: "Inkwell" mark, "New chapter", "Chapter 1" to "Chapter 3", "Settings". Header: chapter title, "Rename", "Export". Content stays grey. After Export, the green tick and the dark bottom bar ("Exported chapter-1.pdf", no right-hand box). |
| 4.1 | Indigo "Fren AI: first export spotted, 92% sure" pill | Step 2.4: show with `?fren=debug` | Shown by the SDK for 5 seconds when the AI says yes: "Fren AI: {label}, {confidence}% sure". |
| 4.2 | Donate opens a PayPal checkout stand-in (4.3) | Spec 6.6 | Agreed 1 Nov: our purple Donate button opens PayPal's real checkout page in a window. One click, frame 4.2 unchanged. While waiting, the button reads "Waiting for PayPal…". The window returns to a one-line Fren page that closes itself. |
| 4.2 | No error states | Spec 12 copy | Agreed 1 Nov: one line in the message style above the button area ("Allow pop-ups to pay with PayPal.", "PayPal didn't load. Try again.", "Payment didn't go through. You weren't charged."). The Donate button stays. |
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

Nothing temporary right now.
