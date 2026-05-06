# Risks and Debt

Reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`

Audit date: 2026-05-06

## Critical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Full-copying prototype into clean rewrite | Carries hidden bugs, stale routes, inconsistent architecture | Prototype is read-only reference. Port only approved routes/modules through issue workflow. |
| UI drift from locked prototype feel | Product becomes generic/basic and loses approved Morfosis quality | Use `UI_SOURCE_OF_TRUTH.md`, `/app/gallery`, and UI base components as reference before module work. |
| Backend hidden complexity | Auth/session/RBAC/tenant isolation can become insecure if rushed | Audit and implement infra/auth issues before real module wiring. |
| Dummy/demo rows leaking into backend-wired pages | Misleading UX and brittle data flow | Backend-wired pages must use skeleton/empty/error states and no dummy initial API rows. |
| Exam critical path depends on external APIs | Exam outage risk under weak infrastructure | No Google/AI/ClickHouse dependency on exam submission/take-exam path. |
| Missing expected answers/rubrics | Future AI-assisted grading becomes impossible or unreliable | Essay/short-answer correct/expected answer or rubric required from first exam implementation. |
| Tenant isolation gaps | Cross-school data leakage | Tenant context, RBAC, audit fields, and query constraints required from beginning. |
| Untracked docs changes | Planning becomes unreliable | Issue updates append-only; completion notes must be dated. |

## Technical Debt Observed in Prototype Reference

| Area | Debt / Concern | Target Handling |
|---|---|---|
| Broad prototype scope | Many pages/modules exist beyond clean rewrite scope | Inventory now; defer product modules until their issue. |
| Mixed UI and backend readiness | Prototype has rich UI plus backend modules, but target must validate foundation first | Rebuild FE+BE together per module after Phase 1/2. |
| Exam complexity | Management, monitor, grading, gate, take-exam, result are separate surfaces | Treat as critical module family, not isolated pages. |
| Analytics optionality | ClickHouse exists in prototype backend | Keep optional; app boot and exams cannot depend on it. |
| AI runtime uncertainty | AI sidecar/API exists, provider strategy still BYO | Keep minimal `/api/ai-chat`; external provider wiring later. |
| Internal prototype artifacts | `/app/phase-1-review` is not a product route | Delete/defer unless re-approved. |
| Generated/runtime folders | `node_modules`, build artifacts, archives pollute search results | Exclude from source-of-truth and audits. |

## Product / UX Debt to Watch

- Keep form drawer as pulled-right, non-modal, no blur overlay; close only via X.
- Keep ConfirmDialog as centered modal.
- Equal-height adjacent controls across filters/actions.
- Headers should mirror `/app/courses` style when building module pages.
- AI chat sidecar must preserve dark shell and scrolling behavior.
- Student exam flow must use Exam Gate before take-exam.

## Open Questions for Later Issues

- Which exact role matrix is approved for first real RBAC seed?
- Which school tenancy attributes are mandatory at tenant creation?
- Which AI provider contracts are allowed for BYO AI Agent after the critical app path is stable?
- How much of prototype seed/demo data should be recreated as safe target seeds?

## Conclusion

The prototype is valuable as a UX/domain reference, but the main rewrite risk is accidental scope creep. Continue issue-by-issue, check off only verified acceptance criteria, and add follow-up work as append-only issue notes or decimal sub-issues.
