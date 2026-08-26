---
name: front-end-checklist
description: Audit a front-end codebase or page against the comprehensive Front-End-Checklist (thedaviddias/Front-End-Checklist) covering HTML/head, CSS, JS/performance, images/media, Core Web Vitals, forms, accessibility (WCAG 2.1), SEO/metadata, security, testing, privacy/compliance, and i18n. Use when the user asks to "check FE", "audit accessibility/SEO", "run the front-end checklist", or before shipping a new page/feature.
---

# Front-End Checklist

Source: https://github.com/thedaviddias/Front-End-Checklist (MIT). This file is a static,
project-local adaptation — the upstream repo has grown into a full web app (checklists.io);
this skill captures its checklist content directly as markdown so it can be applied without
network access or an account.

## How to use this skill

1. Identify what's being audited: the whole site, one page/route, or a specific PR's diff.
2. Walk every section below relevant to the artifact under review. Skip sections that
   genuinely don't apply (e.g. "Internationalization" for a single-locale internal tool) —
   but say so explicitly rather than silently ignoring them.
3. For each unchecked item found, classify it: **Must fix** (broken functionality,
   accessibility blocker, security hole) vs **Should fix** (real gap, not urgent) vs
   **Not applicable** (with a one-line reason).
4. Prefer fixing the check-list violations directly over just reporting them, unless the fix
   is large enough to need its own plan/discussion.
5. Don't gold-plate: this is a checklist for a real, shipping product, not a certification
   exercise. A small internal tool doesn't need a Content-Security-Policy header audit with
   the same rigor as a public payment page — use judgment about impact vs effort per item.

