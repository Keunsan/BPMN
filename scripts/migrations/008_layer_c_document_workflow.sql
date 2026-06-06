-- ============================================
-- 008: Layer C - Document / Workflow
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'document_type')
BEGIN
    CREATE TABLE document_type (
        type_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        type_code           VARCHAR(30) NOT NULL UNIQUE,
        type_name           NVARCHAR(100) NOT NULL,
        description         NVARCHAR(500) NULL,
        retention_years     INT NULL
    );

    INSERT INTO document_type (type_code, type_name) VALUES
    ('SOP', N'표준운영절차서'),
    ('WI', N'작업지시서'),
    ('POLICY', N'정책/규정'),
    ('MANUAL', N'매뉴얼'),
    ('FORM', N'양식/서식'),
    ('CHECKLIST', N'체크리스트'),
    ('GUIDE', N'가이드'),
    ('SPEC', N'사양서');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'document')
BEGIN
    CREATE TABLE document (
        doc_id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        doc_code            VARCHAR(50) NOT NULL UNIQUE,
        doc_name            NVARCHAR(300) NOT NULL,
        type_id             BIGINT NOT NULL,
        version             VARCHAR(20) NULL,
        file_path           NVARCHAR(500) NULL,
        file_size           BIGINT NULL,
        description         NVARCHAR(MAX) NULL,
        effective_date      DATE NULL,
        expiry_date         DATE NULL,
        owner_org_id        BIGINT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_doc_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
    );

    ALTER TABLE document
    ADD CONSTRAINT FK_doc_type FOREIGN KEY (type_id) REFERENCES document_type(type_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_document_mapping')
BEGIN
    CREATE TABLE task_document_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        doc_id              BIGINT NOT NULL,
        relation_type       VARCHAR(20) NOT NULL,
        description         NVARCHAR(500) NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_doc_relation CHECK (relation_type IN ('REFERENCE', 'OUTPUT', 'TEMPLATE', 'CHECKLIST'))
    );

    ALTER TABLE task_document_mapping
    ADD CONSTRAINT FK_tdm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_document_mapping
    ADD CONSTRAINT FK_tdm_doc FOREIGN KEY (doc_id) REFERENCES document(doc_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'approval_request')
BEGIN
    CREATE TABLE approval_request (
        request_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        entity_type         VARCHAR(30) NOT NULL,
        entity_id           BIGINT NOT NULL,
        request_type        VARCHAR(30) NOT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        requester_id        BIGINT NOT NULL,
        request_comment     NVARCHAR(MAX) NULL,
        requested_at        DATETIME DEFAULT GETDATE(),
        completed_at        DATETIME NULL,

        CONSTRAINT CHK_entity_type CHECK (entity_type IN ('PROCESS_NODE', 'BPMN_MODEL', 'DOCUMENT')),
        CONSTRAINT CHK_request_type CHECK (request_type IN ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'OBSOLETE')),
        CONSTRAINT CHK_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'approval_history')
BEGIN
    CREATE TABLE approval_history (
        history_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        request_id          BIGINT NOT NULL,
        approver_id         BIGINT NOT NULL,
        action              VARCHAR(20) NOT NULL,
        comment             NVARCHAR(MAX) NULL,
        action_at           DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_approval_action CHECK (action IN ('APPROVE', 'REJECT', 'RETURN', 'FORWARD'))
    );

    ALTER TABLE approval_history
    ADD CONSTRAINT FK_ah_request FOREIGN KEY (request_id) REFERENCES approval_request(request_id);
END
GO
