-- ============================================
-- 029: System catalog / task-system mapping 조회 성능 인덱스
-- ============================================

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_system_screen_system_active'
      AND object_id = OBJECT_ID('system_screen')
)
BEGIN
    CREATE INDEX IX_system_screen_system_active
    ON system_screen(system_id, is_active);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_task_system_link_node_system'
      AND object_id = OBJECT_ID('task_system_link')
)
BEGIN
    CREATE INDEX IX_task_system_link_node_system
    ON task_system_link(node_id, system_id);
END
GO
