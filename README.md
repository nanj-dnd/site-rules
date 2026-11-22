# site-rules

A Claude Code skill for building company and landing sites that look calm and well made: one typeface, sentence case, plain copy, flat favicons and motion that doesn't stutter.

## Install

```bash
git clone https://github.com/nanj-dnd/site-rules ~/.claude/skills/site-rules
```

Start a new Claude Code session. The skill loads when you ask for a website or landing page, or to fix choppy animation or scrolling, or you can call it directly with `/site-rules`.

To update:

```bash
git -C ~/.claude/skills/site-rules pull
```

## What's inside

- `SKILL.md`: the rules and the workflow Claude follows.
- `assets/starter/`: a single-page starter (`index.html`) plus `motion.css`, `motion.js`, `signup.js` (a contact form through FormSubmit) and Lenis for smooth scrolling.
- `scripts/`: headless Chrome tools. They need Node 22+ and Google Chrome; set `CHROME=/path` if Chrome isn't found.
  - `check.mjs <url> <out>`: takes desktop and phone screenshots and lints the page against the rules.
  - `scrolltest.mjs <url>`: reports frame timing while wheel-scrolling.
  - `clicktest.mjs <url> <selector>`: records a click frame by frame on one image.
  - `favicon.mjs --letter a --bg '#000' --fg '#fff' --font 'EB Garamond'`: makes flat favicons at 32, 180 and 512px.
- `references/patterns.md`: the markup, a React/Next port, retrofitting an existing site, and the reason behind each rule.

The scripts work without Claude too:

```bash
node ~/.claude/skills/site-rules/scripts/check.mjs https://example.com ./example
```

## Credits

MIT licensed, see `LICENSE`. Smooth scrolling uses [Lenis](https://github.com/darkroomengineering/lenis) 1.1.13 (MIT, see `assets/starter/vendor/LENIS-LICENSE`).
