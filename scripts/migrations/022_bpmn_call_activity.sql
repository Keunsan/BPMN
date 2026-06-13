-- ============================================
-- 022: BPMN Call Activity element type
-- L3 크로스-L2 프로세스 호출 연결 지원
-- ============================================

IF EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CHK_element_type'
    AND parent_object_id = OBJECT_ID('bpmn_element')
)
BEGIN
  ALTER TABLE bpmn_element DROP CONSTRAINT CHK_element_type;
END
GO

ALTER TABLE bpmn_element
ADD CONSTRAINT CHK_element_type CHECK (element_type IN (
  'START_EVENT', 'END_EVENT', 'INTERMEDIATE_EVENT',
  'USER_TASK', 'SERVICE_TASK', 'MANUAL_TASK', 'SCRIPT_TASK',
  'EXCLUSIVE_GATEWAY', 'PARALLEL_GATEWAY', 'INCLUSIVE_GATEWAY',
  'POOL', 'LANE', 'SEQUENCE_FLOW', 'MESSAGE_FLOW', 'SUBPROCESS',
  'CALL_ACTIVITY'
));
GO
