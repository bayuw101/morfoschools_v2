# Frontend Interaction Contract

This contract locks behavior for future Morfoschools module pages without changing the approved Phase 1.5 visual design.

## Buttons and Controls

Required states: idle, hover, focus-visible, pressed/active, loading, disabled, and error-adjacent where relevant.

Rules:
- Adjacent controls in a header/filter row must have equal height.
- Loading buttons keep label context and prevent double submit.
- Disabled controls explain why when the reason is not obvious.

## Mutating Actions

Create/update/delete/publish/import/export actions must show professional feedback:
- optimistic or pending UI where safe,
- toast/status message on success,
- structured error message on failure,
- no native `alert`, `confirm`, or browser validation chrome.

## Row-Level Loading

For list/table row actions, keep the row visible and show action-local loading instead of blocking the full page unless the whole page is being refreshed.

## Destructive Confirmation

Use the centered `ConfirmDialog` pattern for destructive actions. Form drawers are for forms only and must not become confirmation modals.

## Loading, Empty, Error

Backend-wired pages must start with empty collections plus skeletons. Do not initialize API pages with dummy/mock rows that can flash before fetch completes.

## Form Behavior

Use custom validation UI and schema-driven validation for module forms. Native browser validation chrome is forbidden.

## API Error Mapping

Frontend clients should normalize backend envelopes using canonical `code`, transitional `error`, `message`, `requestId`, and optional `fieldErrors`.
