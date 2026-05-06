# UI Source of Truth

Reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`
Audit date: 2026-05-06

## Non-negotiable Rule

Do not improvise UI without explicit user approval. Target UI must be based on `morfoschools_prototype` canonical surfaces below, then implemented deliberately in the target repo. Prototype is read-only; do not full-copy it.

## Canonical Prototype Surfaces

| UI Area | Canonical Prototype File(s) | Target Use |
|---|---|---|
| Design tokens/global style | `frontend/src/app/globals.css` | OKLCH tokens, typography feel, background, shadows, borders, glass surfaces. |
| Landing page `/` | `frontend/src/app/page.tsx`, `frontend/src/components/landing/*` | Marketing tone and premium SaaS composition. |
| Login `/login` | `frontend/src/app/(auth)/login/page.tsx`, `login-domain.ts` | Auth card geometry, school context copy, premium background. |
| App shell | `frontend/src/components/layout/app-shell.tsx` | Main shell structure, content width, sidebar/header/sidecar layout. |
| Sidebar | `frontend/src/components/layout/sidebar.tsx` | Navigation density, active states, icons, hierarchy. |
| Mobile nav | `frontend/src/components/layout/mobile-nav.tsx` | Responsive navigation behavior. |
| Header/topbar | `frontend/src/components/layout/topbar.tsx` | Page title/metadata area, theme/action controls, equal-height controls. |
| User button | `frontend/src/components/layout/user-button.tsx` | Account affordance and menu shape. |
| AI Agents sidecar | `frontend/src/components/layout/ai-chat-panel.tsx` | Dark sidecar shell, scroll preservation, composer placement. |
| Dashboard `/app` | `frontend/src/app/(app)/app/page.tsx`, `dashboard-domain.ts` | Metric cards, operational cards, realistic school activity. |
| UI Gallery `/app/gallery` | `frontend/src/app/(app)/app/gallery/page.tsx`, `gallery-domain.ts` | Base component catalog and visual regression reference. |
| Course header pattern | `frontend/src/app/(app)/app/courses/page.tsx` | Header/filter/action control proportions for later modules. |
| Exam surfaces | `frontend/src/app/(app)/app/exams/**`, `exam-gate`, `take-exam` | Future critical exam UI references only; not current scope. |

## Canonical Base Components

Use these prototype components as behavior/shape reference when implementing equivalent target components:

- `components/ui/button.tsx`
- `components/ui/badge.tsx`
- `components/ui/alert.tsx`
- `components/ui/field-shell.tsx`
- `components/ui/text-field.tsx`
- `components/ui/textarea-field.tsx`
- `components/ui/select-field.tsx`
- `components/ui/floating-input.tsx`
- `components/ui/floating-select.tsx`
- `components/ui/datetime-field.tsx`
- `components/ui/date-range-picker.tsx`
- `components/ui/date-stepper.tsx`
- `components/ui/input-group.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/modal.tsx`
- `components/ui/confirm-dialog.tsx`
- `components/ui/right-pull-sheet.tsx`
- `components/ui/panel.tsx`
- `components/ui/progress.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/tabs.tsx`
- `components/ui/mini-tabs.tsx`
- `components/ui/toast.tsx`
- `components/ui/logo-lockup.tsx`
- `components/ui/stock-avatar.tsx`

## Pixel-Perfect Rules

1. Preserve the approved premium Morfosis feel: realistic SaaS school dashboard, not generic admin template.
2. Preserve shell geometry: sidebar, header/topbar, content rhythm, AI sidecar placement, responsive mobile navigation.
3. Preserve typography feel: Space Grotesk/Manrope style, confident headings, readable body hierarchy.
4. Preserve OKLCH-based palette and subtle glass/shadow/border treatment.
5. Do not introduce neon, AI-looking gradients, random purple/blue blobs, or unrelated visual languages.
6. Form controls in the same row must have equal height and aligned baselines.
7. Headers and action rows should mirror `/app/courses` proportions unless a later approved design says otherwise.
8. Backend-wired pages must start from skeleton/empty/error states; no dummy initial rows before fetch.
9. Every frontend action/button must show loading/disabled feedback.
10. Student exam flow must use Exam Gate before take-exam.
11. ConfirmDialog is a centered modal.
12. Form drawer is pulled-right inside AppShell, non-modal/no blur overlay, background remains clickable/copyable, closes only via X.
13. AI chat sidecar uses the dark shell and must preserve scroll behavior.
14. UI Gallery is the smoke-test surface for base components before applying them to modules.

## Allowed Improvements

Allowed without changing the approved visual language:

- Loading, disabled, optimistic, and pending states.
- Skeleton, empty, and error states.
- Accessibility fixes: focus rings, labels, keyboard semantics, ARIA where useful.
- Responsive polish for mobile/tablet.
- Contrast/readability fixes when prototype glass surfaces are too faint.
- Cleaner target repo structure and imports.
- Safer form validation and Zod-backed domain helpers.
- Removing prototype-only/demo/internal surfaces from clean target scope.

## Forbidden Without Approval

- New visual language.
- Generic dashboard templates.
- Neon/AI-looking gradients.
- Replacing shell geometry/spacing/chrome with invented variants.
- Native/cramped/default browser controls where custom Morfosis controls exist.
- Duplicate controls for the same action.
- Backend-wired fake data that flashes before real fetch.
- Full-copying prototype modules into target.
- Adding routes outside approved clean rewrite scope unless a later issue explicitly requires it.

## Target Clean Scope UI Surfaces

Current clean rewrite UI scope:

- `/`
- `/login`
- `/app`
- `/app/gallery`
- `/ui-gallery`
- `/api/ai-chat`

UI base is considered complete per user direction, but this source-of-truth remains binding for future module work.

## Review Checklist For Every New UI Module

- [ ] Matches canonical shell/header/control rhythm.
- [ ] Uses Morfosis custom controls, not default cramped browser UI.
- [ ] Has loading states for all actions.
- [ ] Has skeleton/empty/error states if backend-wired.
- [ ] Avoids dummy initial rows after API wiring.
- [ ] Uses ConfirmDialog vs form drawer correctly.
- [ ] Keeps AI sidecar behavior intact.
- [ ] Does not add unapproved visual language.
