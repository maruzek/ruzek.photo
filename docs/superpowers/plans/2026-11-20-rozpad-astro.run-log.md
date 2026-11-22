# Rozpad Astro build — run log

Plan: [2026-11-20-rozpad-astro.md](2026-11-20-rozpad-astro.md). Spec: [docs/concept.md](../../concept.md). Issues: [run-issues](2026-11-20-rozpad-astro.run-issues.md).

## Final report
(written 2026-11-21, by the orchestrator)

**Result: tasks 1–15 done and accepted on `feat/rozpad-astro` (49 commits ahead of `main`, last `1f94fd1`, not pushed). Task 16 (deployment) is Martin's.**

- Checks at the end: `pnpm check` passes (285 unit tests, types, astro check, lint, EXIF); `pnpm test:workers` 11/11; full e2e 263 passed, 40 skipped, **1 failed on purpose** (font budget, `tests/e2e/font-swap.spec.ts`); `pnpm lhci`: Performance 1.0, Accessibility 1, LCP ≈ 1.08 s, TBT 52–68 ms, CLS 0, first-render JS 9.3 kB — **total JS 201 kB > 150 kB fails on purpose**.
- Reviews: every block had a Sol (gpt-6.2-sol High) review, round 2 after blockers, no round 3. Browser check 1 (Sol, T3 browser): 5 pass, 1 fail fixed (BR-01), reduced motion not run (no emulation; covered by e2e). Final lead check (Opus High): ON TRACK, one finding (L2-01) fixed in `1f94fd1`.
- Issues file: 67 rows. Still open after 2 rounds (low-impact edge cases): E-04 rest, HM-01/02/09/10 rests, FM-05 rest. Filed below the threshold: 19. Disputed: 4.
- Incidents: 2× Claude 5-hour limit (resumed in the same threads); one Codex review stalled 80 min on a command approval in an unattended run (restarted with an approval-free brief).

**Martin decides (see "Decisions to confirm" 1–23 and the lead check):**
1. The two budgets: total JS 201 kB vs 150 kB (React island 95.6 kB, Turnstile 26.9 kB; option: load the form and Turnstile on first interaction) and fonts above the fold 123.6 kB vs 70 kB (9 files; fewer cuts or more preloads). Until then the font e2e test and `pnpm lhci` stay red.
2. Decision 8 ("ještě týž den" wording), decision 21 (hero lead paragraph visible at once for LCP), decision 19 (UTM allowlist, the external referrer domain kept after anonymization), the EN translation check.
3. Whether the README/privacy wording "po anonymizaci… s e-mailem už nespojíte" may stay while full inquiry e-mails remain in the mailbox (privacy page `TODO`).
4. Content `TODO`s: IČO, sídlo, telefon, legal basis of the source statistics; real photos with `consentRef` instead of the 14 placeholders (`check:launch` fails until then); manual check on a cheap Android phone.

**Before deployment (task 16), from the lead check:**
1. Real D1 ID in both `wrangler.jsonc` and `workers/maintenance/wrangler.jsonc`, then `migrations apply --remote` (migration `0001` was edited in this run; fine while nothing is deployed).
2. Secrets via `wrangler secret put`: `TURNSTILE_SECRET`, `RESEND_API_KEY` (site), `RESEND_API_KEY` (maintenance worker); SPF/DKIM/DMARC for `noreply@martinruzek.eu`.
3. Serve only `https://martinruzek.eu`, redirect `www` (otherwise `ALLOWED_ORIGIN` and the Turnstile hostname check refuse the form).
4. Order: real `PUBLIC_*` values → `pnpm build` → `pnpm check:launch` → `wrangler deploy`. Never deploy right after `pnpm test:e2e` or `pnpm lhci` (they rebuild with test values).
5. Cloudflare zone: Bot Fight Mode / JS detections off (`__cf_bm` cookie), Rocket Loader, Email Obfuscation and automatic Web Analytics injection off. After deploying: no cookies, beacon sends no query string.
6. Never `git push --mirror`: a local T3 ref (`refs/t3/…`) holds an old commit with `research/notes/business.md` and the moodboard.

## Chunks

