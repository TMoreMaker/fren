# Fren: product brief (hackathon build)

## The problem

Indie and open-source products get used by thousands of people and paid by almost none. Donate buttons sit in footers and get ignored, because they ask at a random time. People are most willing to give right after the product does something useful for them. Nobody asks at that moment, because spotting it means wiring up events by hand.

## What Fren does

Fren AI spots the moment a user gets value, and asks for a tip right then.

1. A developer who already has a product online signs up, connects PayPal and answers a few questions.
2. They describe their aha moment in plain words, e.g. "when someone exports their first chapter". Fren AI turns it into a plan of what to watch for.
3. Fren AI writes the ask in their voice.
4. The developer adds one script tag. No other code.
5. The SDK watches what users do (clicks, downloads, page changes, never what they type). After each meaningful action, Fren AI checks: did this user just reach the moment?
6. When it says yes, a small toast appears with the developer's photo, a headline about what just happened, a short message and three tip amounts.
7. The user pays through PayPal. The money goes straight to the developer's PayPal account.
8. The developer sees the tip on their dashboard with what triggered it, plus an AI suggestion for a better moment to ask.

## Who it is for

One person building a product on their own (an indie hacker or open-source maintainer) who already has users and a live site.

## The hackathon premise

> You are the developer. You already have something online. You add the Fren script tag. Fren AI spots the aha moment on your site, shows the ask, and gets you paid through PayPal.

## How it meets the hackathon rules

| Requirement | How Fren meets it |
|---|---|
| Meaningful PayPal integration (sandbox) | Orders v2 API (create, approve in PayPal's checkout window, capture on the server), payments routed to the developer's own PayPal account. Optional: Log in with PayPal for the connect step. |
| Meaningful AI use | **Claude decides when to ask.** Claude Haiku 4.5 reads each user's recent actions live and judges whether they just reached the moment the developer described. That verdict triggers the PayPal ask. Claude Sonnet 5.5 also turns the description into a watch plan, writes the ask in the developer's voice, and reads the stats to suggest a better moment. |
| Working prototype, not mockups | Hosted dashboard on Vercel, a hosted demo product, real sandbox payments end to end. |
| Public repo with licence and run instructions | MIT licence, README with setup steps and env vars. |
| Demo video under 3 minutes | Script below. |

Judging criteria (no weights published): technological implementation, design, potential impact, innovation, presentation. Category awards worth aiming at: **Best Use of PayPal + AI**, Best Demo Delivery.

## In scope (build this)

Screen numbers match the "Hackathon build" page of the Fren Hi-fi canvas.

- **1.1 to 1.3** Sign up (GitHub), connect PayPal, connected state.
- **2.1 to 2.8** Set up your ask, one question at a time with a live preview on the right:
  product name and website, your name and photo, aha moment, tone, **AI writes the message (3 drafts)**, amounts, review.
- **2.3b** No photo: show the first initial instead.
- **2.4b, 2.4** The moment: the developer describes it in plain words (empty state, then filled with "Fren AI will watch for").
- **3.1** Install: agent prompt, npm and script tag tabs, with the project key filled in. Script tag only, no moment code.
- **3.2** Live: ticks off SDK loaded, watching user actions, Fren AI spotted the moment, test ask shown.
- **4.1 to 4.4** The end-user side: Fren AI spots the moment, toast ask, PayPal checkout, thank you.
- **5.1** Overview: raised, tips, conversion, average tip, raised per day, funnel, recent tips with what triggered each one, **Fren AI suggestion card**.
- The live AI trigger (spec 6.4, 6.5, 7.1). This is the heart of the entry.

## Out of scope (do not build)

- Teams or more than one person in the ask (parked).
- Preset moment lists and custom event names. The developer describes the moment in words instead.
- Reading page text or anything users type. Fren AI only sees labelled actions.
- Logo pickup and the no-logo frame (2.2b). The ask no longer shows a logo.
- Modal and inline styles. Toast only.
- A/B tests, the moment map, the Insights page (5.2 Roadmap is a pitch slide only).
- Donations, Moments, Payouts and Settings pages.
- Multiple projects per developer, team accounts, billing, a Fren fee.
- Live PayPal. Sandbox only.
- Mobile apps. Web SDK only.

## The demo (under 3 minutes)

| Time | What happens on screen | What you say |
|---|---|---|
| 0:00 to 0:20 | Footer donate button nobody clicks | The problem: people give when you ask at the right moment, and nobody does, because spotting it means wiring up events by hand. |
| 0:20 to 1:05 | Sign up, connect PayPal sandbox, answer the questions. Type the aha moment in plain words and Fren AI shows what it will watch for. Fren AI writes 3 versions of the message. | Describe the moment like you'd tell a friend. Fren AI figures out what it looks like and writes the ask in your voice. |
| 1:05 to 1:30 | Install tab, paste the script tag into the demo product, Live screen ticks green as you click around | One script tag. No event code. |
| 1:30 to 2:15 | Switch to the demo product as a user. Click around, nothing happens. Export a file. Fren AI spots it (the debug pill shows the verdict), the toast appears. Pick $5, pay in the PayPal sandbox popup, thank you card. | Fren AI waited for the real moment, then asked. |
| 2:15 to 2:50 | Dashboard: the new $5 tip at the top, marked New, with "Fren AI asked after: exported chapter-1.pdf". The Fren AI suggestion card. Quick roadmap slide (5.2). | The money is already in your PayPal. Fren AI tells you why it asked, and when it should ask instead. |

Record the payment part twice and keep the cleaner take. Sandbox can be slow.

## Success for the hackathon

- A judge can open the hosted demo product, trigger the moment and complete a sandbox payment.
- The tip shows up on the developer's dashboard within a few seconds.
- The ask is triggered by a live Claude verdict, not a hard-coded event.
- The watch plan, the AI message and the AI suggestion all come from live Claude calls.
- Repo is public with an MIT licence, a clear README and a working `.env.example`.
