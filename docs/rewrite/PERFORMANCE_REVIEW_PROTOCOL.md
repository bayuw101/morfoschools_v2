# Performance Review Protocol

Status: Required evidence template for ISSUE-032 and later modules.

Performance review keeps admin modules responsive on low-spec VPS infrastructure and protects the exam-critical path from accidental heavy dependencies.

## Baseline Principles

- Prefer simple, indexed PostgreSQL queries for transactional/admin paths.
- Keep PgBouncer-compatible connection behavior.
- Do not introduce ClickHouse, AI providers, Google APIs, or other external services into exam critical path behavior.
- Frontend pages must show perceived-performance polish: skeletons, row-level loading, and non-blocking error recovery.
- Avoid dummy data flashes; initial API-backed collections start empty with explicit loading state.

## Backend Checks

For every module, review:

- list query filters and ordering;
- pagination boundaries and default limits;
- indexes used by tenant/status/search lookups;
- N+1 query risk;
- transaction scope for writes;
- relationship validation query shape;
- audit insert cost;
- connection/resource behavior under repeated browser actions.

For exam-critical modules, additionally review:

- no heavy joins in runtime student gate/take/submit path;
- materialized eligibility usage;
- append-only/inbox/idempotency path;
- no dependency on AI, Google, ClickHouse, external webhooks, or analytics path;
- clear degradation behavior if cache/analytics/AI is unavailable.

## Frontend Checks

For every module, verify:

- skeleton renders before data resolves;
- empty/error states avoid layout jump;
- list/search/filter interactions remain responsive;
- row-level mutations do not block the whole page unnecessarily;
- forms avoid expensive uncontrolled re-renders where practical;
- no large hidden mock data arrays remain in API-backed pages;
- pagination or server-side filtering is planned for large directories.

## Evidence Format

Add this section to the module review note:

```md
## Performance Review Evidence

### Backend Query/Index Review
- List query:
- Pagination/default limit:
- Relevant indexes:
- N+1 risk:
- Transaction scope:

### Frontend Perceived Performance
- [ ] Initial skeleton state verified.
- [ ] Empty/error states verified.
- [ ] Row-level mutation loading verified.
- [ ] No dummy initial API rows.
- [ ] Large-list behavior documented.

### Critical Path Notes
- Exam critical path impact: none / described below.
- External dependency impact: none / described below.

### Commands / Evidence
- ...
```

## Rules

- Do not mark performance review complete without at least naming the relevant indexes or documenting why the query is not index-sensitive.
- Do not introduce hidden large client-side fixtures into backend-wired pages.
- Do not use analytics/AI/external APIs in exam runtime paths.
- Do not let frontend perceived performance regress while backend correctness improves.
