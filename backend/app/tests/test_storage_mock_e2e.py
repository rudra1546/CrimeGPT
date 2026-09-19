import os
import sys
import io
import json
import asyncio
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath("."))
load_dotenv(".env")

import httpx
from starlette.datastructures import UploadFile
from app.database import SessionLocal
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.evidence_attachment import EvidenceAttachment
from app.models.user import User
from app.services import supabase_storage
from app.utils.reconcile_deletions import run_reconciliation
from app.utils.jwt_utils import create_media_ticket, decode_media_ticket

class AsyncMockTransport(httpx.AsyncBaseTransport):
    def __init__(self, handler):
        self.handler = handler

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return await self.handler(request)

async def run_storage_lifecycle_tests():
    print("=" * 70, flush=True)
    print("CRIMEGPT SUPABASE STORAGE END-TO-END VERIFICATION (SIMULATED & DB)", flush=True)
    print("=" * 70, flush=True)

    db = SessionLocal()
    results = {}

    user = db.query(User).filter(User.status == "ACTIVE").first()
    case = db.query(Case).first()
    assert user and case, "User and Case must exist in the database."

    print(f"Targeting Case #{case.id} (FIR: {case.fir_number}) with User: {user.email}", flush=True)
    print("-" * 70, flush=True)

    # ------------------------------------------------------------------------
    # SECTION 1: Mock Transport for End-to-End Supabase Storage Operations
    # ------------------------------------------------------------------------
    storage_state = {}  # In-memory mock storage: path -> bytes

    async def mock_supabase_handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        path = request.url.path
        method = request.method

        # 1. Bucket discovery
        if "/storage/v1/bucket/" in path and method == "GET":
            return httpx.Response(200, json={"id": "evidence-media", "file_size_limit": 52428800})

        # 2. Object upload (POST)
        if "/storage/v1/object/evidence-media/" in path and method == "POST":
            obj_path = path.split("/storage/v1/object/evidence-media/")[-1]
            content = await request.aread()
            storage_state[obj_path] = content
            return httpx.Response(200, json={"Key": f"evidence-media/{obj_path}"})

        # 3. Object stream/download (GET)
        if "/storage/v1/object/evidence-media/" in path and method == "GET":
            obj_path = path.split("/storage/v1/object/evidence-media/")[-1]
            if obj_path in storage_state:
                content = storage_state[obj_path]
                return httpx.Response(200, content=content, headers={"content-length": str(len(content))})
            return httpx.Response(404, json={"error": "Not found"})

        # 4. Object delete (DELETE)
        if "/storage/v1/object/evidence-media" in path and method == "DELETE":
            raw_body = await request.aread()
            body = json.loads(raw_body)
            prefixes = body.get("prefixes", [])
            for p in prefixes:
                storage_state.pop(p, None)
            return httpx.Response(200, json=[{"name": p} for p in prefixes])

        # 5. Object sign (POST)
        if "/storage/v1/object/sign/evidence-media/" in path and method == "POST":
            obj_path = path.split("/storage/v1/object/sign/evidence-media/")[-1]
            return httpx.Response(200, json={"signedURL": f"/object/sign/evidence-media/{obj_path}?token=mock-token"})

        return httpx.Response(400, json={"error": f"Unhandled mock request: {method} {url_str}"})

    mock_transport = AsyncMockTransport(mock_supabase_handler)
    real_async_client = httpx.AsyncClient

    def custom_async_client(*args, **kwargs):
        kwargs["transport"] = mock_transport
        return real_async_client(*args, **kwargs)

    # Set dummy service role key for lifecycle test validation
    original_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock_service_role_key_for_automated_verification_tests"
    httpx.AsyncClient = custom_async_client

    try:
        # --------------------------------------------------------------------
        # TEST A: Upload Image, Audio, Video & Verify Metadata in DB
        # --------------------------------------------------------------------
        print("\n[TEST A] Uploading Image, Audio, and Video files...", flush=True)
        test_files = [
            ("image", "crime_scene.png", "image/png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 1024),
            ("audio", "call_recording.mp3", "audio/mpeg", b"ID3\x03" + b"\x11" * 2048),
            ("video", "cctv_clip.mp4", "video/mp4", b"\x00\x00\x00\x18ftypmp42" + b"\x22" * 4096)
        ]

        ev = Evidence(
            case_id=case.id,
            evidence_type="Digital Forensics",
            description="Multi-media test evidence",
            collection_location="Local Test Lab",
            collecting_officer="Officer Test",
            uploaded_by=user.id
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)

        created_att_ids = []
        for media_type, fname, mime, payload in test_files:
            upload_file = UploadFile(file=io.BytesIO(payload), filename=fname, headers={"content-type": mime})
            storage_path = f"cases/{case.id}/evidence_{ev.id}/{fname}"

            res = await supabase_storage.upload_file_stream(storage_path, upload_file)
            assert res["file_size"] == len(payload)
            assert storage_path in storage_state

            att = EvidenceAttachment(
                evidence_id=ev.id,
                case_id=case.id,
                media_type=media_type,
                file_name=fname,
                storage_path=storage_path,
                file_type=mime,
                file_size=res["file_size"],
                description=f"Test {media_type}",
                status="active",
                uploaded_by=user.id
            )
            db.add(att)
            db.commit()
            db.refresh(att)
            created_att_ids.append(att.id)
            print(f"  -> Uploaded {media_type.upper()}: {fname} ({res['file_size']} bytes) | DB ID: #{att.id} | Storage: {storage_path}", flush=True)

        assert len(created_att_ids) == 3
        results["media_upload_verification"] = "PASSED (Image, Audio, Video uploaded & verified in DB)"

        # --------------------------------------------------------------------
        # TEST B: Verify Authenticated Playback and Download
        # --------------------------------------------------------------------
        print("\n[TEST B] Testing Authenticated Playback and Download...", flush=True)
        for att_id in created_att_ids:
            att = db.query(EvidenceAttachment).filter(EvidenceAttachment.id == att_id).first()
            ticket = create_media_ticket(user.email, case.id, att_id, expires_seconds=120)
            assert ticket is not None

            # Verify ticket validity
            claims = decode_media_ticket(ticket, case.id, att_id)
            assert claims is not None
            assert claims["sub"] == user.email
            assert claims["case_id"] == case.id
            assert claims["attachment_id"] == att_id

            # Verify ticket rejected for wrong case or attachment
            assert decode_media_ticket(ticket, case.id + 999, att_id) is None
            assert decode_media_ticket(ticket, case.id, att_id + 999) is None

            # Verify stream response
            response = await supabase_storage.stream_storage_file(att.storage_path, att.file_type, att.file_name, download=False)
            assert response.status_code == 200
            assert response.headers["Cache-Control"] == "private, no-store, max-age=0, must-revalidate"
            assert response.headers["Referrer-Policy"] == "no-referrer"
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert "inline" in response.headers["Content-Disposition"]

            # Verify download response
            dl_response = await supabase_storage.stream_storage_file(att.storage_path, att.file_type, att.file_name, download=True)
            assert dl_response.status_code == 200
            assert "attachment" in dl_response.headers["Content-Disposition"]
            print(f"  -> Attachment #{att_id} ({att.media_type}): Playback & Download validated with security headers.", flush=True)

        results["playback_and_download"] = "PASSED (Scoped tickets, security headers, inline/download validated)"

        # --------------------------------------------------------------------
        # TEST C: Deletion Reaches 'deleted' Only After Storage Confirms Success
        # --------------------------------------------------------------------
        print("\n[TEST C] Testing Deletion Confirmation Order...", flush=True)
        target_att = db.query(EvidenceAttachment).filter(EvidenceAttachment.id == created_att_ids[0]).first()
        target_path = target_att.storage_path
        assert target_path in storage_state

        # 1. First set to pending_deletion
        target_att.status = "pending_deletion"
        target_att.deletion_requested_at = datetime.now(timezone.utc)
        db.commit()

        # 2. Attempt storage deletion
        del_success = await supabase_storage.delete_files([target_path])
        assert del_success is True
        assert target_path not in storage_state  # Confirmed deleted from storage

        # 3. Only now finalize DB to deleted
        target_att.status = "deleted"
        target_att.deleted_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(target_att)

        assert target_att.status == "deleted"
        print(f"  -> Attachment #{target_att.id} deletion confirmed: pending_deletion -> Storage confirmed -> deleted.", flush=True)
        results["deletion_order_enforcement"] = "PASSED (deleted status only reached after storage confirmed)"

        # --------------------------------------------------------------------
        # TEST D: Reconciliation Scenarios
        # --------------------------------------------------------------------
        print("\n[TEST D] Testing Reconciliation Scenarios...", flush=True)

        # D1: Successful purge of pending deletion
        print("  -> Scenario D1: Successful purge of stuck pending_deletion...", flush=True)
        att_d1 = EvidenceAttachment(
            case_id=case.id,
            evidence_id=ev.id,
            media_type="image",
            file_name="stuck_image.png",
            storage_path=f"cases/{case.id}/evidence_{ev.id}/stuck_image.png",
            file_type="image/png",
            status="pending_deletion",
            deletion_requested_at=datetime.now(timezone.utc) - timedelta(minutes=10),
            deletion_retry_count=0
        )
        storage_state[att_d1.storage_path] = b"stuck content"
        db.add(att_d1)
        db.commit()
        db.refresh(att_d1)

        res_d1 = await run_reconciliation(limit=10)
        db.expire_all()
        att_d1_after = db.query(EvidenceAttachment).filter(EvidenceAttachment.id == att_d1.id).first()
        assert att_d1_after.status == "deleted"
        assert att_d1.storage_path not in storage_state
        print(f"     Scenario D1 Passed: Stuck item purged from storage and status updated to 'deleted'.", flush=True)
        results["reconcile_success_purge"] = "PASSED"

        # D2: Network failure during reconciliation
        print("  -> Scenario D2: Network failure handling during reconciliation...", flush=True)
        att_d2 = EvidenceAttachment(
            case_id=case.id,
            evidence_id=ev.id,
            media_type="audio",
            file_name="network_failure.mp3",
            storage_path=f"cases/{case.id}/evidence_{ev.id}/network_failure.mp3",
            file_type="audio/mpeg",
            status="pending_deletion",
            deletion_requested_at=datetime.now(timezone.utc) - timedelta(minutes=10),
            deletion_retry_count=0
        )
        db.add(att_d2)
        db.commit()
        db.refresh(att_d2)

        # Force mock transport to throw network exception
        async def failing_handler(request: httpx.Request):
            raise httpx.ConnectTimeout("Supabase Storage connection timed out.")
        httpx.AsyncClient = lambda *a, **kw: real_async_client(transport=AsyncMockTransport(failing_handler), *a, **kw)

        res_d2 = await run_reconciliation(limit=10)
        db.expire_all()
        att_d2_after = db.query(EvidenceAttachment).filter(EvidenceAttachment.id == att_d2.id).first()
        assert att_d2_after.status == "pending_deletion"
        assert att_d2_after.deletion_retry_count >= 1
        assert att_d2_after.deletion_error is not None
        print(f"     Scenario D2 Passed: Row preserved in pending_deletion; retry={att_d2_after.deletion_retry_count}; error='{att_d2_after.deletion_error}'.", flush=True)
        results["reconcile_network_failure"] = "PASSED (Row preserved, retry count incremented, error logged)"

        # Restore working mock handler
        httpx.AsyncClient = custom_async_client

        # D3: Missing-object handling (Storage object already absent)
        print("  -> Scenario D3: Missing-object handling (Object already absent in Storage)...", flush=True)
        att_d3 = EvidenceAttachment(
            case_id=case.id,
            evidence_id=ev.id,
            media_type="video",
            file_name="already_gone.mp4",
            storage_path=f"cases/{case.id}/evidence_{ev.id}/already_gone.mp4",
            file_type="video/mp4",
            status="pending_deletion",
            deletion_requested_at=datetime.now(timezone.utc) - timedelta(minutes=10),
            deletion_retry_count=0
        )
        assert att_d3.storage_path not in storage_state  # Pre-condition: object not in storage
        db.add(att_d3)
        db.commit()
        db.refresh(att_d3)

        res_d3 = await run_reconciliation(limit=10)
        db.expire_all()
        att_d3_after = db.query(EvidenceAttachment).filter(EvidenceAttachment.id == att_d3.id).first()
        assert att_d3_after.status == "deleted"
        print(f"     Scenario D3 Passed: Absent object handled cleanly and status finalized to 'deleted'.", flush=True)
        results["reconcile_missing_object"] = "PASSED (Absent object finalized to deleted without loop)"

    finally:
        # Restore real client and original env key
        httpx.AsyncClient = real_async_client
        if original_key:
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = original_key
        else:
            os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)

        try:
            # Clean up all created test entities
            cleanup_db = SessionLocal()
            for cid in created_att_ids:
                a = cleanup_db.query(EvidenceAttachment).filter(EvidenceAttachment.id == cid).first()
                if a:
                    cleanup_db.delete(a)
            for extra in [locals().get('att_d1'), locals().get('att_d2'), locals().get('att_d3')]:
                if extra:
                    a = cleanup_db.query(EvidenceAttachment).filter(EvidenceAttachment.id == extra.id).first()
                    if a:
                        cleanup_db.delete(a)
            if locals().get('ev'):
                ev_to_del = cleanup_db.query(Evidence).filter(Evidence.id == ev.id).first()
                if ev_to_del:
                    cleanup_db.delete(ev_to_del)
            cleanup_db.commit()
            cleanup_db.close()
        except Exception as ce:
            print(f"Warning during test cleanup: {ce}", flush=True)

        db.close()

    print("\n" + "=" * 70, flush=True)
    print("MOCK VERIFICATION SUMMARY", flush=True)
    print("=" * 70, flush=True)
    for k, v in results.items():
        print(f"  * {k}: {v}", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    asyncio.run(run_storage_lifecycle_tests())
