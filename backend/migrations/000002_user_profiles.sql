CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_number TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, user_id),
    UNIQUE (tenant_id, employee_number)
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_number TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, user_id),
    UNIQUE (tenant_id, student_number)
);

CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_number TEXT NOT NULL,
    staff_type TEXT NOT NULL DEFAULT 'staff' CHECK (staff_type IN ('staff', 'finance', 'academic', 'operations', 'proctor', 'content_reviewer')),
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, user_id),
    UNIQUE (tenant_id, employee_number)
);

CREATE TABLE IF NOT EXISTS guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guardian_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    relationship_label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, user_id),
    UNIQUE (tenant_id, guardian_code)
);

CREATE TABLE IF NOT EXISTS student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    guardian_id UUID NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'guardian',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    can_receive_reports BOOLEAN NOT NULL DEFAULT true,
    can_pickup BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, student_id, guardian_id),
    FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, guardian_id) REFERENCES guardians(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_teachers_tenant_status ON teachers(tenant_id, status, display_name);
CREATE INDEX IF NOT EXISTS ix_students_tenant_status ON students(tenant_id, status, display_name);
CREATE INDEX IF NOT EXISTS ix_staff_profiles_tenant_status ON staff_profiles(tenant_id, status, staff_type);
CREATE INDEX IF NOT EXISTS ix_guardians_tenant_status ON guardians(tenant_id, status, display_name);
CREATE INDEX IF NOT EXISTS ix_student_guardians_student ON student_guardians(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS ix_student_guardians_guardian ON student_guardians(tenant_id, guardian_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_student_guardians_primary ON student_guardians(tenant_id, student_id) WHERE is_primary = true;
