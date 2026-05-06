# AI Tool Manifest Template

Use this template for each backend capability that an AI agent may call.

## Intent
What user goal the tool fulfills.

## Permission
Required backend permission and role context.

## Endpoint / Service Action
HTTP endpoint or internal service method.

## Required Fields
List all required inputs with validation rules.

## Validation Rules
Tenant scope, RBAC, business invariants, and type constraints.

## Clarification Questions
Questions the agent must ask before calling the tool when inputs are ambiguous.

## Confirmation Gate
State whether the action is read-only, mutating, destructive, or high-impact and whether explicit user confirmation is required.

## Success Proof
Concrete evidence that the action succeeded: ID, status, audit event, receipt, or updated record.

## Failure Cases
Expected errors and safe recovery guidance.

## Exam Critical Path Safety
If related to exams, confirm the path does not depend on external AI/Google/ClickHouse services.
