-- Exam authoring, eligibility, runtime submission, integrity, and grading baseline.

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_offering_id UUID,
    course_id UUID,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    exam_type TEXT NOT NULL DEFAULT 'quiz' CHECK (exam_type IN ('quiz', 'assignment', 'midterm', 'final', 'tryout', 'survey')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
    randomize_options BOOLEAN NOT NULL DEFAULT FALSE,
    show_result_policy TEXT NOT NULL DEFAULT 'after_review' CHECK (show_result_policy IN ('immediate', 'after_review', 'after_close', 'never')),
    publish_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    published_at TIMESTAMPTZ,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, slug),
    FOREIGN KEY (tenant_id, course_offering_id) REFERENCES course_offerings(tenant_id, id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL CHECK (position > 0),
    time_limit_minutes INTEGER CHECK (time_limit_minutes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, exam_id, position),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    section_id UUID,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay')),
    prompt TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL CHECK (position > 0),
    points NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (points >= 0),
    correct_answer_text TEXT,
    expected_answer_rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, exam_id, position),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, section_id) REFERENCES exam_sections(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    option_text TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, question_id, position),
    FOREIGN KEY (tenant_id, question_id) REFERENCES exam_questions(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('class_section', 'subject_group', 'course_offering', 'individual')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, exam_id, target_type, target_id),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_gate_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    access_code_hash TEXT,
    late_grace_minutes INTEGER NOT NULL DEFAULT 0 CHECK (late_grace_minutes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id) ON DELETE CASCADE,
    CHECK (closes_at > opens_at)
);

CREATE TABLE IF NOT EXISTS exam_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    prerequisite_type TEXT NOT NULL CHECK (prerequisite_type IN ('course_progress', 'lesson_complete', 'previous_exam_score', 'manual_approval')),
    prerequisite_ref_id UUID,
    required_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_eligible_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    student_id UUID NOT NULL,
    eligibility_status TEXT NOT NULL DEFAULT 'eligible' CHECK (eligibility_status IN ('eligible', 'blocked', 'revoked')),
    gate_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    materialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    materialized_by UUID,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, exam_id, student_id),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (materialized_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL,
    student_id UUID NOT NULL,
    eligible_student_id UUID,
    attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    client_started_at TIMESTAMPTZ,
    client_submitted_at TIMESTAMPTZ,
    runtime_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_score NUMERIC(10,2),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, exam_id, student_id, attempt_no),
    FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id),
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id),
    FOREIGN KEY (tenant_id, eligible_student_id) REFERENCES exam_eligible_students(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS exam_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL,
    question_id UUID NOT NULL,
    selected_option_id UUID,
    answer_text TEXT,
    answer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    score NUMERIC(8,2),
    graded_status TEXT NOT NULL DEFAULT 'pending' CHECK (graded_status IN ('pending', 'auto_graded', 'manual_review', 'graded')),
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, attempt_id, question_id),
    FOREIGN KEY (tenant_id, attempt_id) REFERENCES exam_attempts(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, question_id) REFERENCES exam_questions(tenant_id, id),
    FOREIGN KEY (tenant_id, selected_option_id) REFERENCES exam_question_options(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS exam_submission_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, idempotency_key),
    FOREIGN KEY (tenant_id, attempt_id) REFERENCES exam_attempts(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS exam_submission_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL,
    receipt_code TEXT NOT NULL,
    receipt_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, attempt_id),
    UNIQUE (tenant_id, receipt_code),
    FOREIGN KEY (tenant_id, attempt_id) REFERENCES exam_attempts(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS exam_integrity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, attempt_id) REFERENCES exam_attempts(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_grading_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    response_id UUID NOT NULL,
    grading_mode TEXT NOT NULL DEFAULT 'manual' CHECK (grading_mode IN ('manual', 'auto', 'ai_assisted')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'failed')),
    assigned_to UUID,
    rubric_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, response_id),
    FOREIGN KEY (tenant_id, response_id) REFERENCES exam_responses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_grade_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grading_task_id UUID NOT NULL,
    response_id UUID NOT NULL,
    grader_id UUID,
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    feedback TEXT NOT NULL DEFAULT '',
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, grading_task_id),
    FOREIGN KEY (tenant_id, grading_task_id) REFERENCES exam_grading_tasks(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, response_id) REFERENCES exam_responses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (grader_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ix_exams_tenant_status ON exams (tenant_id, status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS ix_exam_sections_exam ON exam_sections (tenant_id, exam_id, position);
CREATE INDEX IF NOT EXISTS ix_exam_questions_exam ON exam_questions (tenant_id, exam_id, position);
CREATE INDEX IF NOT EXISTS ix_exam_options_question ON exam_question_options (tenant_id, question_id, position);
CREATE INDEX IF NOT EXISTS ix_exam_targets_lookup ON exam_targets (tenant_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_exam_gate_windows_exam ON exam_gate_windows (tenant_id, exam_id, opens_at, closes_at);
CREATE INDEX IF NOT EXISTS ix_exam_eligible_students_gate ON exam_eligible_students (tenant_id, exam_id, student_id, eligibility_status);
CREATE INDEX IF NOT EXISTS ix_exam_attempts_runtime ON exam_attempts (tenant_id, exam_id, student_id, status);
CREATE INDEX IF NOT EXISTS ix_exam_responses_attempt ON exam_responses (tenant_id, attempt_id, question_id);
CREATE INDEX IF NOT EXISTS ix_exam_submission_inbox_pending ON exam_submission_inbox (tenant_id, status, received_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS ix_exam_integrity_events_attempt ON exam_integrity_events (tenant_id, attempt_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_exam_grading_tasks_status ON exam_grading_tasks (tenant_id, status, created_at);
