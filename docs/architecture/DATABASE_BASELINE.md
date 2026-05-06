# Database Baseline

Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`
Audit date: 2026-05-06

This file prevents backend schema improvisation during UI-first work. Detailed DDL must be created with tests during backend issues.

## Baseline Principles

1. PostgreSQL is the system of record.
2. PgBouncer is used by backend connections in production compose.
3. UUID v7 is preferred for primary identifiers; ULID is fallback only if implementation tooling blocks UUID v7.
4. Every tenant-owned business table is tenant-scoped.
5. RBAC, tenant isolation, audit, loading states, and API docs are required from the beginning.
6. Exam critical path must not depend on Google, AI providers, ClickHouse, or other external APIs.
7. ClickHouse is optional analytics only.
8. NATS JetStream is a shock absorber/relay, not the source of truth.

## Foundation Schema Areas

### Tenant and Theme

Required conceptual tables:

- `tenants`
- `tenant_theme_settings`

Expected columns/categories:

- tenant identity: id, name, slug/code, status
- theme: brand name, logo metadata, OKLCH/color tokens, UI preferences
- audit timestamps and actor metadata

### Users, Sessions, Credentials

Required conceptual tables:

- `users`
- `password_credentials`
- `sessions` or refresh/session table
- optional security/rate-limit event table if implementation requires persistence

Expected requirements:

- Password hashes never live in frontend-visible models.
- Sessions support expiry/revocation.
- Login attempts and sensitive auth events are auditable.
- Secure cookies/session behavior must be tested before real login wiring.

### Membership and RBAC

Required conceptual tables:

- `tenant_memberships`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles` or membership-scoped equivalent

Expected requirements:

- Roles are tenant-aware or explicitly global/system roles.
- Permissions map to backend actions, not only navigation items.
- Repository tests must prove cross-tenant access is denied.

### Audit

Required conceptual table:

- `audit_events`

Expected fields/categories:

- tenant_id
- actor user/session
- action
- resource type/id
- request id/ip/user agent where appropriate
- before/after metadata where safe
- timestamp

## Academic Baseline

Target model direction:

- `class_sections`: administrative cohorts/classes.
- `subjects`: academic subjects.
- `course_offerings`: links class section + subject + academic period.
- `teaching_assignments`: links teachers to course offerings.
- `enrollments`: links students to cohorts/offerings as required by final design.

Reason: Indonesian school LMS needs clear separation between administrative class membership and academic subject delivery.

## Course Baseline

Conceptual tables for later module:

- `courses`
- `course_modules`
- `course_resources`
- `course_progress_events`

Media policy:

- Prefer YouTube/Drive metadata references over heavy self-hosted media.
- External media must not block exam critical path.

## Exam Baseline

Conceptual tables for later critical module:

- `exams`
- `exam_questions`
- `exam_targets`
- `exam_gate_windows`
- `exam_prerequisites`
- `exam_eligible_students`
- `exam_attempts`
- `exam_submission_inbox`
- `exam_submission_receipts`
- `exam_security_events`
- `exam_grade_results`

Hard requirements:

- Materialize eligibility at publish-time.
- Student uses Exam Gate before take-exam.
- Submission ingestion uses daily Postgres partitions + NATS JetStream relay pattern.
- Receipts are durable and fast.
- Essay/short-answer questions include correct/expected answer or rubric from first implementation.
- Manual grading queue is explicit.
- Analytics/export can lag behind; submission path must remain available.

## Index and Constraint Expectations

- Tenant-scoped unique constraints for human-readable codes/slugs/names.
- Indexes for `tenant_id + status`, `tenant_id + created_at`, `tenant_id + user_id`, `tenant_id + exam_id`, `tenant_id + student_id`, and relay queues where applicable.
- Foreign keys for core ownership/relationships where operationally safe.
- Check constraints for enumerated statuses where stable.
- Idempotency keys for critical write paths where required.

## Migration Strategy

- Use embedded migrations in the Go backend (`go:embed`) when ISSUE-006 runs.
- Migration runner must be testable and idempotent.
- DDL must be reviewed with tenant isolation and rollback/recovery implications.
- Seeds must be safe demo data only; no secrets.

## API / AI Tooling Requirement

Every backend module that introduces or changes data contracts must update:

- OpenAPI documentation.
- AI Tool Manifest notes under `docs/ai-tools/` or the approved module doc location.

## Current Status

Baseline only. Detailed DDL is intentionally deferred to backend implementation issues so it can be developed with TDD and integration tests.
