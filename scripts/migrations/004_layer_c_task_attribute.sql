-- ============================================
-- 004: Layer C - Task Attributes
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_attribute')
BEGIN
    CREATE TABLE task_attribute (
        attr_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL UNIQUE,

        definition          NVARCHAR(MAX) NULL,
        purpose             NVARCHAR(1000) NULL,

        input_deliverable   NVARCHAR(MAX) NULL,
        input_data_desc     NVARCHAR(MAX) NULL,
        input_condition     NVARCHAR(1000) NULL,

        output_deliverable  NVARCHAR(MAX) NULL,
        output_data_desc    NVARCHAR(MAX) NULL,
        output_condition    NVARCHAR(1000) NULL,

        frequency           VARCHAR(20) NULL,
        trigger_event       NVARCHAR(500) NULL,
        duration            NVARCHAR(100) NULL,

        issues              NVARCHAR(MAX) NULL,
        exceptions          NVARCHAR(MAX) NULL,
        remarks             NVARCHAR(MAX) NULL,

        version             VARCHAR(20) NULL,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_frequency CHECK (frequency IN ('AD_HOC', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'EVENT_DRIVEN'))
    );

    ALTER TABLE task_attribute
    ADD CONSTRAINT FK_task_attr_node
    FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    CREATE INDEX IX_task_attr_node ON task_attribute(node_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_predecessor')
BEGIN
    CREATE TABLE task_predecessor (
        predecessor_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        predecessor_node_id BIGINT NOT NULL,
        condition_desc      NVARCHAR(500) NULL,
        is_mandatory        BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT UQ_task_predecessor UNIQUE (node_id, predecessor_node_id)
    );

    ALTER TABLE task_predecessor
    ADD CONSTRAINT FK_tp_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_predecessor
    ADD CONSTRAINT FK_tp_predecessor FOREIGN KEY (predecessor_node_id) REFERENCES process_node(node_id);

    CREATE INDEX IX_task_predecessor_node ON task_predecessor(node_id);
    CREATE INDEX IX_task_predecessor_pred ON task_predecessor(predecessor_node_id);
END
GO
