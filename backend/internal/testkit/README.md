# Backend Testkit

Helpers for upcoming handler-boundary and RBAC tests.

- `NewFixture()` creates deterministic tenant/user/session IDs.
- `WithPermission()` builds concise permission fixtures.
- `NewJSONRequest()` creates JSON HTTP requests.
- `AttachAuth()` and `AttachTenant()` add test auth/tenant headers for handler tests during pre-auth wiring.
- `DecodeJSON()` and `AssertStatus()` reduce handler assertion boilerplate.

Production handlers must still derive tenant/auth from trusted middleware once Phase 2 session auth is live.
