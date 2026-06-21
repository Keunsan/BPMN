-- ============================================
-- 026: Organization cost center columns (HR ERP)
-- ============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'cost_cd'
)
BEGIN
    ALTER TABLE organization ADD cost_cd VARCHAR(30) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('organization') AND name = 'cost_nm'
)
BEGIN
    ALTER TABLE organization ADD cost_nm NVARCHAR(200) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_org_cost_cd' AND object_id = OBJECT_ID('organization')
)
BEGIN
    CREATE INDEX IX_org_cost_cd ON organization(cost_cd);
END
GO
