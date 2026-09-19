-- Migration: 001_evidence_attachments.sql
-- Description: Create evidence_attachments table with durable status and relax evidence nullability

BEGIN;

-- 1. Acquire transaction advisory lock to serialize concurrent migrations
SELECT pg_advisory_xact_lock(742910384);

-- 2. Ensure schema_migrations ledger exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 3. Idempotent execution block
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_cols_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001_evidence_attachments') THEN

        -- Verify schema compatibility: 'evidence' table and target columns must exist
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidence'
        ) INTO v_table_exists;

        IF NOT v_table_exists THEN
            RAISE EXCEPTION 'Schema incompatible: required table public.evidence is missing. Migration aborted.';
        END IF;

        SELECT COUNT(*) INTO v_cols_count
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'evidence'
          AND column_name IN ('file_name', 'file_type', 'file_path');

        IF v_cols_count < 3 THEN
            RAISE EXCEPTION 'Schema incompatible: expected columns (file_name, file_type, file_path) missing from evidence table. Migration aborted.';
        END IF;

        -- Relax nullability on existing evidence columns (safe in-place catalog metadata update)
        ALTER TABLE evidence ALTER COLUMN file_name DROP NOT NULL;
        ALTER TABLE evidence ALTER COLUMN file_type DROP NOT NULL;
        ALTER TABLE evidence ALTER COLUMN file_path DROP NOT NULL;

        -- Create evidence_attachments table
        CREATE TABLE IF NOT EXISTS evidence_attachments (
            id SERIAL PRIMARY KEY,
            evidence_id INTEGER NULL REFERENCES evidence(id) ON DELETE CASCADE,
            case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
            media_type VARCHAR(32) NOT NULL,              -- 'image', 'audio', 'video'
            file_name VARCHAR(255) NOT NULL,              -- original filename
            storage_path TEXT NOT NULL,                   -- Supabase object path (cases/{case_id}/evidence_{ev_id}/{uuid}_{name})
            file_type VARCHAR(128) NOT NULL,              -- MIME content type
            file_size BIGINT NULL,                        -- size in bytes
            description TEXT NULL,                        -- optional notes
            status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'pending_deletion', 'deleted'
            deletion_requested_at TIMESTAMP WITH TIME ZONE NULL,
            deleted_at TIMESTAMP WITH TIME ZONE NULL,
            deletion_retry_count INTEGER DEFAULT 0 NOT NULL,
            deletion_error TEXT NULL,
            uploaded_by INTEGER NULL REFERENCES users(id),
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_evidence_attachments_evidence_id ON evidence_attachments(evidence_id);
        CREATE INDEX IF NOT EXISTS idx_evidence_attachments_case_id ON evidence_attachments(case_id);
        CREATE INDEX IF NOT EXISTS idx_evidence_attachments_status ON evidence_attachments(status);

        INSERT INTO schema_migrations (version, description)
        VALUES ('001_evidence_attachments', 'Create evidence_attachments table with durable status and relax evidence nullability');

    END IF;
END $$;

COMMIT;