Plan line ranges refer to `docs/superpowers/plans/2026-11-20-rozpad-astro.md`. Global Constraints and Review Focus: lines 1–44. UI chunks are marked (UI). Reviewer for every chunk: Codex `gpt-6.2-sol`, reasoning high (Martin, 2026-11-21: if unavailable, stop and ask, no substitute).

| Chunk | Tasks (plan lines) | Content | Implementer | Why this model |
|---|---|---|---|---|
| A | 1 (46–104) | Scaffold, tooling, smoke test | Sonnet 5.5 High | Plan holds the config and test code |
| B (UI) | 2 (106–163) | Tokens, base styles, fonts, Base layout | Sonnet 5.5 High | UI, tokens copied from the prototype |
| C | 3, 4 (165–323) | cs/en dictionaries, pricing config and estimate | Sonnet 5.5 High | Full code and tests in the plan |
| D | 5 (325–386) | Photo schema, EXIF-free import, checks | Sonnet 5.5 High | Tests in the plan, pure scripts |
| C2 | – (added by Martin, 2026-11-21) | Czech copy pass with the `cesky-copywriting` skill over `src/i18n/cs.ts` (not the placeholder alt texts: stock photos never go live); EN kept consistent. Runs after D is accepted, before E | Sonnet 5.5 High | Text edits within existing keys, tests already guard key parity |
| E (UI) | 6 (388–406) | Header, hero, marquee, folds, wipes | Sonnet 5.5 High | UI 1:1 from the prototype |
| F (UI) | 7 (408–467) | Rest of the static home page, cs and en, lightbox | Sonnet 5.5 High | UI 1:1 from the prototype |
| G (UI) | 8 (469–550) | Motion layer: boot, Lenis, GSAP | **Opus 5.5 Medium** | Opus list: reduced-motion gating, Lenis and dialog interplay (Review Focus 1, 2, 5), plan gives only structure |
| H (UI) | 9 (552–617) | Dither, wipe, ASCII hero, adaptive quality | **Opus 5.5 Medium** | Opus list: canvas performance, scheduler, plan lists only differences from the prototype |
| I (UI) | 10 (619–685) | Inquiry form island | Sonnet 5.5 High | Schema code in the plan, UI from the prototype |
| J | 11 (687–819) | Endpoint, D1, Turnstile, mail | **Opus 5.5 Medium** | Opus list: security, personal data, migration |
| K | 12 (821–835) | Maintenance worker: anonymization, retries | **Opus 5.5 Medium** | Opus list: irreversible anonymization of personal data |
| L (UI) | 13 (837–852) | SEO, privacy page, 404, case studies | Sonnet 5.5 High | Templates and JSON-LD with tests |
| M | 14 (854–888) | Security headers, cookieless analytics | **Opus 5.5 Medium** | Opus list: CSP and cookie/legal rules |
| N | 15 (890–906) | Performance budgets, launch check, README | Sonnet 5.5 High | Scripts with tests, docs |
| — | 16 (908–920) | Deployment | Martin | Outside the run: irreversible, on Martin's account |

**Faster mode (Martin, 2026-11-21, after chunk E):** the remaining chunks are merged into 4 blocks. The form block runs in its own worktree in parallel with the home block. One Sol review per block; round 2 only after a blocker. Fix only findings with score ≥ 20, file the rest. No intermediate lead or browser checks: one browser check and one final lead check at the end.

| Block | Tasks | Where | Implementer |
|---|---|---|---|
| HOME (UI) | 7, 8, 9 (F+G+H) | main checkout, after E is accepted | Opus 5.5 Medium |
| FORM | 10, 11, 12 (I+J+K); wiring the island into `Inquiry.astro`/`ServiceCard.astro` happens after the merge | worktree, parallel with HOME, merged after HOME | Opus 5.5 Medium |
| SITE | 13, 14 (L+M) | main checkout, after HOME and FORM are merged | Opus 5.5 Medium |
| PERF | 15 (N) | main checkout | Sonnet 5.5 High |

Gate commands (this repo, from the plan): after each task `pnpm exec vitest run <related tests>` and the task's e2e spec; at chunk end `pnpm check` and `pnpm test:e2e`.

