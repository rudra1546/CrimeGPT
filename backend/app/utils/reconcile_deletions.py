import os
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import text
from app.database import SessionLocal
from app.services import supabase_storage
from app.utils.audit_helper import log_audit

logger = logging.getLogger("crimegpt.reconcile")

async def run_reconciliation(limit: int = 50) -> dict:
    """
    Scans for attachments stuck in 'pending_deletion' state older than 5 minutes.
    Uses 'FOR UPDATE SKIP LOCKED' to prevent concurrent worker collisions.
    Reconciles absent files and re-attempts deletion on active files.
    """
    db = SessionLocal()
    reconciled = []
    failed = []

    try:
        # 1. Fetch pending deletions with row lock
        query = text("""
            SELECT id, case_id, evidence_id, storage_path, file_name, deletion_retry_count
            FROM evidence_attachments
            WHERE status = 'pending_deletion'
              AND deletion_requested_at < (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
            ORDER BY deletion_requested_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED;
        """)
        
        rows = db.execute(query, {"limit": limit}).fetchall()
        if not rows:
            return {"status": "success", "processed": 0, "reconciled": 0, "failed": 0}

        for row in rows:
            att_id = row[0]
            case_id = row[1]
            ev_id = row[2]
            storage_path = row[3]
            file_name = row[4]
            retry_count = row[5]

            logger.info(f"Reconciling pending deletion for Attachment #{att_id} (Path: {storage_path})")

            # 2. Attempt Supabase Storage deletion
            try:
                success = await supabase_storage.delete_files([storage_path])
                if success:
                    # Update status to deleted
                    db.execute(text("""
                        UPDATE evidence_attachments
                        SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP, deletion_error = NULL
                        WHERE id = :id;
                    """), {"id": att_id})
                    db.commit()

                    log_audit(
                        db,
                        user_id=None,
                        user_name="SYSTEM_RECOVERY",
                        action="RECONCILE_EVIDENCE_ATTACHMENT",
                        details=f"Attachment #{att_id} ({file_name}) successfully purged and marked deleted."
                    )
                    reconciled.append(att_id)
                else:
                    db.execute(text("""
                        UPDATE evidence_attachments
                        SET deletion_retry_count = deletion_retry_count + 1,
                            deletion_error = 'Supabase deletion returned non-200'
                        WHERE id = :id;
                    """), {"id": att_id})
                    db.commit()
                    failed.append(att_id)
            except Exception as e:
                db.execute(text("""
                    UPDATE evidence_attachments
                    SET deletion_retry_count = deletion_retry_count + 1,
                        deletion_error = :err
                    WHERE id = :id;
                """), {"id": att_id, "err": str(e)[:255]})
                db.commit()
                failed.append(att_id)
                logger.error(f"Failed reconciling Attachment #{att_id}: {e}")

        return {
            "status": "completed",
            "processed": len(rows),
            "reconciled_count": len(reconciled),
            "failed_count": len(failed),
            "reconciled_ids": reconciled,
            "failed_ids": failed
        }
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Starting Evidence Attachment Deletion Reconciliation...")
    result = asyncio.run(run_reconciliation())
    print("Reconciliation complete:", result)
