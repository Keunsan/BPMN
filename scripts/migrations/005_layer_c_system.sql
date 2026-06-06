-- ============================================
-- 005: Layer C - System Integration
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'application_system')
BEGIN
    CREATE TABLE application_system (
        system_id           BIGINT IDENTITY(1,1) PRIMARY KEY,
        system_code         VARCHAR(30) NOT NULL UNIQUE,
        system_name         NVARCHAR(200) NOT NULL,
        system_type         VARCHAR(30) NOT NULL,
        vendor              NVARCHAR(100) NULL,
        version             VARCHAR(50) NULL,
        description         NVARCHAR(MAX) NULL,
        system_owner_id     BIGINT NULL,
        is_active           BIT DEFAULT 1,

        table_api_url       NVARCHAR(500) NULL,
        table_api_auth_type VARCHAR(20) NULL,
        table_api_config    NVARCHAR(MAX) NULL,
        column_api_url      NVARCHAR(500) NULL,

        created_at          DATETIME DEFAULT GETDATE(),
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_system_type CHECK (system_type IN ('ERP', 'MES', 'SCM', 'SRM', 'WMS', 'QMS', 'PLM', 'CRM', 'HR', 'FI', 'BI', 'PORTAL', 'LEGACY', 'OTHER')),
        CONSTRAINT CHK_api_auth_type CHECK (table_api_auth_type IN ('NONE', 'BASIC', 'OAUTH', 'API_KEY'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'system_module')
BEGIN
    CREATE TABLE system_module (
        module_id           BIGINT IDENTITY(1,1) PRIMARY KEY,
        system_id           BIGINT NOT NULL,
        module_code         VARCHAR(30) NOT NULL,
        module_name         NVARCHAR(200) NOT NULL,
        description         NVARCHAR(500) NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT UQ_system_module UNIQUE (system_id, module_code)
    );

    ALTER TABLE system_module
    ADD CONSTRAINT FK_module_system
    FOREIGN KEY (system_id) REFERENCES application_system(system_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'system_screen')
BEGIN
    CREATE TABLE system_screen (
        screen_id           BIGINT IDENTITY(1,1) PRIMARY KEY,
        module_id           BIGINT NOT NULL,
        screen_code         VARCHAR(50) NOT NULL,
        screen_name         NVARCHAR(200) NOT NULL,
        transaction_code    VARCHAR(50) NULL,
        menu_path           NVARCHAR(500) NULL,
        screen_type         VARCHAR(20) NULL,
        url                 NVARCHAR(500) NULL,
        description         NVARCHAR(500) NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_screen_type CHECK (screen_type IN ('INPUT', 'INQUIRY', 'REPORT', 'MASTER', 'BATCH', 'APPROVAL', 'DASHBOARD'))
    );

    ALTER TABLE system_screen
    ADD CONSTRAINT FK_screen_module
    FOREIGN KEY (module_id) REFERENCES system_module(module_id);

    CREATE INDEX IX_screen_module ON system_screen(module_id);
    CREATE INDEX IX_screen_tcode ON system_screen(transaction_code);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_system_mapping')
BEGIN
    CREATE TABLE task_system_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        screen_id           BIGINT NOT NULL,
        usage_type          VARCHAR(20) NOT NULL,
        usage_description   NVARCHAR(500) NULL,
        is_primary          BIT DEFAULT 0,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_usage_type CHECK (usage_type IN ('EXECUTE', 'INQUIRY', 'APPROVAL', 'REPORT', 'INTERFACE'))
    );

    ALTER TABLE task_system_mapping
    ADD CONSTRAINT FK_tsm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_system_mapping
    ADD CONSTRAINT FK_tsm_screen FOREIGN KEY (screen_id) REFERENCES system_screen(screen_id);

    CREATE INDEX IX_task_system_node ON task_system_mapping(node_id);
    CREATE INDEX IX_task_system_screen ON task_system_mapping(screen_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'system_interface')
BEGIN
    CREATE TABLE system_interface (
        interface_id        BIGINT IDENTITY(1,1) PRIMARY KEY,
        interface_code      VARCHAR(50) NOT NULL UNIQUE,
        interface_name      NVARCHAR(200) NOT NULL,
        source_system_id    BIGINT NOT NULL,
        target_system_id    BIGINT NOT NULL,
        interface_type      VARCHAR(20) NOT NULL,
        protocol            VARCHAR(30) NULL,
        frequency           VARCHAR(20) NULL,
        description         NVARCHAR(MAX) NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_interface_type CHECK (interface_type IN ('REALTIME', 'BATCH', 'EVENT', 'FILE', 'API', 'RFC')),
        CONSTRAINT CHK_if_frequency CHECK (frequency IN ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'ON_DEMAND'))
    );

    ALTER TABLE system_interface
    ADD CONSTRAINT FK_if_source FOREIGN KEY (source_system_id) REFERENCES application_system(system_id);

    ALTER TABLE system_interface
    ADD CONSTRAINT FK_if_target FOREIGN KEY (target_system_id) REFERENCES application_system(system_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_interface_mapping')
BEGIN
    CREATE TABLE task_interface_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        interface_id        BIGINT NOT NULL,
        direction           VARCHAR(10) NOT NULL,
        description         NVARCHAR(500) NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_if_direction CHECK (direction IN ('SEND', 'RECEIVE', 'BOTH'))
    );

    ALTER TABLE task_interface_mapping
    ADD CONSTRAINT FK_tim_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_interface_mapping
    ADD CONSTRAINT FK_tim_interface FOREIGN KEY (interface_id) REFERENCES system_interface(interface_id);
END
GO