## Decisions to confirm
| # | Chunk | Decision | Where to change it |
|---|---|---|---|
| 1 | A | D1 `database_id` is an all-zero placeholder until deployment (task 16) | `wrangler.jsonc` |
| 2 | A | TypeScript pinned to 6 (astro check refuses 7) | `package.json` |
| 3 | B | Fonts via Astro Fonts API with the local provider over installed `@fontsource/*` woff2 (no build-time download); `--f-*` tokens rebound to Astro's hashed families in `fonts.css` | `astro.config.ts`, `src/styles/fonts.css` |
| 4 | B | Preload both latin and latin-ext for Notch 700 and Text 400 (4 files) | `src/layouts/Base.astro` |
| 5 | C | Own wording (not in prototype): `inquiry.form.done`, `inquiry.privacy`, marquee pause/play, `services.calcLink`, language-switch labels; all EN strings pending Martin's translation check | `src/i18n/cs.ts`, `src/i18n/en.ts` |
| 6 | C | Portrait has no turnaround in the brief (field optional); short shoot "do 1 h" kept as max, no `durationMin` | `src/config/pricing.ts` |
| 7 | lead 1 | `minimumReleaseAgeExclude` lets wrangler 4.166.0, a beta miniflare and workers-utils skip pnpm's release-age guard | `pnpm-workspace.yaml` |
| 8 | lead 1 | **Content (Martin):** meta, hero and day step 03 say social-media photos come "ještě týž den" as if standard; the brief has it as the paid Expres add-on (+20–30 %). Wording is from the prototype. Keep, or change to e.g. "na přání týž den"? **Martin decides when he sees it on the web; keep the current wording until then (C2 must not change it).** | `src/i18n/cs.ts`, `src/i18n/en.ts` |
| 9 | lead 1 | D1 store test via wrangler `getPlatformProxy()` instead of `@cloudflare/vitest-pool-workers` (needs vitest ^4.1, repo has 5.1) | plan task 11 |
| 10 | D | `SHADE_OPACITY = { normal: 0.41, strong: 0.7 }`; `strong` is an assumption until the real `.shade.strong` CSS exists (chunk E/F must align) | `scripts/check-contrast.ts` |
| 11 | D | `TEXT_OVER_PHOTOS = ['smoke','ball','soccer-goal']` (hero + 2 folds); chunks E/F update it | `scripts/check-contrast.ts` |
| 12 | D | `published` defaults to `false`; only published photos need consent | `src/lib/photos/schema.ts` |
| 13 | E | Header without JS / until chunk G: dark translucent bar (`rgb(7 8 11 / 80%)` + blur, ≥ 8:1) instead of the prototype's `mix-blend-mode: difference`; blend is opt-in via `html.motion-ready .top.blend` (chunk G toggles it over flat sections) and off on `:focus-visible` (E-06). Reveal fallback is a 3 s timer in Base's inline script (`html.reveal-fallback`), not a CSS animation (E-04). EN translation TODO strip under the marquee (E-08). Marquee toggle label constant „Pozastavit“ (E-11). Header wordmark hidden ≤ 460 px | `src/styles/sections/header.css`, `src/layouts/Base.astro`, `src/components/Home.astro` |
| 14 | FORM | Rate limit 5 req/IP/min; mail retry batch 50, first retry after 10 min, only rows without owner mail; body limit 32 KB; form defaults from the prototype (event, 3 h, same-day add-on pre-ticked → estimate 4 200–5 070 Kč, relates to decision 8); monthly preview mail on the 1st (UTC) if non-empty; client confirmation without name/place/time/note; mail provider Resend behind `Mailer`, no provider → send fails and the worker retries; `check:launch` (task 15) must fail a production build without a mail provider | `wrangler.jsonc`, `src/server/inquiry/*`, `workers/maintenance/*`, `src/islands/*` |
| 16 | FORM fixes | Mail retries stop after 7 days (row stays); preview lists rows due within 35 days, anonymization ≥ 3 days after a sent preview containing the row; anonymized row gets a new random ID (unlinkable to old mails; deleting mails in the mailbox stays with Martin); UTM lower-case `[a-z0-9._-]` ≤ 64, ≥ 7 digits dropped; Turnstile wait 10 s, server wait 15 s; a retry with changed fields keeps the first stored version | `src/server/inquiry/*`, `workers/maintenance/*`, `src/islands/*` |
| 17 | HOME fixes | Text shade behind hero/fold text blocks (hero 62→92 %, folds 50→85 %, 72 px ramp; desktop hero bottom visibly darker than the prototype); hero text no longer fades on exit; intro skipped whenever the photo is already loaded (on fast connections the intro often does not play); `scroll-padding-top` 88 px; unreached same-day steps shown only by an empty diamond and the line | `src/styles/sections/{hero,fold,day}.css`, `src/scripts/*` |
| 15 | HOME | Motion/canvas constants (ASCII `CELL` 10, `MAX_CELLS` 6000, `MAX_DPR` 1.5, `INTRO_MS` 2400, dither cell 9/6 px, wipe cell 8/6 px, `STATIC_WIPE` 0.55, `FONT_WAIT_MS` 1200); hero intro skipped only when the image came from browser cache; static wipe pattern under reduced motion / Save-Data (looks heavy, judge by eye); LCP test checks fetchpriority/eager/loaded (re-measure with real photos); new photo captions (Konference, Ples, Bar, Fotbal, Florbal, Univerzita, Hala, Raut) and `services.deliverables` | `src/scripts/*`, `src/content/photos/*.yaml`, `src/i18n/*` |
| 18 | SITE | `og:locale` EN = `en_US`; CSP also allows `api-gateway.umami.dev` (Umami Cloud only); Resend named as e-mail processor in the privacy page; privacy text mentions ÚOOÚ, legal basis for source statistics is `TODO`; 404 only in Czech with `noindex`; static `robots.txt` with a written URL (e2e fails if the site URL changes); header/footer links off the home page go to `/#…`; `NOTICE_GRACE_DAYS` moved to `src/config/privacy.ts`; sample case study is draft with `TODO` (no page built); `Permissions-Policy` also denies `payment` and `usb`; case-study Markdown body not rendered (one language only); OG image 960 × 504 from the placeholder (1200 × 630 with a real photo ≥ 1200 px); DNT not honoured (plan does not ask) | `src/components/SeoHead.astro`, `src/pages/*`, `src/i18n/*`, `src/config/{analytics,privacy}.ts`, `public/` |
| 19 | SITE fixes | After anonymization: `created_at` rounded to the 1st of the month (UTC), mail/preview times and `utm_campaign` cleared, `utm_source`/`utm_medium` kept only from a fixed allowlist (sources: instagram, ig, facebook, fb, google, seznam, firmy, linkedin, tiktok, youtube, email, newsletter, qr; media: social, organic, cpc, paid, email, referral, qr, print, display); **external referrer domain stays after anonymization** (a personal site could identify someone, Martin decides whether to clear it); zod `jitless` for CSP; Umami gets a relative URL (path + UTM) and external referrer origin only; privacy version stays 2026-11-21 | `src/server/inquiry/{source,store}.ts`, `src/scripts/analytics.ts`, `src/lib/inquiry/schema.ts` |
| 20 | SITE fix 2 | Analytics are off on every page without a fixed route (`route: null`), today only 404; Umami gets `utm_source`/`utm_medium` only from the shared allowlist `src/config/utm.ts`, never `utm_campaign` | `src/layouts/Base.astro`, `src/config/utm.ts` |
| 21 | PERF | Hero lead paragraph always visible (no GSAP fade-in), because it is the LCP element (before: LCP 4.3 s, Perf 0.66–0.85); `FIRST_RENDER_JS_BUDGET` 10 kB = JS finished by `DOMContentLoaded`, currently 13.8 kB (lightbox ≈ 3 kB, analytics loader ≈ 2 kB), **budget not met, `pnpm lhci` fails**; `FONT_PRELOAD_BUDGET` 70 kB counts preloaded fonts only (first screen really uses 6 cuts ≈ 110 kB); Lighthouse median of 5 runs; `MAX_SHIFT_PX` 2; `check:launch` treats `MAILER=console` and Turnstile test keys as errors; font-swap test cannot cover devices without Arial (Android) | `src/styles/base.css`, `src/scripts/motion/choreo.ts`, `scripts/lhci-budgets.ts`, `scripts/check-launch.ts` |
| 22 | PERF fixes | **Two budgets fail on purpose, Martin decides:** total JS 201 kB > 150 kB (React island 95.6 kB vs 55 kB in the concept, Turnstile `api.js` 26.9 kB, Umami 4.1, beacon 10.0; options: raise the budget or load the form and Turnstile on first interaction) and fonts above the fold 123.6 kB > 70 kB (9 files, only 4 preloaded; options: fewer cuts or more preloads). The font budget e2e test is red, so the full e2e suite is red until he decides. First-render JS 9.3 kB is within budget (the earlier 13.8 kB was a measurement error, decision 21 updated). Method: gzip -9 per script from the build; `TRACKER_GZIP_BYTES` (Umami 4 173 B, Cloudflare 10 264 B, 2026-11-21) must be re-measured over time; public Turnstile test secret in `.dev.vars.example`; `vite` added as devDependency for `loadEnv` | `scripts/lhci-budgets.ts`, `tests/e2e/font-swap.spec.ts`, `scripts/check-launch.ts` |
| 23 | PERF fix 2 | `check:launch` reads the public values from the built `dist/` (CS and EN home) and needs a fresh `pnpm build` with real values right before it; staleness by file times only (env changes in the process are not seen); e2e/Lighthouse test values are rejected | `scripts/check-launch.ts`, README |

