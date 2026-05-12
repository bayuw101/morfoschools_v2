CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, code),
    CHECK (starts_on <= ends_on)
);

CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    starts_on DATE,
    ends_on DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, academic_year_id, code),
    FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years(tenant_id, id) ON DELETE CASCADE,
    CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on)
);

CREATE TABLE IF NOT EXISTS class_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    homeroom_teacher_id UUID,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, academic_year_id, code),
    UNIQUE (tenant_id, academic_year_id, grade_level, name),
    FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, homeroom_teacher_id) REFERENCES teachers(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    subject_area TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS subject_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL,
    term_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    group_type TEXT NOT NULL DEFAULT 'rombel' CHECK (group_type IN ('rombel', 'cross_class', 'remedial', 'enrichment', 'club', 'custom')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, term_id, code),
    FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, term_id) REFERENCES terms(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, subject_id) REFERENCES subjects(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS subject_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_group_id UUID NOT NULL,
    student_id UUID NOT NULL,
    class_section_id UUID,
    membership_status TEXT NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'removed')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, subject_group_id, student_id),
    FOREIGN KEY (tenant_id, subject_group_id) REFERENCES subject_groups(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, class_section_id) REFERENCES class_sections(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL,
    term_id UUID NOT NULL,
    class_section_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    subject_group_id UUID,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, term_id, class_section_id, subject_id),
    UNIQUE (tenant_id, term_id, code),
    FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, term_id) REFERENCES terms(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, class_section_id) REFERENCES class_sections(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, subject_id) REFERENCES subjects(tenant_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, subject_group_id) REFERENCES subject_groups(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teaching_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_offering_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'assistant', 'substitute', 'observer')),
    starts_on DATE,
    ends_on DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, course_offering_id, teacher_id),
    FOREIGN KEY (tenant_id, course_offering_id) REFERENCES course_offerings(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, teacher_id) REFERENCES teachers(tenant_id, id) ON DELETE RESTRICT,
    CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_offering_id UUID NOT NULL,
    student_id UUID NOT NULL,
    source_class_section_id UUID,
    source_subject_group_id UUID,
    target_type TEXT NOT NULL DEFAULT 'class_section' CHECK (target_type IN ('class_section', 'subject_group', 'individual')),
    enrollment_status TEXT NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'inactive', 'dropped', 'completed')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, course_offering_id, student_id),
    FOREIGN KEY (tenant_id, course_offering_id) REFERENCES course_offerings(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, source_class_section_id) REFERENCES class_sections(tenant_id, id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id, source_subject_group_id) REFERENCES subject_groups(tenant_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_academic_years_tenant_status ON academic_years(tenant_id, status, starts_on DESC);
CREATE INDEX IF NOT EXISTS ix_terms_tenant_year_status ON terms(tenant_id, academic_year_id, status, starts_on);
CREATE INDEX IF NOT EXISTS ix_class_sections_tenant_year_grade ON class_sections(tenant_id, academic_year_id, grade_level, name);
CREATE INDEX IF NOT EXISTS ix_subjects_tenant_status ON subjects(tenant_id, status, name);
CREATE INDEX IF NOT EXISTS ix_subject_groups_tenant_term_subject ON subject_groups(tenant_id, term_id, subject_id, status);
CREATE INDEX IF NOT EXISTS ix_subject_group_members_student_lookup ON subject_group_members(tenant_id, student_id, membership_status);
CREATE INDEX IF NOT EXISTS ix_course_offerings_directory ON course_offerings(tenant_id, term_id, class_section_id, subject_id, status);
CREATE INDEX IF NOT EXISTS ix_course_offerings_teacher_lookup ON teaching_assignments(tenant_id, teacher_id, status, course_offering_id);
CREATE INDEX IF NOT EXISTS ix_teaching_assignments_course_lookup ON teaching_assignments(tenant_id, course_offering_id, status);
CREATE INDEX IF NOT EXISTS ix_enrollments_student_lookup ON enrollments(tenant_id, student_id, enrollment_status, course_offering_id);
CREATE INDEX IF NOT EXISTS ix_enrollments_course_lookup ON enrollments(tenant_id, course_offering_id, enrollment_status);
