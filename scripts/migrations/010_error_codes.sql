-- ============================================
-- 010: Error Code Tables + Initial Data
-- PRD 9.2 에러 코드 체계
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'error_code')
BEGIN
    CREATE TABLE error_code (
        code_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        error_code          VARCHAR(10) NOT NULL UNIQUE,
        http_status         INT NOT NULL,
        category            VARCHAR(20) NOT NULL,
        is_retryable        BIT NOT NULL DEFAULT 0,
        is_active           BIT NOT NULL DEFAULT 1,
        created_at          DATETIME DEFAULT GETDATE(),

        CONSTRAINT CHK_error_category CHECK (category IN ('VALIDATION', 'AUTH', 'PERMISSION', 'RESOURCE', 'BUSINESS', 'SYSTEM', 'EXTERNAL'))
    );

    CREATE INDEX IX_error_code_category ON error_code(category);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'error_code_i18n')
BEGIN
    CREATE TABLE error_code_i18n (
        i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
        code_id             BIGINT NOT NULL,
        locale              VARCHAR(10) NOT NULL,
        message             NVARCHAR(500) NOT NULL,

        CONSTRAINT UQ_error_code_i18n UNIQUE (code_id, locale),
        CONSTRAINT CHK_error_code_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
    );

    ALTER TABLE error_code_i18n
    ADD CONSTRAINT FK_eci_code FOREIGN KEY (code_id) REFERENCES error_code(code_id);

    CREATE INDEX IX_error_code_i18n_locale ON error_code_i18n(locale);
END
GO

