CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'tenant', 'assigned')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, course_id, position),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id) ON DELETE CASCADE,
    CHECK (position > 0)
);

CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    module_id UUID NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    lesson_type TEXT NOT NULL DEFAULT 'content' CHECK (lesson_type IN ('content', 'video', 'document', 'quiz', 'assignment', 'external')),
    position INTEGER NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_minutes >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, module_id, position),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, module_id) REFERENCES course_modules(tenant_id, id) ON DELETE CASCADE,
    CHECK (position > 0)
);

CREATE TABLE IF NOT EXISTS course_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    title TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'external' CHECK (provider IN ('youtube', 'google_drive', 'external', 'file_reference')),
    external_ref TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT '',
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, lesson_id, position),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES course_lessons(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    course_offering_id UUID,
    target_type TEXT NOT NULL CHECK (target_type IN ('class_section', 'subject_group', 'individual')),
    target_id UUID NOT NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, course_id, course_offering_id, target_type, target_id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_offering_id) REFERENCES course_offerings(tenant_id, id) ON DELETE CASCADE,
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE TABLE IF NOT EXISTS course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    course_offering_id UUID,
    student_id UUID NOT NULL,
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    completed_lessons INTEGER NOT NULL DEFAULT 0 CHECK (completed_lessons >= 0),
    total_lessons INTEGER NOT NULL DEFAULT 0 CHECK (total_lessons >= 0),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'archived')),
    last_activity_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, course_id, student_id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, course_offering_id) REFERENCES course_offerings(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE,
    CHECK (completed_lessons <= total_lessons)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'archived')),
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, lesson_id, student_id),
    FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lesson_id) REFERENCES course_lessons(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_courses_tenant_status ON courses(tenant_id, status, title);
CREATE INDEX IF NOT EXISTS ix_course_modules_course_order ON course_modules(tenant_id, course_id, position);
CREATE INDEX IF NOT EXISTS ix_course_lessons_module_order ON course_lessons(tenant_id, module_id, position);
CREATE INDEX IF NOT EXISTS ix_course_resources_lesson_order ON course_resources(tenant_id, lesson_id, position);
CREATE INDEX IF NOT EXISTS ix_course_assignment_rules_target ON course_assignment_rules(tenant_id, target_type, target_id, status);
CREATE INDEX IF NOT EXISTS ix_course_assignment_rules_offering ON course_assignment_rules(tenant_id, course_offering_id, status);
CREATE INDEX IF NOT EXISTS ix_course_progress_student ON course_progress(tenant_id, student_id, status, course_id);
CREATE INDEX IF NOT EXISTS ix_course_progress_course ON course_progress(tenant_id, course_id, status, student_id);
CREATE INDEX IF NOT EXISTS ix_lesson_progress_student ON lesson_progress(tenant_id, student_id, status, lesson_id);
CREATE INDEX IF NOT EXISTS ix_lesson_progress_lesson ON lesson_progress(tenant_id, lesson_id, status, student_id);