## Lead notes
(written by the orchestrator from each lead check: notes for the chunks that follow; the implementer reads them)

- From review A (T1-03), for chunk J: importing `cloudflare:workers` fails `astro check` with TS2307 until Worker types exist. Generate them with `pnpm exec wrangler types` (add a script, commit or regenerate as the adapter docs say) together with the endpoint and its bindings.
- `astro.config.ts` sets `session: false` (sessions would set cookies). Do not re-enable it.
- Chunk E (task 6): remove the temporary `.name` rule at the end of `src/styles/base.css` when `sections/hero.css` defines the real one. Font families have hashed names: use the `--f-*` tokens, never literal family names (the fonts e2e test reads the computed family).
- Chunk E and N: font swap CLS (RZ2-11). Check that the hero name and the paragraph below do not jump when the WOFF2 arrives late (delay the font route in Playwright, compare positions before and after the swap); measure CLS in Lighthouse in chunk N. Font preload count (RZ2-04, 4 files, 53.4 kB) is revisited in N.
- Chunk C: `*Todo` dictionary strings have no `TODO: ` prefix (`<Todo>` adds it). Name, handle, e-mail, phone, IČO, seat live in `src/config/site.ts` (task 7), not in dictionaries; use `fill(template, values)` for `{name}`, `{price}` etc. Form network/server error texts are not yet in the dictionaries: chunk I adds them to both cs and en.
- Chunks F and I (T4-02): the longest EN estimate `CZK 16,000–21,110` is ~285 px wide, the service/estimate box at 360 px gives 274 px. Allow a line break between the two amounts (e.g. after the en dash) and test 12 h + both add-ons in EN at 360 px.
- Chunk F (T3-09): the services section shows 3 cards as in the prototype: `event`, `match`, and one shared card for `short` + `portrait` (both ids stay for the calculator). Do not render one card per `services` entry.
- Routing: `localePath`/`alternates` overloads require a slug for `caseStudy`; `LangSwitch` props are a union (`route: 'caseStudy'` needs `slug`).
- **Czech web copy (Martin, 2026-11-21):** any chunk that writes or changes Czech texts for the site (dictionaries, alt texts, meta descriptions, microcopy, CTA, form messages, privacy page wording) loads the `cesky-copywriting` skill (Skill tool) before writing and follows it. Project rules win over the skill: facts only from `docs/brief.md`, no invented content, visible `TODO`, vykání as in the prototype; the concept and prototype act as the brand guide. English texts stay faithful translations of the Czech.
- **Martin, 2026-11-21:** the 14 stock photos are placeholders only and never go live; no iPhone/HEIC photos will be used. Do not polish placeholder alt texts or captions.
- `pnpm build` = `astro build && pnpm check:exif` (scans `dist` for any metadata incl. ICC, PNG text, JPEG COM). Photo YAML `image` must point into `src/assets`. `minors` has no default for published real photos.
- Chunk D: photos live in `src/content/photos/*.yaml` + `src/assets/photos/*.jpg` (EXIF-free). Chunks E/F: keep `TEXT_OVER_PHOTOS` and `SHADE_OPACITY` in `scripts/check-contrast.ts` in sync with the real hero/fold photos and the `.shade` / `.shade.strong` gradient CSS.
- **Lead check 1 (after A–C, ON TRACK):**
  - Base: props are now `{ locale, title, description } & ({ route: StaticRoute } | { route: 'caseStudy'; slug })` (done in 1813b5c). Pages pass `route`, never a path. One `Locale` type from `@/i18n`.
  - E/F: `pricing.ts` has optional `turnaround` and `durationMax` (minutes); ServiceCard and JSON-LD (L) must handle both.
  - G: set GSAP start states and add `motion-ready` in the same frame. If GSAP arrives after the 3 s CSS fallback already showed content, skip entrance animations for that content (no re-hide flash, Review Focus 2).
  - I: pass `t(locale).inquiry` plus service/add-on labels as island props (calling `t()` in the island bundles both dictionaries). Add missing cs+en labels: phone, time from–to, guests, honeypot; errors for service, date, time, network, server. zod 4: `z.enum(SERVICE_IDS)`, `z.email()`, `z.url()`.
  - I/J (L1-02): Turnstile test keys must not live only in git-ignored `.dev.vars`: Playwright builds fresh, so put the public test keys in the `webServer` command (env var for the build, `--var TURNSTILE_SECRET:…` for wrangler dev).
  - J (L1-01): `@cloudflare/vitest-pool-workers` needs vitest ^4.1 (repo: 5.1.1). Test the D1 store with wrangler `getPlatformProxy()` and the migration SQL applied, in a separate vitest config. `waitUntil` from `locals.cfContext` (adapter 14), env from `cloudflare:workers` after `wrangler types`. Built config `dist/client/wrangler.json` keeps relative `migrations_dir`: run migrations with `-c wrangler.jsonc`.
  - M: Fonts API inlines 4 `<style>` blocks, so `style-src 'unsafe-inline'` stays unless Astro `security.csp` is used; one CSP source only. Check that the adapter's `/_astro/*` Cache-Control in `dist/client/_headers` merges with `public/_headers`.
