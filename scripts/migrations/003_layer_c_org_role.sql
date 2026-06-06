-- ============================================
-- 003: Layer C - Organization / Role / RACI
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'organization')
BEGIN
    CREATE TABLE organization (
        org_id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        parent_org_id       BIGINT NULL,
        org_code            VARCHAR(30) NOT NULL UNIQUE,
        org_name            NVARCHAR(200) NOT NULL,
        org_type            VARCHAR(20) NOT NULL,
        org_level           INT NULL,
        is_active           BIT DEFAULT 1,
        valid_from          DATE NULL,
        valid_to            DATE NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_org_type CHECK (org_type IN ('COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'PLANT', 'SUBSIDIARY'))
    );

    ALTER TABLE organization
    ADD CONSTRAINT FK_org_parent
    FOREIGN KEY (parent_org_id) REFERENCES organization(org_id);

    CREATE INDEX IX_org_parent ON organization(parent_org_id);
    CREATE INDEX IX_org_code ON organization(org_code);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'role')
BEGIN
    CREATE TABLE role (
        role_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        role_code           VARCHAR(30) NOT NULL UNIQUE,
        role_name           NVARCHAR(100) NOT NULL,
        role_description    NVARCHAR(500) NULL,
        role_category       VARCHAR(20) NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_role_category CHECK (role_category IN ('BUSINESS', 'IT', 'MANAGEMENT', 'AUDIT', 'EXTERNAL'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        user_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_account        VARCHAR(50) NOT NULL UNIQUE,
        user_name           NVARCHAR(100) NOT NULL,
        email               VARCHAR(200) NULL,
        org_id              BIGINT NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_at          DATETIME NULL
    );

    ALTER TABLE users
    ADD CONSTRAINT FK_user_org
    FOREIGN KEY (org_id) REFERENCES organization(org_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'user_role_mapping')
BEGIN
    CREATE TABLE user_role_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_id             BIGINT NOT NULL,
        role_id             BIGINT NOT NULL,
        valid_from          DATE NULL,
        valid_to            DATE NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT UQ_user_role UNIQUE (user_id, role_id)
    );

    ALTER TABLE user_role_mapping
    ADD CONSTRAINT FK_urm_user FOREIGN KEY (user_id) REFERENCES users(user_id);

    ALTER TABLE user_role_mapping
    ADD CONSTRAINT FK_urm_role FOREIGN KEY (role_id) REFERENCES role(role_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_role_mapping')
BEGIN
    CREATE TABLE task_role_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        org_id              BIGINT NULL,
        role_id             BIGINT NULL,
        raci_type           VARCHAR(20) NOT NULL,
        description         NVARCHAR(500) NULL,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_raci_type CHECK (raci_type IN ('RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'))
    );

    ALTER TABLE task_role_mapping
    ADD CONSTRAINT FK_trm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_role_mapping
    ADD CONSTRAINT FK_trm_org FOREIGN KEY (org_id) REFERENCES organization(org_id);

    ALTER TABLE task_role_mapping
    ADD CONSTRAINT FK_trm_role FOREIGN KEY (role_id) REFERENCES role(role_id);

    CREATE INDEX IX_task_role_node ON task_role_mapping(node_id);
END
GO
