# Browser Smoke Test Protocol

Status: Required evidence template for ISSUE-032 and later modules.

Browser smoke tests prove the module works as a user journey, not only as isolated unit tests. Use the real local app surfaces whenever possible.

## Standard Environment

```txt
Frontend: http://localhost:1666
Backend:  http://localhost:8080
```

Use seeded development users, but do not print raw passwords, session cookies, CSRF tokens, or bearer tokens in review notes or chat summaries.

## Required Smoke Matrix per Module

For every backend-wired admin module, record:

| Area | Required Evidence |
|------|-------------------|
| Login/session | User can login, reach `/app`, and session shell shows real async session identity. |
| Route access | Authorized role can open the module route. Unauthorized/limited role is denied or does not see forbidden actions. |
| Initial loading | Page renders skeletons while API data loads; no dummy rows flash before fetch resolves. |
| Empty state | Empty result is clear, professional, and action-aware. |
| Error state | API failure renders non-destructive error UI with retry/recovery path. |
| List/search/filter | Search/filter/pagination operate on real API data or documented backend parameters. |
| Create flow | Form opens, validates with custom UI, shows loading, saves via API, and list updates/refetches. |
| Edit flow | Existing values load correctly, custom controls sync correctly, loading/error/success states appear. |
| Deactivate/delete flow | Shared ConfirmDialog appears; mutation shows loading; result is reflected without native confirm/alert. |
| Logout/protected route | Logout works and protected route blocks after session removal. |

## Role Smoke Requirements

Minimum for ISSUE-032 Users:

- `master_admin`: login without default tenant, switch/select demo tenant, manage users in effective tenant.
- `school_admin`: manage users in own tenant.
- `teacher` or another limited role: verify denied management access or hidden forbidden actions are not the only backend security boundary.

For later modules, pick roles relevant to the module and include at least one denied role.

## Evidence Format

Add this section to the module review note:

```md
## Browser Smoke Evidence

- Environment:
  - Frontend: http://localhost:1666
  - Backend: http://localhost:8080
- Date/time:
- Browser/tool:
- Seeded role(s):

### Flow Results
- [ ] Login/session verified.
- [ ] Authorized route access verified.
- [ ] Denied/limited role behavior verified.
- [ ] Initial skeleton verified.
- [ ] Empty state verified.
- [ ] Error/retry state verified or blocker documented.
- [ ] Create flow verified.
- [ ] Edit flow verified.
- [ ] Deactivate/delete flow verified.
- [ ] Logout/protected-route blocking verified.

### Notes / Blockers
- ...
```

## Rules

- Do not mark browser smoke complete if backend or frontend is not running; document the blocker.
- Do not accept a route that only works with localStorage fake identity once it is backend-wired.
- Do not use native browser confirm/alert/validation as passing evidence.
- Do not claim success based only on HTTP 200 if the UI journey is broken.
