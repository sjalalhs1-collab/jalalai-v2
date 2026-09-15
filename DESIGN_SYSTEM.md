# JalalAI Design System

Distilled from the UI/UX Pro Max skill's published rule set (`ui-ux-pro-max` — MIT-licensed,
external project), applied to this codebase's actual colors and components. This is a reference
for anyone (human or Claude) doing UI work on this project going forward, so design decisions stay
consistent instead of being re-litigated per page.

## Source and honesty note
The rules below are read directly from the skill's `templates/base/quick-reference.md` and
`data/*.csv`. Icons in `home.html` are original, hand-authored SVGs inspired by the skill's
*semantic* icon guidance (which icon concept fits which purpose, when to mark decorative vs.
meaningful) — they are not copies of Phosphor's or any other library's actual vector paths, since
this project ships static HTML/CSS/JS with no build step or npm dependency, and the skill's icon
catalog only ships React import statements, not raw SVG path data.

## Color tokens in use (public/home.html, public/account.html)
| Token | Hex | Verified contrast on `--bg` (#0A0A10) |
|---|---|---|
| `--ink` (primary text) | #F5F6FB | 18.3:1 |
| `--muted` (secondary text) | #9A9DB5 | 7.4:1 (6.8:1 on `--surface`) |
| `--gold` (accent) | #F4C15C | 11.9:1 |
All exceed the skill's rule 6 (WCAG AA, 4.5:1 minimum for body text). Computed with a real
luminance/contrast formula, not eyeballed — see RELEASE_NOTES.txt v1.9.16.

## Rules actually applied in this codebase
1. **Accessibility (skill priority 1, CRITICAL)**
   - Every form control has a real `<label>`, not placeholder-only text (`index.html` task
     textarea/file input/mode select; `account.html` email/password fields).
   - Focus is never hidden: removed `outline:none` without replacement (`account.html`); added
     `:focus-visible` rings across buttons/links/inputs.
   - Decorative icons beside visible text get `aria-hidden="true"` (home.html capability icons);
     the toggle buttons in `index.html` expose real state via `aria-pressed`, not just a CSS class.
2. **Touch & interaction (priority 2, CRITICAL)** — buttons use 11–12px vertical padding, giving
   comfortable tap targets on mobile; verify against 44×44px if you add smaller icon-only buttons.
3. **Style selection (priority 4)** — SVG icons only, no emoji-as-icon, matching the skill's
   explicit anti-pattern warning.
4. **Typography & color (priority 6)** — body text is 16px base (`.9rem`–`1rem`), line-height
   1.5–1.65, semantic CSS custom properties instead of raw hex scattered through components.
5. **Animation** — `prefers-reduced-motion` respected (`html{scroll-behavior:auto}` override in
   both `home.html` and existing pages).

## Not yet audited
- Forms & Feedback (priority 8): error messages in `index.html` now use `role="alert"` but have
  not been reviewed for placement relative to the field they describe.
- Navigation patterns (priority 9): only relevant once the site has more than the current 4 pages.
- Charts & data (priority 10): not applicable yet — no charts exist in the product.

## How to extend this
If you add a new page or component, check it against `templates/base/quick-reference.md` in the
`ui-ux-pro-max` skill (priorities 1–3 first — accessibility, touch targets, performance) before
worrying about visual polish. Fix violations, don't just note them.
