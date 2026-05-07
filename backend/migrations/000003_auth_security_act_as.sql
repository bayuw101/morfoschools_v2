ALTER TABLE sessions ADD COLUMN IF NOT EXISTS effective_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS platform_user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS ix_sessions_effective_tenant ON sessions(effective_tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_platform_user_roles_role ON platform_user_roles(role_id);
