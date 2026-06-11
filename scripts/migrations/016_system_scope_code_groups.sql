-- ============================================
-- 016: System scope common code groups (COMPANY_CD, BU_CD)
-- ============================================

IF NOT EXISTS (SELECT 1 FROM common_code_group WHERE group_code = 'COMPANY_CD')
BEGIN
    INSERT INTO common_code_group (
        group_code,
        group_name,
        description,
        sort_order,
        is_active
    )
    VALUES (
        'COMPANY_CD',
        N'법인',
        N'시스템 운영 법인 구분',
        10,
        1
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM common_code_group WHERE group_code = 'BU_CD')
BEGIN
    INSERT INTO common_code_group (
        group_code,
        group_name,
        description,
        sort_order,
        is_active
    )
    VALUES (
        'BU_CD',
        N'사업부',
        N'시스템 운영 사업부 구분',
        20,
        1
    );
END
GO
