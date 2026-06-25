-- ============================================
-- 028: RACI role-only (remove organization from task_role_mapping)
-- ============================================

-- 역할 없이 조직만 지정된 매핑은 더 이상 지원하지 않는다.
DELETE FROM task_role_mapping WHERE role_id IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_trm_org')
BEGIN
    ALTER TABLE task_role_mapping DROP CONSTRAINT FK_trm_org;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_task_role_mapping_node_org_role_type'
      AND object_id = OBJECT_ID('task_role_mapping')
)
BEGIN
    DROP INDEX UQ_task_role_mapping_node_org_role_type ON task_role_mapping;
END
GO

IF COL_LENGTH('task_role_mapping', 'org_id') IS NOT NULL
BEGIN
    ALTER TABLE task_role_mapping DROP COLUMN org_id;
END
GO

-- org_id 제거 후 (node_id, role_id, raci_type) 중복 행 정리
;WITH dups AS (
    SELECT
        mapping_id,
        ROW_NUMBER() OVER (
            PARTITION BY node_id, role_id, raci_type
            ORDER BY mapping_id
        ) AS rn
    FROM task_role_mapping
)
DELETE trm
FROM task_role_mapping trm
INNER JOIN dups ON trm.mapping_id = dups.mapping_id
WHERE dups.rn > 1;
GO

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_task_role_mapping_node_role_type'
      AND object_id = OBJECT_ID('task_role_mapping')
)
BEGIN
    DROP INDEX UQ_task_role_mapping_node_role_type ON task_role_mapping;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('task_role_mapping')
      AND name = 'role_id'
      AND is_nullable = 1
)
BEGIN
    ALTER TABLE task_role_mapping ALTER COLUMN role_id BIGINT NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_task_role_mapping_node_role_type'
      AND object_id = OBJECT_ID('task_role_mapping')
)
BEGIN
    CREATE UNIQUE INDEX UQ_task_role_mapping_node_role_type
    ON task_role_mapping(node_id, role_id, raci_type);
END
GO
