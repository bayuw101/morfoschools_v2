# Backend Middleware Stack

Order for the HTTP lifecycle:

1. Request ID: accept `X-Request-ID` or generate a `req-*` ID and add it to response headers and context.
2. Recovery: recover panics, log with request ID, and return JSON error envelope.
3. Security headers: apply baseline browser hardening headers.
4. CORS: answer allowed preflight requests for browser clients.
5. Body size limit: reject oversized request bodies before handlers parse JSON.
6. Tenant context: resolve tenant identity from trusted session context or development header while auth is still being wired.
7. Auth/session: resolve authenticated subject; browser session implementation lives in Phase 2.
8. RBAC authorization: handlers must require explicit permissions for domain actions.
9. CSRF: unsafe browser methods must validate a CSRF token once cookie session auth is live.
10. Idempotency key: mutating/retry-safe endpoints should record idempotency keys.
11. Audit writer: write durable audit events after successful sensitive mutations.

Current Phase 4 foundation provides the testable stack primitives and documents placeholders for auth/RBAC/CSRF/idempotency/audit enforcement. Domain modules must not rely on frontend role visibility as authorization.
