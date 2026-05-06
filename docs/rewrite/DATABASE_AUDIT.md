# Database Audit

Reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`
Audit date: 2026-05-06

Status: audit-first baseline. No schema is final until backend/security implementation issues run with tests.

## Prototype Migration Inventory

| Prototype Migration | Main Areas | Target Action |
|---|---|---|
| `000001_core_foundation.sql` | tenants, users, tenant_users, students, class_sections, student_class_enrollments, exams, eligibility, attempts, submission inbox, receipts | split/rewrite into tenant/auth/academic/exam foundations |
| `000002_exam_submission_kind.sql` | submission inbox kind, relay index | rewrite in exam shock absorber issue |
| `000003_academic_foundation.sql` | subjects, course_offerings, teaching_assignments | rewrite; keep academic model direction |
| `000004_subject_groups.sql` | subject_groups, subject_group_members | rewrite in academic module |
| `000005_course_foundation.sql` | courses, modules, resources, progress events | rewrite in course module |
| `000006_exam_management.sql` | exam_questions, targets, gate windows, prerequisites | rewrite in exam management module |
| `000007_exam_gate_security.sql` | exam_security_events | rewrite in integrity/proctoring issue |
| `000008_exam_grading.sql` | question answer/rubric fields, grade results | rewrite; preserve expected answer/rubric requirement |
| `000009_manual_grading.sql` | manual grading queue details | rewrite in grading module |
| `000010_auth_foundation.sql` | password hash, sessions | rewrite earlier with secure auth/session design |
| `000011_exam_eligibility.sql` | eligibility tokens/window metadata | rewrite; materialized eligibility at publish-time |

## Auth / RBAC / Tenant Gaps

Prototype reference has useful auth/session pieces, but target baseline must explicitly define:

- `tenants`
- `tenant_theme_settings`
- `users`
- `password_credentials` or equivalent credential table
- `sessions` / refresh sessions with expiry, revocation, and audit metadata
- `tenant_memberships`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles` or membership-scoped roles
- `audit_events`
- request/actor metadata for security-sensitive changes

Target requirements:

- Every tenant-owned business table includes `tenant_id`.
- Tenant isolation is enforced in repository queries and tests, not only UI filtering.
- RBAC is policy-based and tested per route/action.
- Authentication must support safe cookie/session handling before real login wiring.
- Theme settings are tenant-scoped and non-critical to exam submission.

## Academic Model Audit

Prototype includes:

- `students`
- `class_sections`
- `student_class_enrollments`
- `subjects`
- `course_offerings`
- `teaching_assignments`
- `subject_groups`
- `subject_group_members`

Target academic model direction:

- Keep `class_sections` as administrative cohorts.
- Use `course_offerings` to link class section + subject + academic year/term.
- Use `teaching_assignments` to connect teachers to course offerings.
- Use `enrollments` / student class enrollments to connect students to class sections and academic offerings.
- Avoid direct shortcut models that make future reporting/exams ambiguous.

## Courses Model Audit

Prototype includes:

- `courses`
- `course_modules`
- `course_resources`
- `course_progress_events`

Target direction:

- Courses should attach to `course_offerings` where needed.
- Resources can reference YouTube/Drive metadata to minimize infrastructure load.
- Progress events should be append-friendly and tenant-scoped.
- Backend-wired course pages must use empty/skeleton/error states, no dummy initial rows.

## Exams Model Audit

Prototype includes:

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

Target critical requirements:

- Exam critical path must not depend on Google, AI provider, ClickHouse, or any external API.
- Use materialized eligibility at publish-time.
- Use Exam Gate before take-exam.
- Use inbox/shock absorber pattern for high-concurrency submission ingestion.
- `essay` and `short_answer` questions must include correct/expected answers or grading rubrics from the first implementation.
- Receipts must be durable and fast to return.
- Security/proctoring events are append-only and tenant-scoped.

## AI Runtime Tables Audit

Prototype has AI chat/API concepts, but target DB should not rush provider-specific persistence.

Target direction:

- BYO AI Agent/key policy.
- AI/media integrations must not be required for exam submission.
- Store provider metadata/contracts only after AI runtime issue is approved.
- Prefer storing external media metadata (YouTube/Drive) rather than heavy file hosting.

## Indexes, Constraints, Tenancy, Audit

Baseline expectations for future DDL:

- UUID v7 preferred for primary IDs; ULID fallback only if tooling blocks UUID v7.
- Use foreign keys for ownership and relationship integrity where operationally safe.
- Tenant-scoped unique constraints for names/codes/slugs.
- Index common query paths: tenant + status/date, tenant + actor, tenant + course/exam/student.
- Include `created_at`, `updated_at`, and actor fields where useful.
- Use append-only audit/security/event tables for sensitive actions and exam events.
- Avoid soft-delete ambiguity unless a module explicitly needs restore behavior.

## Conclusion

Prototype schema is a strong domain reference but should be split into production target foundations. First backend issues must establish secure tenant/auth/RBAC/theme/audit foundations before product modules are wired.
