-- 시스템 유형에 GW(그룹웨어), ETS(수출입관리) 추가
IF OBJECT_ID('application_system', 'U') IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CHK_system_type'
          AND parent_object_id = OBJECT_ID('application_system')
    )
    BEGIN
        ALTER TABLE application_system DROP CONSTRAINT CHK_system_type;
    END

    ALTER TABLE application_system ADD CONSTRAINT CHK_system_type CHECK (
        system_type IN (
            'ERP', 'MES', 'SCM', 'SRM', 'WMS', 'QMS', 'PLM', 'CRM',
            'HR', 'FI', 'BI', 'GW', 'ETS', 'PORTAL', 'LEGACY', 'OTHER'
        )
    );
END
GO
