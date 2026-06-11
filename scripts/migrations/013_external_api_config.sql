-- ============================================
-- 013: External API global config + system param profiles
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'external_api_global_config')
BEGIN
    CREATE TABLE external_api_global_config (
        config_id               BIGINT IDENTITY(1,1) PRIMARY KEY,
        table_list_api_url      NVARCHAR(500) NULL,
        table_schema_api_url    NVARCHAR(500) NULL,
        auth_type               VARCHAR(20) NULL DEFAULT 'NONE',
        auth_config_json        NVARCHAR(MAX) NULL,
        updated_at              DATETIME NULL,

        CONSTRAINT CHK_external_api_auth_type
            CHECK (auth_type IN ('NONE', 'BASIC', 'OAUTH', 'API_KEY'))
    );

    INSERT INTO external_api_global_config (auth_type) VALUES ('NONE');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'external_api_param_profile')
BEGIN
    CREATE TABLE external_api_param_profile (
        profile_id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
        system_id                   BIGINT NOT NULL,
        table_list_params_json      NVARCHAR(MAX) NULL,
        table_schema_params_json    NVARCHAR(MAX) NULL,
        header_overrides_json       NVARCHAR(MAX) NULL,
        is_active                   BIT DEFAULT 1,
        created_at                  DATETIME DEFAULT GETDATE(),
        updated_at                  DATETIME NULL,

        CONSTRAINT UQ_external_api_param_profile_system UNIQUE (system_id)
    );

    ALTER TABLE external_api_param_profile
    ADD CONSTRAINT FK_external_api_param_profile_system
    FOREIGN KEY (system_id) REFERENCES application_system(system_id);

    CREATE INDEX IX_external_api_param_profile_system
        ON external_api_param_profile(system_id);
END
GO
