# AI Runtime Schema Plan

Status: planned, not yet migrated.

This document defines the future AI runtime storage model for Morfoschools. It is intentionally a planning artifact in ISSUE-031, not a migration, because provider-secret encryption and agent/runtime boundaries must be finalized before production tables are created.

## Goals

- Support user BYO AI credentials/agents and tenant/platform defaults without locking the exam critical path to an external provider.
- Persist multi-turn conversations, message history, runtime state, memories, tool invocations, async jobs, and draft question generation artifacts.
- Keep secrets encrypted by reference only. plaintext API keys are forbidden in database columns, logs, tests, and fixtures.
- Support long-running generation flow for teacher question drafting with reviewable outputs, partial progress, retries, and audit evidence.

## Non-goals

- No AI provider call is required to start, take, submit, grade-baseline, or receipt an exam.
- No runtime dependency on ClickHouse, Google, OpenAI-compatible APIs, or BYO agents for the exam critical path.
- No raw secret value is stored in these planned tables.

## BYO provider resolution order

Provider selection should be deterministic:

1. User BYO provider config for the acting user and tenant.
2. Tenant BYO/provider config for the active tenant.
3. platform default provider managed by operators.

If no usable provider is found, AI features should return a typed unavailable state and keep core LMS/exam flows working.

## Security and secret storage

- `ai_provider_configs` must store only `encrypted_secret_ref`, never raw keys.
- `encrypted_secret_ref` points to a secret manager/KMS row/blob protected by envelope encryption.
- Provider config rows may store provider type, display name, base URL, model defaults, capability flags, status, owner scope, and rotation metadata.
- API responses must redact secret references unless an operator-only diagnostic endpoint explicitly needs metadata.
- Audit events should record provider config create/update/rotate/delete without leaking credential material.

## Planned tables

### ai_provider_configs

Purpose: provider configuration registry for user BYO, tenant defaults, and platform default provider.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NULL` for platform configs; non-null for tenant/user configs.
- `owner_user_id UUID NULL` for user BYO configs.
- `scope TEXT CHECK IN ('user', 'tenant', 'platform')`
- `provider TEXT` such as openai-compatible, anthropic-compatible, local-agent, or custom-webhook.
- `display_name TEXT`
- `base_url TEXT`
- `default_model TEXT`
- `capabilities JSONB`
- `encrypted_secret_ref TEXT NOT NULL`
- `secret_version INTEGER NOT NULL DEFAULT 1`
- `status TEXT CHECK IN ('active', 'disabled', 'rotation_required')`
- `created_at`, `updated_at`, `last_used_at`

Indexes/constraints:

- Unique active default per scope: user+tenant, tenant, and platform.
- Tenant indexes for admin directory and rotation monitoring.

### ai_conversations

Purpose: top-level conversation/session container.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `user_id UUID NOT NULL`
- `provider_config_id UUID NULL`
- `conversation_type TEXT CHECK IN ('chat', 'question_drafting', 'lesson_assistant', 'admin_ops')`
- `title TEXT`
- `status TEXT CHECK IN ('active', 'archived', 'deleted')`
- `metadata JSONB`
- `created_at`, `updated_at`, `last_message_at`

### ai_messages

Purpose: immutable-ish message log for prompt, model, tool, and system messages.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `conversation_id UUID NOT NULL`
- `role TEXT CHECK IN ('system', 'user', 'assistant', 'tool')`
- `content TEXT NOT NULL`
- `content_parts JSONB DEFAULT '[]'`
- `token_usage JSONB DEFAULT '{}'`
- `model TEXT`
- `provider_config_id UUID NULL`
- `created_at`

Indexes:

- `(tenant_id, conversation_id, created_at)` for transcript pagination.

### ai_conversation_states

Purpose: compact resumable runtime state separate from append-only messages.

Planned columns:

- `conversation_id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `state JSONB NOT NULL DEFAULT '{}'`
- `summary TEXT NOT NULL DEFAULT ''`
- `cursor TEXT NOT NULL DEFAULT ''`
- `updated_at TIMESTAMPTZ NOT NULL`

