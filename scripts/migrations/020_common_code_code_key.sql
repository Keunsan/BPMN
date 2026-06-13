-- ============================================
-- 020: Common code natural key (GROUP_CODE, CODE)
-- ============================================

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_cci_code' AND parent_object_id = OBJECT_ID('common_code_i18n')
)
BEGIN
    ALTER TABLE common_code_i18n DROP CONSTRAINT FK_cci_code;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_common_code_group' AND parent_object_id = OBJECT_ID('common_code')
)
BEGIN
    ALTER TABLE common_code DROP CONSTRAINT FK_common_code_group;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_ccgi_group' AND parent_object_id = OBJECT_ID('common_code_group_i18n')
)
BEGIN
    ALTER TABLE common_code_group_i18n DROP CONSTRAINT FK_ccgi_group;
END
GO

IF COL_LENGTH('common_code_group_i18n', 'group_code') IS NULL
BEGIN
    ALTER TABLE common_code_group_i18n ADD group_code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('common_code', 'group_code') IS NULL
BEGIN
    ALTER TABLE common_code ADD group_code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('common_code_i18n', 'group_code') IS NULL
BEGIN
    ALTER TABLE common_code_i18n ADD group_code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('common_code_i18n', 'code') IS NULL
BEGIN
    ALTER TABLE common_code_i18n ADD code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('common_code_group_i18n', 'group_id') IS NOT NULL
BEGIN
    UPDATE ccgi
    SET group_code = ccg.group_code
    FROM common_code_group_i18n ccgi
    INNER JOIN common_code_group ccg ON ccgi.group_id = ccg.group_id
    WHERE ccgi.group_code IS NULL;
END
GO

IF COL_LENGTH('common_code', 'group_id') IS NOT NULL
BEGIN
    UPDATE cc
    SET group_code = ccg.group_code
    FROM common_code cc
    INNER JOIN common_code_group ccg ON cc.group_id = ccg.group_id
    WHERE cc.group_code IS NULL;
END
GO

IF COL_LENGTH('common_code_i18n', 'code_id') IS NOT NULL
BEGIN
    UPDATE cci
    SET
        group_code = cc.group_code,
        code = cc.code
    FROM common_code_i18n cci
    INNER JOIN common_code cc ON cci.code_id = cc.code_id
    WHERE cci.group_code IS NULL;
END
GO

IF COL_LENGTH('common_code_group_i18n', 'group_code') IS NOT NULL
   AND COL_LENGTH('common_code_group_i18n', 'group_id') IS NOT NULL
BEGIN
    ALTER TABLE common_code_group_i18n ALTER COLUMN group_code VARCHAR(30) NOT NULL;
END
GO

IF COL_LENGTH('common_code', 'group_code') IS NOT NULL
   AND COL_LENGTH('common_code', 'group_id') IS NOT NULL
BEGIN
    ALTER TABLE common_code ALTER COLUMN group_code VARCHAR(30) NOT NULL;
END
GO

IF COL_LENGTH('common_code_i18n', 'group_code') IS NOT NULL
   AND COL_LENGTH('common_code_i18n', 'code_id') IS NOT NULL
BEGIN
    ALTER TABLE common_code_i18n ALTER COLUMN group_code VARCHAR(30) NOT NULL;
    ALTER TABLE common_code_i18n ALTER COLUMN code VARCHAR(30) NOT NULL;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_common_code_group' AND object_id = OBJECT_ID('common_code')
)
BEGIN
    DROP INDEX IX_common_code_group ON common_code;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_common_code_group_i18n' AND parent_object_id = OBJECT_ID('common_code_group_i18n')
)
BEGIN
    ALTER TABLE common_code_group_i18n DROP CONSTRAINT UQ_common_code_group_i18n;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_common_code_i18n' AND parent_object_id = OBJECT_ID('common_code_i18n')
)
BEGIN
    ALTER TABLE common_code_i18n DROP CONSTRAINT UQ_common_code_i18n;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_common_code_group_item' AND parent_object_id = OBJECT_ID('common_code')
)
BEGIN
    ALTER TABLE common_code DROP CONSTRAINT UQ_common_code_group_item;
