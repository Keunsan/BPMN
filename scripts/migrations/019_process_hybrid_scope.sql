-- ============================================
-- 019: Hybrid scope — QNC/CO enterprise codes + legacy NULL normalization
-- ============================================

IF NOT EXISTS (
    SELECT 1
    FROM common_code cc
    INNER JOIN common_code_group ccg ON cc.group_id = ccg.group_id
    WHERE ccg.group_code = 'COMPANY_CD'
      AND cc.code = 'QNC'
)
BEGIN
    INSERT INTO common_code (group_id, code, code_name, sort_order, is_active)
    SELECT group_id, 'QNC', N'전사(글로벌)', 0, 1
    FROM common_code_group
    WHERE group_code = 'COMPANY_CD';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM common_code cc
    INNER JOIN common_code_group ccg ON cc.group_id = ccg.group_id
    WHERE ccg.group_code = 'BU_CD'
      AND cc.code = 'CO'
)
BEGIN
    INSERT INTO common_code (group_id, code, code_name, sort_order, is_active)
    SELECT group_id, 'CO', N'전사공통', 0, 1
    FROM common_code_group
    WHERE group_code = 'BU_CD';
END
GO

UPDATE process_node
SET company_code = 'QNC'
WHERE variant_of IS NULL
  AND (company_code IS NULL OR LTRIM(RTRIM(company_code)) = '');

UPDATE process_node
SET business_unit_code = 'CO'
WHERE variant_of IS NULL
  AND (business_unit_code IS NULL OR LTRIM(RTRIM(business_unit_code)) = '');

UPDATE process_node
SET is_standard = 1
WHERE variant_of IS NULL
  AND company_code = 'QNC'
  AND business_unit_code = 'CO';

UPDATE process_node
SET is_standard = 0
WHERE variant_of IS NULL
  AND (company_code <> 'QNC' OR business_unit_code <> 'CO');
GO
