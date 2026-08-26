---
name: ui-ux-pro-max
description: UI/UX design intelligence for reviewing, fixing, or building web interfaces — accessibility, touch/interaction, performance, style consistency, responsive layout, typography/color, animation, forms/feedback, navigation, and charts/data viz. Use when designing a new page/component, doing a UI polish pass, or when the user says a UI "doesn't look professional" or asks for a UI/UX review.
---

# UI/UX Pro Max (project-local adaptation)

Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT). The upstream skill ships
a Python search tool over CSV databases (192 color palettes, 74 font pairings, etc.) installed
via `npm install -g ui-ux-pro-max-cli` — that installer isn't available in this environment, so
this is a static adaptation: the full **quick-reference rule set** (`references/quick-reference.md`,
fetched verbatim from upstream) is embedded locally instead of being fetched via the search tool.
If a future session has the real CLI installed, prefer the live searchable version — it has more
depth (palettes, font pairings, icon sets) than this static copy.

## When to use this

- Building a new page, component, or design system from scratch.
- Reviewing/auditing existing UI for professionalism, consistency, or accessibility gaps.
- The user says something "doesn't look professional," "feels off," or asks for a UI/UX pass.
- Before shipping any customer-facing page.

## Priority order (fix in this order when triaging findings)

1. **Accessibility** (CRITICAL) — contrast, focus states, keyboard nav, form labels, ARIA.
2. **Touch & Interaction** (CRITICAL, for anything touch-usable) — target sizes, tap feedback, loading states.
3. **Performance** (HIGH) — image optimization, CLS prevention, bundle splitting.
4. **Style Selection** (HIGH) — consistency, no emoji-as-icons, palette matches the product/industry.
5. **Layout & Responsive** (HIGH) — mobile-first, breakpoints, no horizontal scroll.
6. **Typography & Color** (MEDIUM) — line-height, contrast pairs, semantic tokens.
7. **Animation** (MEDIUM) — purposeful motion, respects `prefers-reduced-motion`.
8. **Forms & Feedback** (MEDIUM) — labeled inputs, error recovery, loading/success states.
9. **Navigation Patterns** (HIGH when navigation is the subject) — predictable, state-preserving.
10. **Charts & Data** (LOW unless the product is data-heavy).

## Full rule set

The complete, verbatim upstream rule set (all 10 categories, every rule with its rationale) is
in `references/quick-reference.md` — load it whenever doing a real audit pass rather than relying
on the priority summary above, which is intentionally abbreviated.

## Web pre-delivery checklist (adapted from upstream's native/mobile `pro-rules.md` — items that
only apply to iOS/Android/React Native are dropped; WCAG/web-specific items kept and prioritized)

### Visual Quality
- [ ] No emojis used as icons anywhere (SVG only — Heroicons/Lucide or equivalent)
- [ ] One consistent icon family/stroke-width across the whole product
- [ ] Pressed/hover states use color/opacity/elevation, never layout-shifting transforms
- [ ] Semantic color tokens used consistently — no ad-hoc hardcoded hex values scattered through components

### Interaction
- [ ] Every clickable element has `cursor: pointer`
- [ ] Buttons show a loading state and are disabled during async operations (no double-submit)
- [ ] Touch targets ≥ 44×44 CSS px (Apple) or the web-specific WCAG 2.2 minimum of 24×24 CSS px, whichever the context calls for — err toward 44px on primary actions
- [ ] ≥ 8px gap between adjacent touch targets
- [ ] Disabled elements are visually distinct (reduced opacity) and non-interactive, not just styled differently

### Contrast (light and dark, if dark mode exists)
- [ ] Body text contrast ≥ 4.5:1 against its background
- [ ] Large text (≥18pt or 14pt bold) contrast ≥ 3:1
- [ ] Non-text meaningful UI (icons, borders that convey structure) ≥ 3:1
- [ ] Interaction states (hover/focus/disabled) remain distinguishable in both themes if dark mode exists
- [ ] Modal/drawer scrims are dark enough to isolate foreground content against the actual background behind them

### Layout
- [ ] Mobile-first: verified at 375px width, then 768px, 1024px, 1440px
- [ ] No horizontal scroll at any of those widths
- [ ] Fixed headers/footers don't cover content when scrolling to the bottom/top
- [ ] Consistent max-width container on desktop (no content stretching edge-to-edge on a 1440px+ screen)
- [ ] 4/8px spacing rhythm maintained across component, section, and page level

### Accessibility
- [ ] Decorative icons next to visible text are `aria-hidden="true"`
- [ ] Meaningful icon-only controls have an accessible name (`aria-label`)
- [ ] Form fields have real associated labels, not placeholder-only
- [ ] Color is never the only indicator of state/meaning
- [ ] `prefers-reduced-motion` is respected — motion reduces/disables when requested
- [ ] Sticky headers/overlays never obscure the currently keyboard-focused element
- [ ] Any drag-to-reorder or swipe-only interaction has a button/keyboard alternative
- [ ] Failed form submission keeps inline field errors visible; for multi-error forms, focus moves to an error summary linking to each invalid field

## Notes for this project specifically

Phong Chau's brand palette (`frontend/tailwind.config.js`) is derived from the real logo:
`brand-50`..`brand-900` (indigo/blue) plus `accent-500`. When applying `color-palette-from-product`
/ `style-match` guidance, treat this as the fixed palette — don't propose a different one; audit
*usage* of it (contrast, consistency) rather than proposing a replacement.
