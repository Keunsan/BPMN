-- ============================================
-- 009: i18n Tables
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'process_node_i18n')
BEGIN
    CREATE TABLE process_node_i18n (
        i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        locale              VARCHAR(10) NOT NULL,
        name                NVARCHAR(200) NOT NULL,
        description         NVARCHAR(MAX) NULL,

        CONSTRAINT UQ_process_node_i18n UNIQUE (node_id, locale),
        CONSTRAINT CHK_process_node_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
    );

    ALTER TABLE process_node_i18n
    ADD CONSTRAINT FK_pni_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    CREATE INDEX IX_process_node_i18n_locale ON process_node_i18n(locale);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_attribute_i18n')
BEGIN
    CREATE TABLE task_attribute_i18n (
        i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        attr_id             BIGINT NOT NULL,
        locale              VARCHAR(10) NOT NULL,
        definition          NVARCHAR(MAX) NULL,
        purpose             NVARCHAR(1000) NULL,
        input_deliverable   NVARCHAR(MAX) NULL,
        output_deliverable  NVARCHAR(MAX) NULL,

        CONSTRAINT UQ_task_attr_i18n UNIQUE (attr_id, locale),
        CONSTRAINT CHK_task_attr_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
    );

    ALTER TABLE task_attribute_i18n
    ADD CONSTRAINT FK_tai_attr FOREIGN KEY (attr_id) REFERENCES task_attribute(attr_id);

    CREATE INDEX IX_task_attr_i18n_locale ON task_attribute_i18n(locale);
END
GO