## HTML & Head
- [ ] UTF-8 charset declared first in `<head>`
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` present, never disables zoom
- [ ] `lang` attribute set on `<html>` with a valid BCP 47 code
- [ ] HTML5 doctype
- [ ] Favicons for all relevant devices/sizes (including apple-touch-icon)
- [ ] Web App Manifest linked if any PWA behavior is expected
- [ ] Every `id` in the document is unique
- [ ] Semantic HTML5 elements used appropriately (`<nav>`, `<main>`, `<article>`, `<section>`, not divs for everything)
- [ ] Correct `type` attributes on form inputs (email, tel, number, etc.)
- [ ] Subresource Integrity hashes on any external `<script>`/`<link>` pulled from a CDN

## CSS & Styling
- [ ] CSS minified in production builds
- [ ] Non-critical CSS loaded async; critical above-the-fold CSS inlined or loaded early
- [ ] Specificity kept low, no deep selector nesting
- [ ] Design tokens via CSS custom properties (or the framework's equivalent, e.g. Tailwind theme)
- [ ] `prefers-color-scheme` supported if dark mode is a stated goal (not required otherwise)
- [ ] Relative units (rem/em/%) preferred over hardcoded px for anything text-related
- [ ] No dead/unused CSS left behind after a refactor
- [ ] Animations use `transform`/`opacity` only (GPU-friendly), not `top`/`left`/`width`/`height`
- [ ] Visible focus indicators on every interactive element (never `outline: none` without a replacement)
- [ ] No horizontal scroll at any standard viewport width
- [ ] Logical properties (`margin-inline-start` etc.) used if RTL/i18n is in scope

## JavaScript & Performance
- [ ] Scripts loaded with `defer`/`async`/`type="module"` as appropriate — never a blocking `<script>` in `<head>`
- [ ] JS minified in production builds
- [ ] `const`/`let` used, never `var`
- [ ] High-frequency events (scroll, resize, input) debounced/throttled
- [ ] Code-split by route/feature (dynamic import) so initial bundle stays lean
- [ ] Event delegation used for large/dynamic lists instead of one listener per row
- [ ] DOM read/write batched to avoid forced reflow
- [ ] No `eval()` or other unsafe dynamic code execution
- [ ] No leftover `console.log`/`console.debug` in code shipped to the browser
- [ ] Errors caught and handled (no unhandled promise rejections surfacing to the user as a blank screen)

## Images & Media
- [ ] Meaningful `alt` text on every informative image; `alt=""` on purely decorative ones
- [ ] Images compressed without visible quality loss
- [ ] Explicit `width`/`height` (or `aspect-ratio`) on every `<img>` to prevent layout shift
- [ ] Responsive images via `srcset`/`sizes` (or the framework's image component) for anything above a thumbnail
- [ ] Modern formats (WebP/AVIF) used with a fallback where the framework doesn't handle it automatically
- [ ] Below-the-fold images lazy-loaded (`loading="lazy"`); above-the-fold hero images NOT lazy-loaded (use `fetchpriority="high"`/`priority` instead)
- [ ] SVGs optimized (no editor cruft, no unnecessary precision)

## Performance & Core Web Vitals
- [ ] Page load reasonably fast on a throttled connection (rough budget: <3s to interactive)
- [ ] Total page weight kept reasonable for the content (rough budget: <1.5MB for a typical content page)
- [ ] LCP (Largest Contentful Paint) target: < 2.5s
- [ ] CLS (Cumulative Layout Shift) target: < 0.1
- [ ] INP (Interaction to Next Paint) target: < 200ms
- [ ] `preconnect`/`preload`/`prefetch` used for known-critical cross-origin resources, not sprinkled everywhere
- [ ] `Cache-Control` headers set appropriately for static assets
- [ ] Text compression enabled (gzip/brotli) at the server/CDN layer
- [ ] Loading indicators shown for any async operation the user is waiting on

## Forms & Validation
- [ ] Every input has a **programmatically associated** `<label>` (via `for`/`id`, or `aria-label` for dense/inline cases) — placeholder text alone is never sufficient
- [ ] Semantic `type` attributes trigger the right mobile keyboard (email, tel, number, url)
- [ ] Validation errors are specific, appear near the field, and are announced to assistive tech (`aria-describedby` / `role="alert"`)
- [ ] File upload inputs are keyboard-accessible and communicate accepted types/size limits
- [ ] Search inputs are reachable and usable via keyboard
- [ ] Pasting into fields is never blocked (password managers, OTP codes)
- [ ] One label per field, no ambiguous shared labels
- [ ] Public forms have basic abuse protection (rate limiting, CAPTCHA, or equivalent) proportional to their risk

## Accessibility (WCAG 2.1 AA baseline)
- [ ] Full keyboard operability, logical tab order, no keyboard traps
- [ ] Every interactive element has an accessible name (visible text, `aria-label`, or `aria-labelledby`)
- [ ] Icon-only buttons have an accessible name
- [ ] Text contrast ≥ 4.5:1 (normal text) / ≥ 3:1 (large text ≥18pt or 14pt bold)
- [ ] Content reflows/remains usable at 200% text zoom and 400% viewport zoom
- [ ] Heading hierarchy is sequential (no skipped levels), one `<h1>` per page
- [ ] Dynamic content changes announced via an appropriate ARIA live region
- [ ] A skip-to-main-content link exists for keyboard users
- [ ] Modals trap focus while open and return focus to the trigger on close; Escape closes them
- [ ] Tab components follow the standard ARIA tabs keyboard pattern
- [ ] Semantic list markup (`<ul>`/`<ol>`/`<dl>`) used for actual lists
- [ ] Data tables have proper `<th>`/`scope` associations
- [ ] `prefers-reduced-motion` respected — non-essential animation reduced/disabled when requested
- [ ] Decorative elements hidden from the accessibility tree (`aria-hidden="true"`)
- [ ] Pinch-zoom is never disabled via the viewport meta tag
- [ ] Color is never the sole carrier of meaning (pair with icon/text)

## SEO & Metadata
- [ ] Unique, descriptive `<title>` per page
- [ ] Meta description present, ~50–160 characters, unique per page
- [ ] Canonical URL set on every page
- [ ] XML sitemap generated and reachable at `/sitemap.xml`
- [ ] `robots.txt` present with valid directives and a `Sitemap:` line
- [ ] `hreflang` tags present if multiple locales are served
- [ ] Structured data (JSON-LD) added where it earns rich results (Product, Article, BreadcrumbList, Organization, FAQPage as applicable)
- [ ] Open Graph tags for social sharing (title, description, image, type)
- [ ] Twitter Card meta tags
- [ ] URL slugs are descriptive, lowercase, hyphenated — not opaque IDs
- [ ] No duplicate meta descriptions across distinct pages
- [ ] No broken internal or external links

## Security
- [ ] Served over HTTPS in production; HTTP redirects to HTTPS (this test environment on a bare IP is an explicitly accepted exception — see project README)
- [ ] Sensible security headers where the deployment target supports them: `X-Content-Type-Options: nosniff`, `X-Frame-Options`/frame-ancestors CSP, `Referrer-Policy`
- [ ] Auth tokens stored in `httpOnly` cookies (or equivalent), never `localStorage`, for anything session-critical
- [ ] `rel="noopener noreferrer"` on every `target="_blank"` link
- [ ] No secrets/API keys committed to the repo or shipped to the browser bundle
- [ ] No raw payment card data stored (delegate to the payment provider)
- [ ] Stack traces / internal error details never shown to end users in production

## Testing & Monitoring
- [ ] Critical user flows have automated test coverage (unit and/or e2e)
- [ ] Tests actually run and pass before merging (CI or an equivalent manual gate)
- [ ] Cross-browser sanity check on the flows that matter most
- [ ] A real mobile-viewport check, not just desktop devtools resize

## Privacy & Compliance
- [ ] Privacy Policy linked in the footer
- [ ] Terms of Service linked in the footer, for anything with accounts/purchases
- [ ] Cookie consent shown before any non-essential tracking cookie is set, if applicable to the deployment's audience
- [ ] Only the minimum necessary personal data is collected

## Internationalization (only if multi-locale is in scope)
- [ ] `Intl` APIs used for date/number/currency formatting, not manual string building
- [ ] Layouts tolerate text expansion (translated strings can run 30–50% longer)
- [ ] `dir` attribute set correctly for RTL locales
