-- ============================================
-- 001: Layer A - Process Architecture
-- PAMS Database Schema for MSSQL 2017
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'process_node')
BEGIN
    CREATE TABLE process_node (
        node_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        parent_node_id      BIGINT NULL,
        level               VARCHAR(10) NOT NULL,
        code                VARCHAR(30) NOT NULL UNIQUE,
        name                NVARCHAR(200) NOT NULL,
        description         NVARCHAR(MAX) NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        owner_org_id        BIGINT NULL,
        version             VARCHAR(20) NULL,
        valid_from          DATE NULL,
        valid_to            DATE NULL,
        is_standard         BIT DEFAULT 1,
        variant_of          BIGINT NULL,
        sort_order          INT DEFAULT 0,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_process_node_level CHECK (level IN ('L1', 'L2', 'L3', 'L4')),
        CONSTRAINT CHK_process_node_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
    );

    CREATE INDEX IX_process_node_parent ON process_node(parent_node_id);
    CREATE INDEX IX_process_node_level ON process_node(level);
    CREATE INDEX IX_process_node_status ON process_node(status);
    CREATE INDEX IX_process_node_code ON process_node(code);

    ALTER TABLE process_node
    ADD CONSTRAINT FK_process_node_parent
    FOREIGN KEY (parent_node_id) REFERENCES process_node(node_id);

    ALTER TABLE process_node
    ADD CONSTRAINT FK_process_node_variant
    FOREIGN KEY (variant_of) REFERENCES process_node(node_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'process_node_history')
BEGIN
    CREATE TABLE process_node_history (
        history_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        version             VARCHAR(20) NOT NULL,
        change_type         VARCHAR(20) NOT NULL,
        change_reason       NVARCHAR(500) NULL,
        snapshot_data       NVARCHAR(MAX) NULL,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_history_change_type CHECK (change_type IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'VERSION_UP'))
    );

    ALTER TABLE process_node_history
    ADD CONSTRAINT FK_history_node
    FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    CREATE INDEX IX_process_history_node ON process_node_history(node_id);
END
GO
