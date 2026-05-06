# Clean Scope Note — ISSUE 0-11

Target `morfoschools` is a clean rewrite target. `morfoschools_prototype` is reference/read-only.

Correction applied:

- Removed broad copied prototype routes from `frontend/src/app/(app)/app`.
- Kept only the current scope:
  - `/`
  - `/login`
  - `/app`
  - `/app/gallery`
  - `/ui-gallery`
  - `/api/ai-chat` as local demo response only.
- Login is explicitly `demo-local`; it stores a local browser session and does not call backend auth.
- Backend remains a clean Go foundation with only `/healthz` and `/readyz`.
- Backend auth, CRUD, exam APIs, real AI tooling, and tenant data flows must be implemented later as separate TDD vertical slices.

Verification after cleanup:

- `PATH=/usr/local/go/bin:$PATH gofmt -w cmd/api/main.go`
- `PATH=/usr/local/go/bin:$PATH go test ./...`
- `npm audit` => 0 vulnerabilities
- `npm test` => 6 files, 31 tests passed
- `npm run build` => passed; generated only clean-scope routes
- Browser smoke passed for `/login`, `/app`, and `/app/gallery`.
