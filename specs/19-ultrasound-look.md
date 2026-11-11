# Task 19 — Restyle GymLog after ultrasound.money

Assignee: Martin Zvelebil

## Why

The team likes the look of https://ultrasound.money/: a deep slate-navy page, soft red and blue
glow behind the header, cyan-to-indigo gradients, borderless cards, Inter for text and Roboto
Mono for numbers. GymLog should look as close to it as possible while staying usable in the gym
on a phone.

## What

- Replace the charcoal and lime palette in `frontend/src/index.css` with ultrasound.money's
  colours, taken from their `tailwind.config.js` (`ultrasoundmoney/frontend`):

  | Token | Hex | Their name |
  | --- | --- | --- |
  | `ink` (page) | `#131827` | slateus-800 |
  | `panel` (cards, bars, inputs) | `#1b2236` | slateus-700 |
  | `border` | `#2d344a` | slateus-600 |
  | `text` | `#ffffff` | white |
  | `muted` | `#8991ad` | slateus-400 |
  | `accent` (links, selected thing) | `#5dadec` | drop |
  | `gradient-start` → `gradient-end` | `#22d3ee` → `#4f46e5` | cyan-400 → indigo-600 |
  | `glow-red`, `glow-blue` | `#dd273b`, `#0037fa` | header-glow.svg |
  | `danger` | `#ff9b8a` | unchanged |

- Rename the `lime` token to `accent` in every component, so the name says what it is for.
- The primary action is a rounded-full pill filled with the cyan → indigo gradient and white
  text. Secondary buttons are pills with a gradient outline (their "BlueButton").
- Cards are `rounded-lg` panels without a border; inputs are rounded-full.
- Field labels are uppercase with wide letter spacing, as on ultrasound.money.
- A red and blue glow sits behind the top of every page.
- Text uses Inter at light weight (300), like ultrasound.money: `font-light` by default and for
  headings and big numbers, `font-normal` for titles, buttons and labels; never bold.
- Big numbers (latest weight, stats) use Roboto Mono. Both are installed with
  npm (`@fontsource-variable/inter`, `@fontsource-variable/roboto-mono`) so they work offline
  and are recorded in `package-lock.json`.
- Update "How it looks" and "Coding stack" in `AGENTS.md`.

## Out of scope

- Layout, navigation, screens or behaviour — only how things look.
- Their animations, emoji, charts or icons; icons stay `lucide-react`.
- A light theme.

## Done when

- No `lime` is left in `frontend/src` (`grep -rn lime frontend/src` prints nothing).
- Every screen at 375 × 667 shows the navy page, the glow at the top, a gradient primary button,
  and Inter text; there is no horizontal scrolling and every tap target is still at least 44 px.
- `npm run lint && npm run format:check && npm test && npm run build` pass.
- Checked in a browser at 375 × 667 and on a real phone before merging; screenshot in the PR.

Commit as `Feature: ultrasound.money look`.
