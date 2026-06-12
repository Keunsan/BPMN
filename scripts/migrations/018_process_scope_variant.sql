-- ============================================
-- 018: Process scope (company/business unit) and variant support
-- ============================================

IF COL_LENGTH('process_node', 'company_code') IS NULL
BEGIN
    ALTER TABLE process_node
    ADD company_code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('process_node', 'business_unit_code') IS NULL
BEGIN
    ALTER TABLE process_node
    ADD business_unit_code VARCHAR(30) NULL;
END
GO

DECLARE @processCodeUniqueConstraint SYSNAME;
DECLARE @dropSql NVARCHAR(4000);

SELECT TOP 1 @processCodeUniqueConstraint = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.index_columns ic
    ON kc.parent_object_id = ic.object_id
   AND kc.unique_index_id = ic.index_id
INNER JOIN sys.columns c
    ON ic.object_id = c.object_id
   AND ic.column_id = c.column_id
WHERE kc.parent_object_id = OBJECT_ID('process_node')
  AND kc.type = 'UQ'
  AND c.name = 'code'
  AND NOT EXISTS (
      SELECT 1
      FROM sys.index_columns ic2
      INNER JOIN sys.columns c2
          ON ic2.object_id = c2.object_id
         AND ic2.column_id = c2.column_id
      WHERE ic2.object_id = kc.parent_object_id
        AND ic2.index_id = kc.unique_index_id
        AND c2.name <> 'code'
  );

IF @processCodeUniqueConstraint IS NOT NULL
BEGIN
    SET @dropSql =
        N'ALTER TABLE process_node DROP CONSTRAINT '
        + QUOTENAME(@processCodeUniqueConstraint);
    EXEC sp_executesql @dropSql;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('process_node')
      AND name = 'UQ_process_node_standard_code'
)
BEGIN
    CREATE UNIQUE INDEX UQ_process_node_standard_code
    ON process_node(code)
    WHERE variant_of IS NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('process_node')
      AND name = 'UQ_process_node_variant_scope'
)
BEGIN
    CREATE UNIQUE INDEX UQ_process_node_variant_scope
    ON process_node(variant_of, company_code, business_unit_code)
    WHERE variant_of IS NOT NULL
      AND company_code IS NOT NULL
      AND business_unit_code IS NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('process_node')
      AND name = 'IX_process_node_scope'
)
BEGIN
    CREATE INDEX IX_process_node_scope
    ON process_node(company_code, business_unit_code);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('process_node')
      AND name = 'IX_process_node_variant_of'
)
BEGIN
    CREATE INDEX IX_process_node_variant_of
    ON process_node(variant_of);
END
GO
