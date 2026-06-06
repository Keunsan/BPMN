-- ============================================
-- 002: Layer B - BPMN Modeling
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'bpmn_model')
BEGIN
    CREATE TABLE bpmn_model (
        model_id            BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        model_name          NVARCHAR(200) NOT NULL,
        version             VARCHAR(20) NOT NULL DEFAULT '1.0.0',
        bpmn_xml            NVARCHAR(MAX) NULL,
        svg_content         NVARCHAR(MAX) NULL,
        thumbnail_path      NVARCHAR(500) NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        is_current          BIT DEFAULT 1,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_bpmn_model_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
    );

    ALTER TABLE bpmn_model
    ADD CONSTRAINT FK_bpmn_model_node
    FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    CREATE INDEX IX_bpmn_model_node ON bpmn_model(node_id);
    CREATE INDEX IX_bpmn_model_current ON bpmn_model(is_current) WHERE is_current = 1;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'bpmn_element')
BEGIN
    CREATE TABLE bpmn_element (
        element_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        model_id            BIGINT NOT NULL,
        element_type        VARCHAR(50) NOT NULL,
        element_bpmn_id     VARCHAR(100) NOT NULL,
        element_name        NVARCHAR(200) NULL,
        linked_node_id      BIGINT NULL,
        properties          NVARCHAR(MAX) NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_element_type CHECK (element_type IN (
            'START_EVENT', 'END_EVENT', 'INTERMEDIATE_EVENT',
            'USER_TASK', 'SERVICE_TASK', 'MANUAL_TASK', 'SCRIPT_TASK',
            'EXCLUSIVE_GATEWAY', 'PARALLEL_GATEWAY', 'INCLUSIVE_GATEWAY',
            'POOL', 'LANE', 'SEQUENCE_FLOW', 'MESSAGE_FLOW', 'SUBPROCESS'
        ))
    );

    ALTER TABLE bpmn_element
    ADD CONSTRAINT FK_bpmn_element_model
    FOREIGN KEY (model_id) REFERENCES bpmn_model(model_id);

    ALTER TABLE bpmn_element
    ADD CONSTRAINT FK_bpmn_element_node
    FOREIGN KEY (linked_node_id) REFERENCES process_node(node_id);

    CREATE INDEX IX_bpmn_element_model ON bpmn_element(model_id);
END
GO
