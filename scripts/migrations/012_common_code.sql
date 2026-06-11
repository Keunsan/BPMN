-- ============================================
-- 012: Common Code (MAJOR / MINOR)
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'common_code_group')
BEGIN
    CREATE TABLE common_code_group (
        group_id            BIGINT IDENTITY(1,1) PRIMARY KEY,
        group_code          VARCHAR(30) NOT NULL,
        group_name          NVARCHAR(200) NOT NULL,
        description         NVARCHAR(500) NULL,
        sort_order          INT NOT NULL DEFAULT 0,
        is_active           BIT NOT NULL DEFAULT 1,
        created_by          BIGINT NULL,
        created_at          DATETIME NOT NULL DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT UQ_common_code_group_code UNIQUE (group_code)
    );

    CREATE INDEX IX_common_code_group_active ON common_code_group(is_active);
    CREATE INDEX IX_common_code_group_sort ON common_code_group(sort_order);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'common_code_group_i18n')
BEGIN
    CREATE TABLE common_code_group_i18n (
        i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        group_id            BIGINT NOT NULL,
        locale              VARCHAR(10) NOT NULL,
        group_name          NVARCHAR(200) NOT NULL,
        description         NVARCHAR(500) NULL,

        CONSTRAINT UQ_common_code_group_i18n UNIQUE (group_id, locale),
        CONSTRAINT CHK_common_code_group_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
    );

    ALTER TABLE common_code_group_i18n
    ADD CONSTRAINT FK_ccgi_group FOREIGN KEY (group_id) REFERENCES common_code_group(group_id);

    CREATE INDEX IX_common_code_group_i18n_locale ON common_code_group_i18n(locale);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'common_code')
BEGIN
    CREATE TABLE common_code (
        code_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        group_id            BIGINT NOT NULL,
        code                VARCHAR(30) NOT NULL,
        code_name           NVARCHAR(200) NOT NULL,
        description         NVARCHAR(500) NULL,
        sort_order          INT NOT NULL DEFAULT 0,
        is_active           BIT NOT NULL DEFAULT 1,
        created_by          BIGINT NULL,
        created_at          DATETIME NOT NULL DEFAULT GETDATE(),
        updated_by          BIGINT NULL,
        updated_at          DATETIME NULL,

        CONSTRAINT UQ_common_code_group_item UNIQUE (group_id, code)
    );

    ALTER TABLE common_code
    ADD CONSTRAINT FK_common_code_group FOREIGN KEY (group_id) REFERENCES common_code_group(group_id);

    CREATE INDEX IX_common_code_group ON common_code(group_id);
    CREATE INDEX IX_common_code_active ON common_code(is_active);
    CREATE INDEX IX_common_code_sort ON common_code(sort_order);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'common_code_i18n')
BEGIN
    CREATE TABLE common_code_i18n (
        i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        code_id             BIGINT NOT NULL,
        locale              VARCHAR(10) NOT NULL,
        code_name           NVARCHAR(200) NOT NULL,
        description         NVARCHAR(500) NULL,

        CONSTRAINT UQ_common_code_i18n UNIQUE (code_id, locale),
        CONSTRAINT CHK_common_code_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
    );

    ALTER TABLE common_code_i18n
    ADD CONSTRAINT FK_cci_code FOREIGN KEY (code_id) REFERENCES common_code(code_id);

    CREATE INDEX IX_common_code_i18n_locale ON common_code_i18n(locale);
END
GO
