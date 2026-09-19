-- MANUAL ROLLBACK SCRIPT: 001_evidence_attachments_rollback.sql
-- CAUTION: Destructive operation. Requires explicit administrative confirmation.
-- This script is NEVER executed automatically by the migration runner.

BEGIN;

-- 1. Acquire transaction advisory lock
SELECT pg_advisory_xact_lock(742910384);

-- 2. Check table existence and create automatic archival snapshot so metadata is NEVER silently lost
DO $$
DECLARE
    v_total_count INTEGER;
    v_active_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidence_attachments') THEN
        SELECT COUNT(*) INTO v_total_count FROM evidence_attachments;
        SELECT COUNT(*) INTO v_active_count FROM evidence_attachments WHERE status != 'deleted';

        IF v_total_count > 0 THEN
            -- Create archival snapshot with timestamp
            EXECUTE format('CREATE TABLE IF NOT EXISTS evidence_attachments_archive_%s AS SELECT * FROM evidence_attachments;', to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS'));
            RAISE NOTICE 'Created archival backup of evidence_attachments before rollback.';
        END IF;

        IF v_active_count > 0 THEN
            RAISE EXCEPTION 'Rollback aborted: % active attachment record(s) exist in evidence_attachments. To prevent data loss, purge or soft-delete all active attachments before running rollback.', v_active_count;
        END IF;
    END IF;
END $$;

-- 3. Drop table safely after archival
DROP TABLE IF EXISTS evidence_attachments;

-- 4. Deregister from schema_migrations
DELETE FROM schema_migrations WHERE version = '001_evidence_attachments';

-- 5. Note: public.audit_logs is intentionally preserved intact to preserve immutable audit trail
COMMIT;

