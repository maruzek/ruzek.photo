# Brief: page-loading concepts derived from the logo

You are designing **loading-screen concepts** for the portfolio website of Martin Růžek, an event and sports photographer in Prague (Instagram @ruzek.jpg). The site will be very bold and Awwwards-like (Astro + GSAP on Cloudflare). Martin wants to *see ideas*, so these are visual prototypes, not production code.

## The logo
"Prostorový roh" (spatial corner): three isometric faces of a cube corner built from small square tiles (rhombi in isometric projection). The dense centre falls off through ordered dithering into scattered tiles at the edges. There is a black (single colour) and a greyscale variant (7 grey steps from #181818 to #d0d0d0, darker toward the corner).

Files in `/tmp/claude-1000/-home-martin-dev-ruzek-photo/33f0927f-29de-40ea-9c7d-39bc192aaab0/scratchpad/loader/`:
- `prostorovy-roh.svg` (black) and `prostorovy-roh-seda.svg` (grey). Each face is one `<path>`/`<g>` with an affine `matrix(...)` mapping a unit 7×7 grid into viewBox 320×320; tile = square `[i+.105, i+.895]`.
- `logo-tiles.json`: the same data parsed. 74 tiles, each `{face: top|left|right, i, j, fill, poly: [[x,y]×4], center}`. `i`/`j` = 0 at the shared cube corner (origin 160,146). Use this to animate individual tiles. **The final resting state must match the real logo exactly** (same tiles, positions, greys).

## Martin's own note (a starting point, not a requirement)
> The loading scene would be made of a fully black page, or rather of squares in the same colours as my logo, with some small animation. After loading, my logo appears; the rest of the squares simply disappear.

## Your freedom
You have a **free hand**. Interpret, extend, or depart from the note. Light or dark, 2D or isometric, minimal or dramatic, all fine. Surprise him. Each concept must stay **elegant, modern, beautiful and functional**.

## Functional requirements (every concept)
- It is a real loader: it must work whether the page loads in 200 ms or 5 s. Show how it behaves with a short and a long load (e.g. a minimum display time, an idle loop while waiting, and a clean exit once "loaded"). Simulate loading with a timer; add small controls: **Replay**, **Fast load**, **Slow load**.
- Show the hand-off: behind the loader put a simple placeholder page (large "Martin Růžek" headline, a few grey photo blocks) so the exit transition into the site is visible. Do not invent copy beyond the name, `ruzek.jpg`, and neutral labels.
- Typical total time on a fast load: roughly 1.2–2.5 s. It must never feel like it holds the user hostage.
- `prefers-reduced-motion: reduce`: a calm alternative (e.g. simple fade to the static logo).
- Works on mobile (390 px) and desktop (1440 px). No horizontal scroll.
- Performance-minded: animate transforms/opacity or canvas, no layout thrash. Mention how it would hook into a real page (e.g. `document.fonts.ready` + hero image decode, first visit only vs every navigation, Astro view transitions).

## Technical constraints for the prototype files
- Each concept = **one standalone HTML file**: starts with `<!doctype html>`, `<meta charset="utf-8">`, viewport meta, base styles, explicit `body` background.
- Everything inline (inline the tile data you need). External scripts **only** from cdnjs, exact version: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js` (plus other plugins of the same 3.13.0 version on cdnjs if needed). Vanilla JS/CSS/SVG/canvas is equally fine. Fonts only from Google Fonts (e.g. Stack Sans Notch, Stack Sans Text), optional.
- No localStorage dependence, no network calls besides the CDN/fonts above.
- Each file auto-plays on open and loops into a replay state or offers Replay. It will be shown inside an iframe in a gallery, so it must look good at ~720×450 too.

## Verify your work
Render each file in headless Chromium and look at frames across the timeline (start, middle, end, after exit), at desktop and mobile size. Fix what looks off. Playwright is available:
```js
import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
```
Check the console for errors. Confirm the final logo state matches `prostorovy-roh-seda.svg` / `prostorovy-roh.svg` visually.

## Deliverables
Write into `/tmp/claude-1000/-home-martin-dev-ruzek-photo/33f0927f-29de-40ea-9c7d-39bc192aaab0/scratchpad/loader/concepts/`:
- `<prefix>-1.html`, `<prefix>-2.html` (your prefix is given in your task).
- `<prefix>.json`: an array with one object per concept:
  `{ "file": "...", "name": "short evocative name (Czech)", "idea": "1–2 sentences in Czech: what happens and why it fits the logo", "flow": ["3–5 short Czech steps of the timeline"], "timing": "fast load / slow load behaviour in Czech", "tech": "how it is built and how it would integrate in Astro (Czech, 1–2 sentences)", "risks": "honest downsides (Czech, 1 sentence)" }`
- Do not write anywhere else. Do not touch the project repo.

Final reply: a short list of the files you created and one line per concept. Mention anything you could not verify.
