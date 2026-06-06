-- ============================================
-- 006: Layer C - Data Table Link
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_data_table_link')
BEGIN
    CREATE TABLE task_data_table_link (
        link_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        system_id           BIGINT NOT NULL,
        schema_name         VARCHAR(50) NULL,
        table_name          VARCHAR(128) NOT NULL,
        table_name_kor      NVARCHAR(200) NULL,
        link_type           VARCHAR(20) NOT NULL,
        crud_type           VARCHAR(20) NULL,
        key_columns         NVARCHAR(500) NULL,
        filter_condition    NVARCHAR(500) NULL,
        description         NVARCHAR(500) NULL,
        data_volume         VARCHAR(20) NULL,
        is_critical         BIT DEFAULT 0,
        created_by          BIGINT NULL,
        created_at          DATETIME DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT CHK_link_type CHECK (link_type IN ('INPUT', 'OUTPUT', 'REFERENCE')),
        CONSTRAINT CHK_link_crud_type CHECK (crud_type IN ('C', 'R', 'U', 'D', 'CR', 'CU', 'CRU', 'CRUD', 'RU', 'RD', 'CRD', 'RUD')),
        CONSTRAINT CHK_link_data_volume CHECK (data_volume IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'))
    );

    ALTER TABLE task_data_table_link
    ADD CONSTRAINT FK_tdtl_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_data_table_link
    ADD CONSTRAINT FK_tdtl_system FOREIGN KEY (system_id) REFERENCES application_system(system_id);

    CREATE INDEX IX_task_data_link_node ON task_data_table_link(node_id);
    CREATE INDEX IX_task_data_link_system ON task_data_table_link(system_id);
    CREATE INDEX IX_task_data_link_table ON task_data_table_link(table_name);
    CREATE INDEX IX_task_data_link_type ON task_data_table_link(link_type);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'external_table_cache')
BEGIN
    CREATE TABLE external_table_cache (
        cache_id            BIGINT IDENTITY(1,1) PRIMARY KEY,
        system_id           BIGINT NOT NULL,
        schema_name         VARCHAR(50) NULL,
        table_name          VARCHAR(128) NOT NULL,
        table_name_kor      NVARCHAR(200) NULL,
        table_type          VARCHAR(20) NULL,
        description         NVARCHAR(MAX) NULL,
        record_count        BIGINT NULL,
        cached_at           DATETIME DEFAULT GETDATE(),
        expires_at          DATETIME NULL,

        CONSTRAINT UQ_external_table UNIQUE (system_id, schema_name, table_name)
    );

    ALTER TABLE external_table_cache
    ADD CONSTRAINT FK_etc_system
    FOREIGN KEY (system_id) REFERENCES application_system(system_id);

    CREATE INDEX IX_ext_table_system ON external_table_cache(system_id);
    CREATE INDEX IX_ext_table_expires ON external_table_cache(expires_at);
END
GO
