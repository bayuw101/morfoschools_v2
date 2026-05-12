# Security Review Protocol

Status: Required evidence template for ISSUE-032 and later modules.

Security review is mandatory for every backend-wired module. Frontend role/menu hiding is never considered sufficient security.

## Review Areas

| Area | Required Checks |
|------|-----------------|
| Authentication | Protected endpoints reject missing/invalid sessions with `401` before domain work. |
| Authorization | Backend RBAC rejects missing permissions with `403`; tests cover allowed and denied cases. |
| Tenant isolation | List/detail/write queries are scoped by session/effective tenant, not trusted body tenant IDs. |
| Master act-as | Master/platform users require explicit effective tenant for tenant-scoped work. |
| Relationship writes | Linked records/roles/memberships are validated inside the same tenant. |
| CSRF/session | Unsafe browser requests require the project CSRF/session contract. |
| Idempotency/retry safety | Retry-sensitive writes have an idempotency strategy or documented non-retry behavior. |
| Audit | Mutating actions emit audit events with actor, tenant/effective tenant, action, resource type/id, and request ID where applicable. |
| Sensitive data | Responses do not expose password hashes, raw tokens, cookies, CSRF values, provider secrets, or internal-only security fields. |
| Validation | Invalid JSON/body/field errors return structured envelopes and do not leak stack traces. |
| AI action safety | Any future agent-callable action has manifest permissions, confirmation gate, success proof, and failure cases. |

## Required Negative Tests

Every module with tenant-scoped data should include at least:

- unauthenticated request rejected;
- authenticated user without permission rejected;
- tenantless master without effective tenant rejected for tenant-scoped endpoints;
- cross-tenant data is not listed or assignable;
- write action emits audit event;
- sensitive fields are omitted from response.

## Evidence Format

Add this section to the module review note:

```md
## Security Review Evidence

### Auth/RBAC
- [ ] Unauthenticated access returns 401.
- [ ] Missing permission returns 403.
- [ ] Allowed role succeeds.

### Tenant Isolation
- [ ] List/detail scoped by effective tenant.
- [ ] Cross-tenant fixture is not visible/assignable.
- [ ] Master admin requires/selects effective tenant where applicable.

### Session/CSRF/Idempotency
- [ ] Unsafe requests respect CSRF contract.
- [ ] Retry-sensitive writes handle idempotency or document why not needed.

### Audit
- [ ] Create/update/deactivate/link actions emit audit event(s).

### Sensitive Data
- [ ] Responses omit raw tokens/secrets/password hashes/security internals.

### AI Tool Safety
- [ ] AI manifest includes permissions, confirmation, success proof, and failure cases.

### Commands / Evidence
- ...
```

## Rules

- Do not trust client-provided tenant IDs for tenant-scoped actions.
- Do not let audit failures silently pass for admin writes unless explicitly approved as best-effort.
- Do not document an AI action that bypasses RBAC, CSRF/session, confirmation, or audit.
- Do not print credentials/tokens/secrets in completion notes or user-facing summaries.
