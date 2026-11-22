# Patterns

## Hooks the motion files look for

| Hook | Effect |
|---|---|
| `<html class="js">` plus the inline 2.5s fallback script | turns on hidden start states; the fallback shows everything if `motion.js` never runs |
| `<header data-header>` | sticky, solid, soft fade underneath once scrolled |
| `class="land-intro" style="--d:150ms"` | hero entrance, waits for fonts |
| `data-reveal style="--d:120ms"` | fades up when scrolled into view |
| `<div data-acc>` of `.acc-item` | expanding rows |
| `class="land-link"` | underline draws in on hover |
| `.btn` with `<span class="arr">↗</span>` | arrow nudges on hover, nothing moves on press |

Copy the head exactly from `assets/starter/index.html`: fonts, icons, `motion.css`, the inline `js` script, then Lenis, `motion.js` and `signup.js` with `defer`.

## Expanding row

```html
<div data-acc>
  <div class="acc-item">
    <button class="acc-btn" aria-expanded="false" aria-controls="acc-sales">Sales<span class="acc-ic" aria-hidden="true"></span></button>
    <div class="acc-panel" id="acc-sales" role="region"><div><ul>
      <li>Website and WhatsApp enquiries answered within minutes</li>
      <li>Leads qualified and logged in your CRM</li>
    </ul></div></div>
  </div>
</div>
```
The panel's single child `<div>` is what clips the content. Whatever sits inside it fades. Five rows or fewer reads well. If there are more, split them into groups.

## React / Next.js port

Put the CSS from `motion.css` in the global stylesheet. Scope it under a `[data-landing]` wrapper if the app has other pages. In Tailwind projects, the header is `className="sticky top-0 z-50 bg-white"` plus `data-header`. Copy `vendor/lenis.min.js` to `public/vendor/`. Then mount this once on the landing page:

```tsx
"use client";
import { useEffect } from "react";

type Lenis = { raf(t: number): void; scrollTo(t: Element, o?: { offset?: number }): void; destroy(): void };

export function LandingMotion() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.setAttribute("data-shown", ""); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const header = document.querySelector<HTMLElement>("[data-header]");
    const onScroll = () => header?.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let lenis: Lenis | null = null, frame = 0, cancelled = false;
    const onAnchor = (e: MouseEvent) => {
      const id = (e.target as Element | null)?.closest?.('a[href^="#"]')?.getAttribute("href");
      const target = id && id.length > 1 ? document.querySelector(id) : null;
      if (!lenis || !target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -(header?.offsetHeight ?? 0) - 8 });
      history.replaceState(null, "", id);
    };
    const start = () => {
      const L = (window as unknown as { Lenis?: new (o: { lerp: number }) => Lenis }).Lenis;
      if (cancelled || !L) return;
      lenis = new L({ lerp: 0.09 });
      const loop = (t: number) => { lenis?.raf(t); frame = requestAnimationFrame(loop); };
      frame = requestAnimationFrame(loop);
      document.addEventListener("click", onAnchor);
    };
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const s = document.createElement("script");
      s.src = "/vendor/lenis.min.js?v=1.1.13"; s.async = true; s.onload = start;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true; io.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onAnchor);
      cancelAnimationFrame(frame); lenis?.destroy();
    };
  }, []);
  return null;
}
```
In React, wrap hidden start states in `@media (scripting: enabled) { ... }` instead of `.js`, because there's no inline script to add the class. In Next, the favicon is `app/icon.png` (512) and `app/apple-icon.png` (180).

## Retrofitting an existing site

Run `scripts/check.mjs` first. It lists most of the violations. The usual fixes:
- **Second font for headings or buttons:** delete it and set `font: inherit` on buttons and inputs.
- **Uppercase eyebrows over sections:** delete them. A good heading doesn't need a label.
- **`backdrop-filter: blur()` on the header:** replace it with a solid background plus the fade.
- **Hero animating `filter: blur()`:** use the `land-intro` keyframes.
- **`transition: all`:** list the properties.
- **`:active { transform: scale(.97) }`:** delete it.
- **Chevron or plus icons that rotate:** fold the bar away instead.
- **Hairline under the header:** use the fade instead.
- **Bullet walls:** turn them into expanding rows.

## Favicon recipes

- **Dark tile, light letter:**
  `--bg '#0a0a0a' --fg '#ffffff'`
- **White tile.** Add a ring so it doesn't vanish on white tabs, and optionally a brand dot:
  `--bg '#ffffff' --fg '#0a0a0a' --border '#e5e5e5' --dot '#0088ff'`
- **Brand-colour tile with a cream italic letter:**
  `--bg '#149f5e' --fg '#fffdf6' --font 'Cormorant Garamond' --weight 700 --italic`
- **Lowercase letters with ascenders (like "a") look small at the default size.** Try `--size 0.5` for x-height letters and about `0.62` for capitals, then check the 32px image.

## Why each rule exists

These come from real fixes, measured where possible.
- **Animating blur:** this was the main cause of choppy animation. Frame timing improved more from removing it than from any timing change, and Safari was worst.
- **Scrolling that measured fine but felt choppy:** it ran at 60fps with tiny main-thread cost and still felt rough. Smooth scrolling fixed the feel. Measure first, so you know whether the problem is speed or feel.
- **Click flicker on expanding rows:** frame-by-frame recordings showed two causes. The + rotated through an × mid-turn, and the panel used a fast-out curve, so most of the opening happened in the first few frames. Folding the bar and using an even curve fixed both.
- **Instant `:active` scale:** with no transition, it shrank in one frame, which reads as a flash.
- **Hairline under the header:** a hard grey line under a white header looked cheap next to everything else. A fade of the page's own colour doesn't.
- **Metal and gradient logos:** they were tried and rejected twice. Flat marks hold up at 16px and next to other brands.
- **Caching:** a returning visitor got the new CSS with the cached old JS, and the hero stayed hidden. Versioned asset URLs plus the 2.5s fallback fixed it.
- **Fonts:** animating before fonts load makes text swap faces mid-move. Waiting, with a cap, avoids it.
