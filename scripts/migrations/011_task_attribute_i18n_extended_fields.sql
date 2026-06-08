-- ============================================
-- 011: Task Attribute i18n extended fields
-- ============================================

IF COL_LENGTH('task_attribute_i18n', 'input_data_desc') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD input_data_desc NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('task_attribute_i18n', 'input_condition') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD input_condition NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('task_attribute_i18n', 'output_data_desc') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD output_data_desc NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('task_attribute_i18n', 'output_condition') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD output_condition NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('task_attribute_i18n', 'issues') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD issues NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('task_attribute_i18n', 'exceptions') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD exceptions NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('task_attribute_i18n', 'remarks') IS NULL
BEGIN
    ALTER TABLE task_attribute_i18n ADD remarks NVARCHAR(MAX) NULL;
END
GO
