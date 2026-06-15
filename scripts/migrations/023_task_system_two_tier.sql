-- ============================================
-- 023: Task-System 2-tier linking
-- 1차 task_system_link (task ↔ system)
-- 2차 task_system_screen_link (optional screens)
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_system_link')
BEGIN
    CREATE TABLE task_system_link (
        link_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        system_id           BIGINT NOT NULL,
        usage_description   NVARCHAR(500) NULL,
        is_primary          BIT DEFAULT 0,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT UQ_task_system_link UNIQUE (node_id, system_id)
    );

    ALTER TABLE task_system_link
    ADD CONSTRAINT FK_tsl_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_system_link
    ADD CONSTRAINT FK_tsl_system FOREIGN KEY (system_id) REFERENCES application_system(system_id);

    CREATE INDEX IX_task_system_link_node ON task_system_link(node_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_system_screen_link')
BEGIN
    CREATE TABLE task_system_screen_link (
        screen_link_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
        link_id             BIGINT NOT NULL,
        screen_id           BIGINT NOT NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT UQ_task_system_screen_link UNIQUE (link_id, screen_id)
    );

    ALTER TABLE task_system_screen_link
    ADD CONSTRAINT FK_tssl_link FOREIGN KEY (link_id) REFERENCES task_system_link(link_id) ON DELETE CASCADE;

    ALTER TABLE task_system_screen_link
    ADD CONSTRAINT FK_tssl_screen FOREIGN KEY (screen_id) REFERENCES system_screen(screen_id);

    CREATE INDEX IX_task_system_screen_link_link ON task_system_screen_link(link_id);
END
GO

-- 기존 task_system_mapping 데이터 이전
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_system_mapping')
BEGIN
    INSERT INTO task_system_link (node_id, system_id, usage_description, is_primary, created_by, created_at)
    SELECT
        tsm.node_id,
        sc.system_id,
        MAX(tsm.usage_description) AS usage_description,
        MAX(CAST(tsm.is_primary AS INT)) AS is_primary,
        MIN(tsm.created_by) AS created_by,
        MIN(tsm.created_at) AS created_at
    FROM task_system_mapping tsm
    INNER JOIN system_screen sc ON sc.screen_id = tsm.screen_id
    GROUP BY tsm.node_id, sc.system_id;

    -- 태스크당 주요 시스템 1개만 유지
    ;WITH ranked AS (
        SELECT
            link_id,
            ROW_NUMBER() OVER (
                PARTITION BY node_id
                ORDER BY is_primary DESC, link_id ASC
            ) AS rn
        FROM task_system_link
        WHERE is_primary = 1
    )
    UPDATE tsl
    SET is_primary = 0
    FROM task_system_link tsl
    INNER JOIN ranked r ON r.link_id = tsl.link_id
    WHERE r.rn > 1;

    INSERT INTO task_system_screen_link (link_id, screen_id, created_at)
    SELECT
        tsl.link_id,
        tsm.screen_id,
        tsm.created_at
    FROM task_system_mapping tsm
    INNER JOIN system_screen sc ON sc.screen_id = tsm.screen_id
    INNER JOIN task_system_link tsl
        ON tsl.node_id = tsm.node_id
       AND tsl.system_id = sc.system_id;

    DROP TABLE task_system_mapping;
END
GO
