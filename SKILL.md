---
name: site-rules
description: Build or restyle a company, product or landing website in a calm, expensive-looking style. One typeface, sentence case, plain copy, flat letter favicon. Motion animates only opacity and transform, with smooth scrolling (Lenis), a soft fade under a sticky header, buttons that never jump and lists that expand into rows. Comes with a starter page, drop-in motion files, a favicon maker and headless-Chrome checks that measure scroll smoothness, catch click flicker and lint a page against the rules. Use when someone asks to make a website, landing page or company site, to make a site look good or clean, to fix choppy animation, janky scroll or flicker on click, or to apply this style to an existing site. Not for web apps' logged-in screens or dashboards.
---

# Site rules

A house style for marketing sites, taken from what made tryamp.in and trygavel.in look right. Most of it is restraint. The rest is motion that doesn't stutter, which needs measuring rather than eyeballing.

Files:
- `assets/starter/`: `index.html` (single page with `{{TOKENS}}`), `motion.css`, `motion.js`, `signup.js`, `vendor/lenis.min.js` (Lenis 1.1.13, MIT)
- `scripts/`: `check.mjs`, `scrolltest.mjs`, `clicktest.mjs`, `favicon.mjs` (Node 22+, Chrome, no installs)
- `references/patterns.md`: markup for each piece, the React/Next port, retrofitting an existing site, and why each rule exists

## The rules

Type and copy
1. One typeface for everything: headings, body, buttons, form fields. Use one or two weights. If it's a serif with a small x-height, put `font-size-adjust: 0.5` on body text and `none` on headings.
2. Sentence case everywhere. No all-caps labels, no small "eyebrow" text above headings, no decorative rules or lines beside headings, no wide letter-spacing.
3. Plain copy. Say what the company does and for whom. Leave out clever lines, backstory that isn't a reason to buy, and claims, numbers, logos or quotes nobody gave you.
4. One button label everywhere ("Contact us", or whatever the user picks), and one form that really delivers to a real inbox.
5. The tab title is the name only. The favicon is one flat letter in one colour on the brand colour.
6. No effects on the logo or wordmark: no gradients, sheen, metal or glow. They read as gimmicks. If the user asks for one, show it next to the flat version before shipping.

Motion
7. Animate only `opacity` and `transform`. Never animate blur, `filter`, `backdrop-filter`, or layout properties (width, height, top, margin). The only exception is the row panel's `grid-template-rows`.
8. Use one curve for things appearing: `cubic-bezier(0.22, 1, 0.36, 1)`. Use an even ease-in-out for things that open and close: `cubic-bezier(0.65, 0, 0.35, 1)`. A fast-out curve on an opening panel snaps open and then crawls, and that looks like flicker.
9. Keep moves small and slow. Entrances rise 14 to 20px over 0.9 to 1s, with staggers of 120 to 150ms. Small items move about 6px. Responses to a click take about 0.5s.
10. Start animations once fonts load, capped at 1.2s, with a 2.5s inline fallback that shows everything if the script never runs. Elements already on screen reveal at once.
11. Respect `prefers-reduced-motion`. Add `?v=N` to asset URLs and bump it on every change, so no visitor gets new CSS with old JS (that combination hides content).

Scroll and header
12. Smooth wheel scrolling with Lenis (`lerp: 0.09`). Touch keeps native scrolling. In-page links stop below the header.
13. Sticky header on a solid background with no bottom border. A soft fade (28px) appears under it only after scrolling.

Interaction
14. Buttons never jump. No `:active` scale, no tap highlight, no focus ring on mouse click (keep it for keyboard users).
15. Icons change shape rather than spin. + becomes − by folding the vertical bar away (`scaleX(0)`), never by rotating.
16. In opening panels, the text fades in about 120ms after the panel starts moving.
17. Long lists become expanding rows, each with a line underneath, rather than walls of bullets.

## Workflow

### 1. Settle the inputs
Collect only what isn't already known from the conversation or the repo, in one AskUserQuestion:
- **Name and one line.** What it does and for whom, in the user's words.
- **Typeface.** Offer a warm serif (EB Garamond), a neutral sans (Inter) or their own font.
- **Brand colour.** Used for the favicon and at most one accent.
- **Contact inbox.** Where form submissions go.
- **Sections.** Which ones they have real content for, and where it will be hosted.

Real content (team lines, services, clients) comes from the user. If it's missing, cut the section rather than invent it.

### 2. Build
- **New site:** copy `assets/starter/*` into the target folder. Fill every token, delete sections with no content, and check that `grep -n '{{' index.html` finds nothing. More pages reuse the same head and files. On subpages, use root-relative paths (`/motion.css`).
- **Existing site:** add `motion.css`, `motion.js` and the Lenis file, then give elements the hooks (`data-header`, `.land-intro`, `data-reveal`, `data-acc`). Remove whatever breaks a rule. For React or Next, follow the port in `references/patterns.md`.
- **Favicons:** run `node scripts/favicon.mjs --letter <x> --bg <brand> --fg <ink> --font '<font>' --out <site>/icons`, then look at the 32px image.

### 3. Check: measure, don't eyeball
Serve the site locally (`python3 -m http.server 8765 --bind 127.0.0.1` from the site folder, in the background), then run these from the skill folder:
- `node scripts/check.mjs http://127.0.0.1:8765/ <scratch>/site`
  - Takes desktop and phone screenshots, plus full-page versions.
  - Lints the page: number of typefaces, all-caps text, eyebrow spacing, blur or layout motion, press-scale, header border, sideways scroll on phone, reveals that never fire, console errors, unfilled tokens.
  - Read every PNG and fix every issue.
- `node scripts/scrolltest.mjs <url>` measures scrolling.
  - A p50 of about 16.7ms with few frames over 20ms means rendering is fine.
  - If it still feels choppy, look for blur or filters first, then easing and smooth scrolling.
- `node scripts/clicktest.mjs <url> '.acc-btn' 0 <scratch>/click.png` records every clickable that animates, frame by frame.
  - Read the sheet for spinning icons, snaps, flashes and jumps.

Repeat until `check.mjs` reports no issues and the images look right. Say plainly what you didn't test: a real phone, Safari, or the form actually delivering.

### 4. Ship
- Bump `?v=N` on every changed asset.
- After deploying, confirm the live site serves the new files (curl it and grep for a string you just added), and check that the icon URLs return the new images.
- FormSubmit sends an activation email on the first submission. Tell the user someone has to click it, or no mail arrives.

## Writing the copy
Draft from the user's facts only. Keep sentences short and concrete: what it does, who it's for, what changes for them. Leave out taglines, puns, superlatives and "we're passionate about". If the user has a voice skill and asks for their voice, use it for the copy.