- **From chunk E, for G:** set `html.motion-ready` in the same frame as the first GSAP state; it also switches the marquee from the wrapped list to the moving band (below the fold). If `html.reveal-fallback` (3 s timer in Base) is already set when GSAP arrives, skip entrance animations. Toggle `.blend` on `header.top` only over flat night/light sections (contrast); the blend is off on `:focus-visible`. Marquee toggle: label is constant, wire only `hidden` and `aria-pressed`. Photo placement (hero/folds) lives in `src/config/placement.ts`; `getPhoto()` returns `undefined` for a withdrawn photo and sections must render without it.
- **From FORM, for PERF (task 15):** `check:launch` must fail a production build without a mail provider configured (FORM could not add it). Worker types are generated by `pnpm types:worker` (git-ignored); their globals clash with DOM `Element.append`.
- If `pnpm test:e2e` fails once and passes on rerun, report which test (possible flake in the 3.5 s no-JS timing test).
- Playwright always builds fresh (`reuseExistingServer: false`); stop any running `pnpm preview` on port 8787 before `pnpm test:e2e`.
- **Lead check 2 (final, ON TRACK):** L2-01 fixed. Before task 16 see the Final report. `check:contrast` (concept R3) is manual, not part of the build; run it and the e2e contrast spec when the real photos arrive.

