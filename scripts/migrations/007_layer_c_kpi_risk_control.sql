-- ============================================
-- 007: Layer C - KPI / Risk / Control
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'kpi')
BEGIN
    CREATE TABLE kpi (
        kpi_id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        kpi_code            VARCHAR(30) NOT NULL UNIQUE,
        kpi_name            NVARCHAR(200) NOT NULL,
        kpi_category        VARCHAR(30) NULL,
        description         NVARCHAR(MAX) NULL,
        formula             NVARCHAR(500) NULL,
        unit                VARCHAR(30) NULL,
        target_value        NVARCHAR(100) NULL,
        measurement_cycle   VARCHAR(20) NULL,
        owner_org_id        BIGINT NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_kpi_category CHECK (kpi_category IN ('EFFICIENCY', 'QUALITY', 'COST', 'DELIVERY', 'SAFETY', 'COMPLIANCE')),
        CONSTRAINT CHK_kpi_cycle CHECK (measurement_cycle IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_kpi_mapping')
BEGIN
    CREATE TABLE task_kpi_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        kpi_id              BIGINT NOT NULL,
        contribution_type   VARCHAR(20) NULL,
        weight              DECIMAL(5,2) NULL,
        description         NVARCHAR(500) NULL,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_contribution_type CHECK (contribution_type IN ('DIRECT', 'INDIRECT', 'SUPPORTING'))
    );

    ALTER TABLE task_kpi_mapping
    ADD CONSTRAINT FK_tkm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_kpi_mapping
    ADD CONSTRAINT FK_tkm_kpi FOREIGN KEY (kpi_id) REFERENCES kpi(kpi_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'risk')
BEGIN
    CREATE TABLE risk (
        risk_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        risk_code           VARCHAR(30) NOT NULL UNIQUE,
        risk_name           NVARCHAR(200) NOT NULL,
        risk_category       VARCHAR(30) NULL,
        description         NVARCHAR(MAX) NULL,
        likelihood          VARCHAR(10) NULL,
        impact              VARCHAR(10) NULL,
        risk_level          VARCHAR(10) NULL,
        mitigation          NVARCHAR(MAX) NULL,
        owner_org_id        BIGINT NULL,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_risk_category CHECK (risk_category IN ('OPERATIONAL', 'FINANCIAL', 'COMPLIANCE', 'IT', 'STRATEGIC')),
        CONSTRAINT CHK_likelihood CHECK (likelihood IN ('LOW', 'MEDIUM', 'HIGH')),
        CONSTRAINT CHK_impact CHECK (impact IN ('LOW', 'MEDIUM', 'HIGH')),
        CONSTRAINT CHK_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'control')
BEGIN
    CREATE TABLE control (
        control_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        control_code        VARCHAR(30) NOT NULL UNIQUE,
        control_name        NVARCHAR(200) NOT NULL,
        control_type        VARCHAR(30) NOT NULL,
        control_category    VARCHAR(30) NULL,
        description         NVARCHAR(MAX) NULL,
        frequency           VARCHAR(20) NULL,
        evidence            NVARCHAR(500) NULL,
        owner_org_id        BIGINT NULL,
        is_key_control      BIT DEFAULT 0,
        is_active           BIT DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_control_type CHECK (control_type IN ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE')),
        CONSTRAINT CHK_control_category CHECK (control_category IN ('MANUAL', 'IT_DEPENDENT', 'AUTOMATED', 'HYBRID'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_risk_mapping')
BEGIN
    CREATE TABLE task_risk_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        risk_id             BIGINT NOT NULL,
        description         NVARCHAR(500) NULL,
        created_at          DATETIME DEFAULT GETDATE()
    );

    ALTER TABLE task_risk_mapping
    ADD CONSTRAINT FK_trisk_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_risk_mapping
    ADD CONSTRAINT FK_trisk_risk FOREIGN KEY (risk_id) REFERENCES risk(risk_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'task_control_mapping')
BEGIN
    CREATE TABLE task_control_mapping (
        mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        node_id             BIGINT NOT NULL,
        control_id          BIGINT NOT NULL,
        linked_risk_id      BIGINT NULL,
        description         NVARCHAR(500) NULL,
        created_at          DATETIME DEFAULT GETDATE()
    );

    ALTER TABLE task_control_mapping
    ADD CONSTRAINT FK_tctrl_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

    ALTER TABLE task_control_mapping
    ADD CONSTRAINT FK_tctrl_control FOREIGN KEY (control_id) REFERENCES control(control_id);

    ALTER TABLE task_control_mapping
    ADD CONSTRAINT FK_tctrl_risk FOREIGN KEY (linked_risk_id) REFERENCES risk(risk_id);
END
GO
