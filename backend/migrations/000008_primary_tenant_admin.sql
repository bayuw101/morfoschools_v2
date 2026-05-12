ALTER TABLE tenant_memberships
    ADD COLUMN IF NOT EXISTS is_primary_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_memberships_primary_admin
    ON tenant_memberships(tenant_id)
    WHERE is_primary_admin IS TRUE AND status = 'active';