## State
- Run checkout / branch / remote branch: `/home/martin/dev/ruzek.photo` (project root, no T3 worktree) / `feat/rozpad-astro` / not pushed (public repo: push only on Martin's word)
- Orchestrator: this thread (Claude Opus 5.5, attended by Martin). No separate Sonnet orchestrator thread was asked for.
- Wake-up schedule id (bound to this thread, 45 min heartbeat): `scheduled-task:command:mcp:edbe4b1c-06b8-454d-a5ba-b91f25805a5e:schedule-task:rozpad-heartbeat`
- Current chunk: none (run finished)
- Model and reason: –
- taskId / clientRequestId (also in `.run/lock`): – / `none`
- Last lead check at commit / UI chunks accepted since the last browser check: f77b848 (lead 2) / 0
- Status: finished (2026-11-21, last commit 1f94fd1; heartbeat schedule deleted)
- Paused until (usage limit reset):
- Known baseline (failing checks that are not ours): none (no app code before the run)

## Progress
| Time | Chunk | Model | Result | Commits | Review rounds | Filed issues |
|---|---|---|---|---|---|---|
| 2026-11-21 | A | Sonnet 5.5 High | accepted | 7e7246f, d5b2235 (fixes by orchestrator) | 2 | 1 (T1-03 deferred to J) |
| 2026-11-21 | B | Sonnet 5.5 High | accepted | f49e9a9, a48d718 (fix agent), 80b976b (orchestrator: RZ2-09/10/11) | 2 | 2 (RZ2-04 disputed, RZ2-11 open) |
| 2026-11-21 | C | Sonnet 5.5 High | accepted | fb8c1d1, 69a4180, 5e318ae (fix agent), 8689b06 (orchestrator: T3-08) | 2 | 5 (T4-02, T3-09 deferred; 3 filed) |
| 2026-11-21 | lead 1 | Opus 5.5 High | ON TRACK | 1813b5c (orchestrator: L1-03/04/05) | – | L1-01, L1-02 as lead notes for I/J |
| 2026-11-21 | D | Sonnet 5.5 High | accepted | 65515b5, 90c7b05 (fix agent), e555642 (orchestrator: P5-13/14/15) | 2 | 3 (P5-08, HEIC declined by owner; P5-12 disputed) |
| 2026-11-21 | C2 | Sonnet 5.5 High | accepted | 760715a, 0c647b9 (orchestrator: C2-01…07) | 2 | 0 (all 7 fixed) |
| 2026-11-21 | E | Sonnet 5.5 High | accepted (E-14 carried into HOME step 0) | 90a597b, eac919b (fix agent), 719f0ff + 1c43936 (orchestrator: e2e port, E-17, E-18) | 2 | 4 (E-13, E-15, E-16 filed; E-04 rest open after 2 rounds) |
| 2026-11-21 | HOME (7–9) | Opus 5.5 Medium | accepted | 7c28bb3, a3bf1c3, 2406f1b, 0910ed8, 954e378 (fixes), 0b4c17b (orchestrator: HM-04 rest) | 2 | 8 (HM-07 disputed/accepted; 6 open after 2 rounds, 2 carried into SITE) |
| 2026-11-21 | FORM (10–12) | Opus 5.5 Medium | accepted, merged 3d55935 | 3f02645, 3b18d94, 914e1f9, 4b6ae26 (fixes), b703291 (orchestrator: FM-13, FM-16) | 2 | 6 (FM-05, FM-11, FM-14 filed; FM-01 rest open; FM-15 disputed) |
| 2026-11-21 | SITE (13–14) | Opus 5.5 Medium | accepted | 1b23163, 2de36bb, 0438536, e29d698, 4980f30, 0ba63ff, 7fbb5fc (fixes) | 2 | 4 (ST-06, ST-07, ST-13 filed; ST-02 rest 18 filed) |
| 2026-11-21 | PERF (15) | Sonnet 5.5 High | accepted | 2eec616, 6ab05d1, 00cddf3, 20ed9e9, 5e4e202, 7315fbd, a9e0f7f (fixes) | 2 (+ restart 2b after an approval stall) | 5 (PF-10, PF-12, PF-13, PF-14 filed; 2 budgets fail on purpose) |
| 2026-11-21 | browser 1 | Codex gpt-6.2-sol High | 5 pass, 1 fail, 1 not run | f77b848 (orchestrator: BR-01) | – | 1 (reduced motion not run) |
| 2026-11-21 | lead 2 (final) | Opus 5.5 High | ON TRACK | 1f94fd1 (orchestrator: L2-01) | – | 0 |
