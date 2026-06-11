-- ============================================
-- 015: System scope by company and business unit
-- ============================================

IF COL_LENGTH('application_system', 'company_code') IS NULL
BEGIN
    ALTER TABLE application_system
    ADD company_code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('application_system', 'business_unit_code') IS NULL
BEGIN
    ALTER TABLE application_system
    ADD business_unit_code VARCHAR(30) NULL;
END
GO

DECLARE @systemCodeUniqueConstraint SYSNAME;
DECLARE @dropSql NVARCHAR(4000);

SELECT TOP 1 @systemCodeUniqueConstraint = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.index_columns ic
    ON kc.parent_object_id = ic.object_id
   AND kc.unique_index_id = ic.index_id
INNER JOIN sys.columns c
    ON ic.object_id = c.object_id
   AND ic.column_id = c.column_id
WHERE kc.parent_object_id = OBJECT_ID('application_system')
  AND kc.type = 'UQ'
  AND c.name = 'system_code'
  AND NOT EXISTS (
      SELECT 1
      FROM sys.index_columns ic2
      INNER JOIN sys.columns c2
          ON ic2.object_id = c2.object_id
         AND ic2.column_id = c2.column_id
      WHERE ic2.object_id = kc.parent_object_id
        AND ic2.index_id = kc.unique_index_id
        AND c2.name <> 'system_code'
  );

IF @systemCodeUniqueConstraint IS NOT NULL
BEGIN
    SET @dropSql =
        N'ALTER TABLE application_system DROP CONSTRAINT '
        + QUOTENAME(@systemCodeUniqueConstraint);
    EXEC sp_executesql @dropSql;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('application_system')
      AND name = 'UQ_application_system_scope'
)
BEGIN
    CREATE UNIQUE INDEX UQ_application_system_scope
    ON application_system(system_code, company_code, business_unit_code)
    WHERE company_code IS NOT NULL
      AND business_unit_code IS NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('application_system')
      AND name = 'IX_application_system_company_bu'
)
BEGIN
    CREATE INDEX IX_application_system_company_bu
    ON application_system(company_code, business_unit_code);
END
GO