-- 초기 에러 코드 데이터 (PRD 9.2.2)
IF NOT EXISTS (SELECT 1 FROM error_code WHERE error_code = 'E001')
BEGIN
    INSERT INTO error_code (error_code, http_status, category, is_retryable) VALUES
    ('E001', 400, 'VALIDATION', 0),
    ('E002', 400, 'VALIDATION', 0),
    ('E003', 400, 'VALIDATION', 0),
    ('E004', 400, 'VALIDATION', 0),
    ('E005', 400, 'VALIDATION', 0),
    ('E101', 401, 'AUTH', 0),
    ('E102', 401, 'AUTH', 0),
    ('E103', 401, 'AUTH', 0),
    ('E104', 401, 'AUTH', 0),
    ('E201', 403, 'PERMISSION', 0),
    ('E202', 403, 'PERMISSION', 0),
    ('E203', 403, 'PERMISSION', 0),
    ('E301', 404, 'RESOURCE', 0),
    ('E302', 404, 'RESOURCE', 0),
    ('E303', 404, 'RESOURCE', 0),
    ('E304', 409, 'RESOURCE', 0),
    ('E305', 409, 'RESOURCE', 1),
    ('E401', 400, 'BUSINESS', 0),
    ('E402', 400, 'BUSINESS', 0),
    ('E403', 400, 'BUSINESS', 0),
    ('E404', 400, 'BUSINESS', 0),
    ('E405', 400, 'BUSINESS', 0),
    ('E501', 500, 'SYSTEM', 1),
    ('E502', 500, 'SYSTEM', 1),
    ('E503', 503, 'SYSTEM', 1),
    ('E601', 502, 'EXTERNAL', 1),
    ('E602', 504, 'EXTERNAL', 1),
    ('E603', 502, 'EXTERNAL', 1),
    ('E604', 503, 'EXTERNAL', 1);

    INSERT INTO error_code_i18n (code_id, locale, message)
    SELECT c.code_id, v.locale, v.message
    FROM error_code c
    CROSS APPLY (VALUES
        ('E001', 'ko', N'필수 입력값이 누락되었습니다.'),
        ('E001', 'en', N'Required field is missing.'),
        ('E001', 'zh-TW', N'必填欄位缺失。'),
        ('E002', 'ko', N'입력값 형식이 올바르지 않습니다.'),
        ('E002', 'en', N'Invalid input format.'),
        ('E002', 'zh-TW', N'輸入格式無效。'),
        ('E003', 'ko', N'입력값이 허용 범위를 초과했습니다.'),
        ('E003', 'en', N'Input value exceeds allowed range.'),
        ('E003', 'zh-TW', N'輸入值超出允許範圍。'),
        ('E004', 'ko', N'중복된 값이 존재합니다.'),
        ('E004', 'en', N'Duplicate value exists.'),
        ('E004', 'zh-TW', N'存在重複值。'),
        ('E005', 'ko', N'입력값 길이가 초과되었습니다.'),
        ('E005', 'en', N'Input length exceeds limit.'),
        ('E005', 'zh-TW', N'輸入長度超過限制。'),
        ('E101', 'ko', N'인증이 필요합니다. 로그인해주세요.'),
        ('E101', 'en', N'Authentication required. Please login.'),
        ('E101', 'zh-TW', N'需要認證。請登入。'),
        ('E102', 'ko', N'인증 토큰이 만료되었습니다.'),
        ('E102', 'en', N'Authentication token has expired.'),
        ('E102', 'zh-TW', N'認證令牌已過期。'),
        ('E103', 'ko', N'인증 토큰이 유효하지 않습니다.'),
        ('E103', 'en', N'Invalid authentication token.'),
        ('E103', 'zh-TW', N'認證令牌無效。'),
        ('E104', 'ko', N'계정이 비활성화되었습니다.'),
        ('E104', 'en', N'Account has been deactivated.'),
        ('E104', 'zh-TW', N'帳戶已被停用。'),
        ('E201', 'ko', N'접근 권한이 없습니다.'),
        ('E201', 'en', N'Access denied.'),
        ('E201', 'zh-TW', N'拒絕訪問。'),
        ('E202', 'ko', N'해당 작업을 수행할 권한이 없습니다.'),
        ('E202', 'en', N'Not authorized to perform this action.'),
        ('E202', 'zh-TW', N'無權執行此操作。'),
        ('E203', 'ko', N'승인 권한이 없습니다.'),
        ('E203', 'en', N'Not authorized to approve.'),
        ('E203', 'zh-TW', N'無批准權限。'),
        ('E301', 'ko', N'요청한 데이터를 찾을 수 없습니다.'),
        ('E301', 'en', N'Requested data not found.'),
        ('E301', 'zh-TW', N'找不到請求的數據。'),
        ('E302', 'ko', N'프로세스를 찾을 수 없습니다.'),
        ('E302', 'en', N'Process not found.'),
        ('E302', 'zh-TW', N'找不到流程。'),
        ('E303', 'ko', N'BPMN 모델을 찾을 수 없습니다.'),
        ('E303', 'en', N'BPMN model not found.'),
        ('E303', 'zh-TW', N'找不到BPMN模型。'),
        ('E304', 'ko', N'이미 존재하는 코드입니다.'),
        ('E304', 'en', N'Code already exists.'),
        ('E304', 'zh-TW', N'代碼已存在。'),
        ('E305', 'ko', N'다른 사용자가 수정 중입니다.'),
        ('E305', 'en', N'Being edited by another user.'),
        ('E305', 'zh-TW', N'另一位用戶正在編輯。'),
        ('E401', 'ko', N'하위 프로세스가 존재하여 삭제할 수 없습니다.'),
        ('E401', 'en', N'Cannot delete: child processes exist.'),
        ('E401', 'zh-TW', N'無法刪除：存在子流程。'),
        ('E402', 'ko', N'승인 대기 중인 항목은 수정할 수 없습니다.'),
        ('E402', 'en', N'Cannot modify item pending approval.'),
        ('E402', 'zh-TW', N'無法修改待批准項目。'),
        ('E403', 'ko', N'Published 상태는 직접 수정할 수 없습니다.'),
        ('E403', 'en', N'Cannot directly modify Published status.'),
        ('E403', 'zh-TW', N'無法直接修改已發布狀態。'),
        ('E404', 'ko', N'순환 참조가 감지되었습니다.'),
        ('E404', 'en', N'Circular reference detected.'),
        ('E404', 'zh-TW', N'檢測到循環引用。'),
        ('E405', 'ko', N'필수 속성이 입력되지 않아 승인 요청할 수 없습니다.'),
        ('E405', 'en', N'Required attributes missing for approval.'),
        ('E405', 'zh-TW', N'缺少必要屬性，無法申請批准。'),
        ('E501', 'ko', N'시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'),
        ('E501', 'en', N'System error occurred. Please try again later.'),
        ('E501', 'zh-TW', N'發生系統錯誤。請稍後再試。'),
        ('E502', 'ko', N'데이터베이스 오류가 발생했습니다.'),
        ('E502', 'en', N'Database error occurred.'),
        ('E502', 'zh-TW', N'發生數據庫錯誤。'),
        ('E503', 'ko', N'서비스를 일시적으로 사용할 수 없습니다.'),
        ('E503', 'en', N'Service temporarily unavailable.'),
        ('E503', 'zh-TW', N'服務暫時不可用。'),
        ('E601', 'ko', N'외부 시스템 연결에 실패했습니다.'),
        ('E601', 'en', N'External system connection failed.'),
        ('E601', 'zh-TW', N'外部系統連接失敗。'),
        ('E602', 'ko', N'외부 시스템 응답 시간이 초과되었습니다.'),
        ('E602', 'en', N'External system response timeout.'),
        ('E602', 'zh-TW', N'外部系統響應超時。'),
        ('E603', 'ko', N'외부 시스템에서 오류가 반환되었습니다.'),
        ('E603', 'en', N'External system returned an error.'),
        ('E603', 'zh-TW', N'外部系統返回錯誤。'),
        ('E604', 'ko', N'외부 시스템이 일시적으로 사용 불가합니다.'),
        ('E604', 'en', N'External system temporarily unavailable.'),
        ('E604', 'zh-TW', N'外部系統暫時不可用。')
    ) AS v(error_code, locale, message)
    WHERE c.error_code = v.error_code;
END
GO
