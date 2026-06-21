-- ============================================
-- 017: Organization HR sync columns + RACI unique index
-- ============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'source'
)
BEGIN
    ALTER TABLE organization ADD source VARCHAR(20) NOT NULL CONSTRAINT DF_org_source DEFAULT 'HR_ERP';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'bu_cd'
)
BEGIN
    ALTER TABLE organization ADD bu_cd VARCHAR(10) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'leader_employee_id'
)
BEGIN
    ALTER TABLE organization ADD leader_employee_id VARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'leader_name'
)
BEGIN
    ALTER TABLE organization ADD leader_name NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'is_leaf'
)
BEGIN
    ALTER TABLE organization ADD is_leaf BIT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_org_bu_cd' AND object_id = OBJECT_ID('organization')
)
BEGIN
    CREATE INDEX IX_org_bu_cd ON organization(bu_cd);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_task_role_mapping_node_org_role_type'
      AND object_id = OBJECT_ID('task_role_mapping')
)
BEGIN
    CREATE UNIQUE INDEX UQ_task_role_mapping_node_org_role_type
    ON task_role_mapping(node_id, org_id, role_id, raci_type)
    WHERE org_id IS NOT NULL AND role_id IS NOT NULL;
END
GO
