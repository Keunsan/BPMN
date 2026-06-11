-- ============================================
-- 014: Remove per-system table schema params
-- ============================================

IF COL_LENGTH('external_api_param_profile', 'table_schema_params_json') IS NOT NULL
BEGIN
    ALTER TABLE external_api_param_profile
    DROP COLUMN table_schema_params_json;
END
GO