### ai_memories

Purpose: tenant/user-scoped long-term AI memory with explicit source and lifecycle controls.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `user_id UUID NULL`
- `scope TEXT CHECK IN ('user', 'tenant', 'course', 'exam')`
- `source_type TEXT`
- `source_id UUID NULL`
- `content TEXT NOT NULL`
- `embedding_ref TEXT NULL`
- `metadata JSONB DEFAULT '{}'`
- `status TEXT CHECK IN ('active', 'suppressed', 'deleted')`
- `created_at`, `updated_at`

### ai_tool_invocations

Purpose: durable record of AI tool/action calls for audit, replay, and troubleshooting.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `conversation_id UUID NULL`
- `message_id UUID NULL`
- `tool_name TEXT NOT NULL`
- `intent TEXT NOT NULL`
- `permission_code TEXT NOT NULL`
- `confirmation_status TEXT CHECK IN ('not_required', 'pending', 'approved', 'rejected')`
- `request_payload JSONB NOT NULL`
- `response_payload JSONB DEFAULT '{}'`
- `status TEXT CHECK IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')`
- `created_at`, `completed_at`

### ai_generation_jobs

Purpose: async job orchestration for long-running generation flow such as drafting exam questions or lesson plans.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `requested_by UUID NOT NULL`
- `provider_config_id UUID NULL`
- `job_type TEXT CHECK IN ('draft_questions', 'lesson_outline', 'rubric_assist', 'feedback_batch')`
- `status TEXT CHECK IN ('queued', 'running', 'waiting_review', 'completed', 'failed', 'cancelled')`
- `input_payload JSONB NOT NULL`
- `progress_payload JSONB NOT NULL DEFAULT '{}'`
- `result_payload JSONB NOT NULL DEFAULT '{}'`
- `error_message TEXT NOT NULL DEFAULT ''`
- `created_at`, `started_at`, `completed_at`

Indexes:

- `(tenant_id, status, created_at)` for workers/admin monitors.
- `(tenant_id, requested_by, created_at)` for teacher history.

### ai_draft_questions

Purpose: reviewable AI-generated question drafts before they become `exam_questions`.

Planned columns:

- `id UUID PRIMARY KEY`
- `tenant_id UUID NOT NULL`
- `generation_job_id UUID NOT NULL`
- `exam_id UUID NULL`
- `question_type TEXT CHECK IN ('multiple_choice', 'short_answer', 'essay')`
- `prompt TEXT NOT NULL`
- `options JSONB NOT NULL DEFAULT '[]'`
- `correct_answer_text TEXT`
- `expected_answer_rubric JSONB NOT NULL DEFAULT '{}'`
- `difficulty TEXT`
- `learning_objective TEXT`
- `review_status TEXT CHECK IN ('draft', 'accepted', 'rejected', 'edited')`
- `reviewed_by UUID NULL`
- `reviewed_at TIMESTAMPTZ NULL`
- `created_question_id UUID NULL`
- `created_at`, `updated_at`

The `correct_answer_text` and `expected_answer_rubric` fields mirror the exam schema so essay and short-answer drafts are useful from the first implementation and do not need retrofitting later.

## Exam critical path isolation

Exam critical path isolation rules:

- Exam gate checks read published exam data and `exam_eligible_students`, not AI conversation or provider tables.
- Exam submission writes attempts/responses/inbox/receipts without requiring AI, Google, ClickHouse, or external webhooks.
- AI-assisted grading can enqueue work after receipt creation, but receipt creation must never wait for AI.
- If a provider is unavailable, AI jobs fail or pause independently while exam attempts and receipts remain durable.

## Follow-up before migration

- Choose secret manager/KMS implementation and `encrypted_secret_ref` format.
- Decide retention policy for messages, memories, and tool invocation payloads.
- Define RBAC permissions for provider config management and AI tool invocation review.
- Add OpenAPI/AI tool manifests when endpoints are introduced.
