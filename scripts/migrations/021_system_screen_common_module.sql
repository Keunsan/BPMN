-- ============================================
-- 021: Common MODULE_CD + system_screen by system + menu_id
-- ============================================

IF NOT EXISTS (SELECT 1 FROM common_code_group WHERE group_code = 'MODULE_CD')
BEGIN
    INSERT INTO common_code_group (
        group_code,
        group_name,
        description,
        sort_order,
        is_active
    )
    VALUES (
        'MODULE_CD',
        N'업무 모듈',
        N'전사 공통 업무 모듈 코드',
        30,
        1
    );
END
GO

DECLARE @moduleSeed TABLE (
    code        VARCHAR(30) NOT NULL,
    sort_order  INT NOT NULL
);

INSERT INTO @moduleSeed (code, sort_order)
VALUES
    ('CFG', 10),
    ('CM', 20),
    ('CO', 30),
    ('DT', 40),
    ('EIS', 50),
    ('FI', 60),
    ('GLOBAL', 70),
    ('HR', 80),
    ('IM', 90),
    ('MC', 100),
    ('MDM', 110),
    ('MM', 120),
    ('PDW', 130),
    ('PP', 140),
    ('QM', 150),
    ('SCM', 160),
    ('SD', 170),
    ('TAX', 180),
    ('ZM', 190);

INSERT INTO common_code (group_code, code, code_name, sort_order, is_active)
SELECT
    'MODULE_CD',
    ms.code,
    ms.code,
    ms.sort_order,
    1
FROM @moduleSeed ms
WHERE NOT EXISTS (
    SELECT 1
    FROM common_code cc
    WHERE cc.group_code = 'MODULE_CD'
      AND cc.code = ms.code
);
GO

IF COL_LENGTH('system_screen', 'system_id') IS NULL
BEGIN
    ALTER TABLE system_screen ADD system_id BIGINT NULL;
END
GO

IF COL_LENGTH('system_screen', 'module_code') IS NULL
BEGIN
    ALTER TABLE system_screen ADD module_code VARCHAR(30) NULL;
END
GO

IF COL_LENGTH('system_screen', 'menu_id') IS NULL
BEGIN
    ALTER TABLE system_screen ADD menu_id VARCHAR(50) NULL;
END
GO

IF COL_LENGTH('system_screen', 'module_id') IS NOT NULL
BEGIN
    UPDATE sc
    SET
        sc.system_id = m.system_id,
        sc.module_code = m.module_code,
        sc.menu_id = COALESCE(NULLIF(sc.transaction_code, ''), sc.screen_code)
    FROM system_screen sc
    INNER JOIN system_module m ON sc.module_id = m.module_id
    WHERE sc.system_id IS NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_screen_module'
      AND parent_object_id = OBJECT_ID('system_screen')
)
BEGIN
    ALTER TABLE system_screen DROP CONSTRAINT FK_screen_module;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_screen_module'
      AND object_id = OBJECT_ID('system_screen')
)
BEGIN
    DROP INDEX IX_screen_module ON system_screen;
END
GO

IF COL_LENGTH('system_screen', 'module_id') IS NOT NULL
BEGIN
    ALTER TABLE system_screen DROP COLUMN module_id;
END
GO

IF OBJECT_ID('system_module', 'U') IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_module_system'
          AND parent_object_id = OBJECT_ID('system_module')
    )
    BEGIN
        ALTER TABLE system_module DROP CONSTRAINT FK_module_system;
    END

    DROP TABLE system_module;
END
GO

DELETE FROM system_screen
WHERE system_id IS NULL
   OR module_code IS NULL
   OR menu_id IS NULL;
GO

IF COL_LENGTH('system_screen', 'system_id') IS NOT NULL
BEGIN
    ALTER TABLE system_screen ALTER COLUMN system_id BIGINT NOT NULL;
END
GO

IF COL_LENGTH('system_screen', 'module_code') IS NOT NULL
BEGIN
    ALTER TABLE system_screen ALTER COLUMN module_code VARCHAR(30) NOT NULL;
END
GO

IF COL_LENGTH('system_screen', 'menu_id') IS NOT NULL
BEGIN
    ALTER TABLE system_screen ALTER COLUMN menu_id VARCHAR(50) NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_screen_system'
      AND parent_object_id = OBJECT_ID('system_screen')
)
BEGIN
    ALTER TABLE system_screen
    ADD CONSTRAINT FK_screen_system
    FOREIGN KEY (system_id) REFERENCES application_system(system_id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_system_screen_menu'
      AND object_id = OBJECT_ID('system_screen')
)
BEGIN
    CREATE UNIQUE INDEX UQ_system_screen_menu
    ON system_screen(system_id, menu_id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_screen_system_module'
      AND object_id = OBJECT_ID('system_screen')
)
BEGIN
    CREATE INDEX IX_screen_system_module
    ON system_screen(system_id, module_code);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_screen_menu_id'
      AND object_id = OBJECT_ID('system_screen')
)
BEGIN
    CREATE INDEX IX_screen_menu_id ON system_screen(menu_id);
END
GO
