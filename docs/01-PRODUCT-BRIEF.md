# Fren: product brief (hackathon build)

## The problem

Indie and open-source products get used by thousands of people and paid by almost none. Donate buttons sit in footers and get ignored, because they ask at a random time. People are most willing to give right after the product does something useful for them. Nobody asks at that moment.

## What Fren does

Fren asks for a tip at the right moment.

1. A developer who already has a product online signs up, connects PayPal and answers a few questions.
2. Fren AI writes the ask in their voice.
3. The developer adds one script tag and one line of code: `fren.moment('first_export')`.
4. When a user hits that moment, a small toast appears with the developer's photo, a short message and three tip amounts.
5. The user pays through PayPal. The money goes straight to the developer's PayPal account.
6. The developer sees the tip on their dashboard, plus an AI suggestion for asking at a better moment.

## Who it is for

One person building a product on their own (an indie hacker or open-source maintainer) who already has users and a live site.

## The hackathon premise

> You are the developer. You already have something online. You add the Fren SDK so it can spot the aha moment on your site, show the ask, and get you paid through PayPal.

## How it meets the hackathon rules

| Requirement | How Fren meets it |
|---|---|
| Meaningful PayPal integration (sandbox) | Orders v2 API (create and capture), PayPal JS SDK buttons in the widget, payments routed to the developer's own PayPal account. Optional: Log in with PayPal for the connect step. |
| Meaningful AI use | Claude (`claude-sonnet-5-5`) writes the ask message from the developer's answers, and reads the dashboard stats to suggest a better moment to ask. |
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
- **2.4b** Custom event: the developer names their own moment and gets the event name to use in code.
- **3.1** Install: agent prompt, npm and script tag tabs, with the project key filled in.
- **3.2** Live: waits for the first event, then ticks off each check.
- **4.1 to 4.4** The end-user side: aha moment fires, toast ask, PayPal checkout, thank you.
- **5.1** Overview: raised, tips, conversion, average tip, raised per day, funnel, recent tips, **Fren AI suggestion card**.

## Out of scope (do not build)

- Teams or more than one person in the ask (parked).
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
| 0:00 to 0:20 | Footer donate button nobody clicks | The problem: people give when you ask at the right moment, and nobody does. |
| 0:20 to 1:05 | Sign up, connect PayPal sandbox, answer the questions. The preview fills in. Fren AI writes 3 versions of the message. | Setup takes about a minute. Fren AI writes the ask in your voice. |
| 1:05 to 1:30 | Install tab, paste the agent prompt or script tag into the demo product, Live screen ticks green | One script tag, one line of code at the aha moment. |
| 1:30 to 2:15 | Switch to the demo product as a user. Trigger the moment. Toast appears. Pick $5, pay in the PayPal sandbox popup, thank you card. | This is what your user sees, right after the product helped them. |
| 2:15 to 2:50 | Dashboard: the new $5 tip at the top, marked New. The Fren AI suggestion card. Quick roadmap slide (5.2). | The money is already in your PayPal. Fren AI spots a better moment to ask. Next we prove it with tests. |

Record the payment part twice and keep the cleaner take. Sandbox can be slow.

## Success for the hackathon

- A judge can open the hosted demo product, trigger the moment and complete a sandbox payment.
- The tip shows up on the developer's dashboard within a few seconds.
- The AI message and the AI suggestion both come from live Claude calls.
- Repo is public with an MIT licence, a clear README and a working `.env.example`.
