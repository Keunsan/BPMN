-- ============================================
-- 025: E2E Process Catalog + BPMN model_kind
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'e2e_process')
BEGIN
    CREATE TABLE e2e_process (
        e2e_process_id    BIGINT IDENTITY(1,1) PRIMARY KEY,
        code              VARCHAR(50) NOT NULL,
        name              NVARCHAR(200) NOT NULL,
        description       NVARCHAR(MAX) NULL,
        tags              NVARCHAR(MAX) NULL,
        status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        version           VARCHAR(20) NOT NULL DEFAULT '1.0.0',
        owner_org_id      BIGINT NULL,
        created_by        BIGINT NULL,
        created_at        DATETIME DEFAULT GETDATE(),
        updated_by        BIGINT NULL,
        updated_at        DATETIME NULL,

        CONSTRAINT UQ_e2e_process_code UNIQUE (code),
        CONSTRAINT CHK_e2e_process_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
    );

    CREATE INDEX IX_e2e_process_status ON e2e_process(status);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('bpmn_model') AND name = 'model_kind'
)
BEGIN
    ALTER TABLE bpmn_model ADD model_kind VARCHAR(20) NOT NULL DEFAULT 'L3_PROCESS';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('bpmn_model') AND name = 'e2e_process_id'
)
BEGIN
    ALTER TABLE bpmn_model ADD e2e_process_id BIGINT NULL;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('bpmn_model') AND name = 'node_id' AND is_nullable = 0
)
BEGIN
    ALTER TABLE bpmn_model ALTER COLUMN node_id BIGINT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_bpmn_model_e2e_process'
)
BEGIN
    ALTER TABLE bpmn_model
    ADD CONSTRAINT FK_bpmn_model_e2e_process
    FOREIGN KEY (e2e_process_id) REFERENCES e2e_process(e2e_process_id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_bpmn_model_owner'
)
BEGIN
    ALTER TABLE bpmn_model
    ADD CONSTRAINT CHK_bpmn_model_owner CHECK (
        (model_kind = 'L3_PROCESS' AND node_id IS NOT NULL AND e2e_process_id IS NULL)
        OR (model_kind = 'E2E' AND e2e_process_id IS NOT NULL AND node_id IS NULL)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_bpmn_model_kind'
)
BEGIN
    ALTER TABLE bpmn_model
    ADD CONSTRAINT CHK_bpmn_model_kind CHECK (model_kind IN ('L3_PROCESS', 'E2E'));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_bpmn_model_e2e_process'
)
BEGIN
    CREATE INDEX IX_bpmn_model_e2e_process ON bpmn_model(e2e_process_id);
END
GO
