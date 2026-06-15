-- ============================================
-- 024: E406 — 화면·시스템 연결 불일치
-- ============================================

IF NOT EXISTS (SELECT 1 FROM error_code WHERE error_code = 'E406')
BEGIN
    INSERT INTO error_code (error_code, http_status, category, is_retryable)
    VALUES ('E406', 400, 'BUSINESS', 0);

    INSERT INTO error_code_i18n (code_id, locale, message)
    SELECT c.code_id, v.locale, v.message
    FROM error_code c
    CROSS APPLY (VALUES
        ('ko', N'연결된 시스템에 속하지 않는 화면입니다.'),
        ('en', N'Screen does not belong to the linked system.'),
        ('zh-TW', N'畫面不屬於已連接的系統。')
    ) AS v(locale, message)
    WHERE c.error_code = 'E406';
END
GO