END
GO

IF COL_LENGTH('common_code', 'code_id') IS NOT NULL
BEGIN
    DECLARE @pkCommonCode NVARCHAR(200);
    SELECT @pkCommonCode = kc.name
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID('common_code') AND kc.type = 'PK';

    IF @pkCommonCode IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE common_code DROP CONSTRAINT ' + @pkCommonCode);
    END

    ALTER TABLE common_code DROP COLUMN code_id;
    ALTER TABLE common_code DROP COLUMN group_id;

    IF NOT EXISTS (
        SELECT 1 FROM sys.key_constraints
        WHERE name = 'PK_common_code' AND parent_object_id = OBJECT_ID('common_code')
    )
    BEGIN
        ALTER TABLE common_code
        ADD CONSTRAINT PK_common_code PRIMARY KEY (group_code, code);
    END
END
GO

IF COL_LENGTH('common_code_group', 'group_id') IS NOT NULL
BEGIN
    DECLARE @pkCommonCodeGroup NVARCHAR(200);
    SELECT @pkCommonCodeGroup = kc.name
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID('common_code_group') AND kc.type = 'PK';

    IF @pkCommonCodeGroup IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE common_code_group DROP CONSTRAINT ' + @pkCommonCodeGroup);
    END

    IF EXISTS (
        SELECT 1 FROM sys.key_constraints
        WHERE name = 'UQ_common_code_group_code' AND parent_object_id = OBJECT_ID('common_code_group')
    )
    BEGIN
        ALTER TABLE common_code_group DROP CONSTRAINT UQ_common_code_group_code;
    END

    ALTER TABLE common_code_group DROP COLUMN group_id;

    IF NOT EXISTS (
        SELECT 1 FROM sys.key_constraints
        WHERE name = 'PK_common_code_group' AND parent_object_id = OBJECT_ID('common_code_group')
    )
    BEGIN
        ALTER TABLE common_code_group
        ADD CONSTRAINT PK_common_code_group PRIMARY KEY (group_code);
    END
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_common_code_group' AND parent_object_id = OBJECT_ID('common_code')
)
BEGIN
    ALTER TABLE common_code
    ADD CONSTRAINT FK_common_code_group
        FOREIGN KEY (group_code) REFERENCES common_code_group(group_code);
END
GO

IF COL_LENGTH('common_code_group_i18n', 'group_id') IS NOT NULL
BEGIN
    ALTER TABLE common_code_group_i18n DROP COLUMN group_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_common_code_group_i18n' AND parent_object_id = OBJECT_ID('common_code_group_i18n')
)
BEGIN
    ALTER TABLE common_code_group_i18n
    ADD CONSTRAINT UQ_common_code_group_i18n UNIQUE (group_code, locale);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_ccgi_group' AND parent_object_id = OBJECT_ID('common_code_group_i18n')
)
BEGIN
    ALTER TABLE common_code_group_i18n
    ADD CONSTRAINT FK_ccgi_group
        FOREIGN KEY (group_code) REFERENCES common_code_group(group_code);
END
GO

IF COL_LENGTH('common_code_i18n', 'code_id') IS NOT NULL
BEGIN
    ALTER TABLE common_code_i18n DROP COLUMN code_id;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_common_code_i18n' AND parent_object_id = OBJECT_ID('common_code_i18n')
)
BEGIN
    ALTER TABLE common_code_i18n
    ADD CONSTRAINT UQ_common_code_i18n UNIQUE (group_code, code, locale);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_cci_code' AND parent_object_id = OBJECT_ID('common_code_i18n')
)
BEGIN
    ALTER TABLE common_code_i18n
    ADD CONSTRAINT FK_cci_code
        FOREIGN KEY (group_code, code) REFERENCES common_code(group_code, code);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_common_code_group_code' AND object_id = OBJECT_ID('common_code')
)
BEGIN
    CREATE INDEX IX_common_code_group_code ON common_code(group_code);
END
GO
