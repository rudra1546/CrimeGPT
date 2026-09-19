import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath("."))
load_dotenv(".env")

import pytest
from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.evidence_attachment import EvidenceAttachment
from app.utils.jwt_utils import create_access_token, create_media_ticket

client = TestClient(app)

@pytest.fixture(scope="module")
def test_context():
    db = SessionLocal()
    user = db.query(User).filter(User.role.in_(["ADMIN", "POLICE_OFFICER", "SHO"])).first()
    assert user is not None, "A valid officer/admin user must exist in DB."

    # Look for active attachment with existing file in Supabase (attachment 26)
    att = db.query(EvidenceAttachment).filter(
        EvidenceAttachment.id == 26,
        EvidenceAttachment.status == "active"
    ).first()
    if not att:
        att = db.query(EvidenceAttachment).filter(EvidenceAttachment.status == "active").first()
    assert att is not None, "An active attachment must exist in DB for media testing."

    evidence = db.query(Evidence).filter(Evidence.id == att.evidence_id).first()
    case = db.query(Case).filter(Case.id == att.case_id).first()
    assert evidence and case, "Attachment must link to a valid Case and Evidence item."

    # Find another case ID for cross-case testing
    other_case = db.query(Case).filter(Case.id != att.case_id).first()
    other_case_id = other_case.id if other_case else 999999

    # Record with missing storage file for 404 testing
    missing_att = db.query(EvidenceAttachment).filter(EvidenceAttachment.id == 6).first()

    token = create_access_token({"sub": user.email})
    db.close()

    return {
        "user_email": user.email,
        "token": token,
        "case_id": att.case_id,
        "evidence_id": att.evidence_id,
        "attachment_id": att.id,
        "file_name": att.file_name,
        "other_case_id": other_case_id,
        "missing_att_case_id": missing_att.case_id if missing_att else None,
        "missing_att_evidence_id": missing_att.evidence_id if missing_att else None,
        "missing_att_id": missing_att.id if missing_att else None
    }


def test_unauthenticated_stream_rejected(test_context):
    """Unauthenticated requests without Bearer token or ticket must be rejected with 401."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]

    res = client.get(f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/stream")
    assert res.status_code == 401
    assert "Authentication token required" in res.json().get("detail", "")


def test_unauthenticated_download_rejected(test_context):
    """Unauthenticated download requests must be rejected with 401."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]

    res = client.get(f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/download")
    assert res.status_code == 401
    assert "Authentication token required" in res.json().get("detail", "")


def test_authenticated_bearer_stream_succeeds(test_context):
    """Authenticated request with JWT Bearer header streams the media bytes."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]
    token = test_context["token"]

    res = client.get(
        f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/stream",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert len(res.content) > 0
    content_type = res.headers.get("content-type", "")
    assert "image/" in content_type or "audio/" in content_type or "video/" in content_type or "application/" in content_type


def test_authenticated_bearer_download_succeeds(test_context):
    """Authenticated download request returns 200 with Content-Disposition: attachment."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]
    token = test_context["token"]

    res = client.get(
        f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/download",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert "attachment" in res.headers.get("content-disposition", "")
    assert len(res.content) > 0


def test_scoped_media_ticket_stream(test_context):
    """A valid, short-lived scoped media ticket allows streaming via ?token= query param."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]
    ticket = create_media_ticket(test_context["user_email"], case_id=cid, attachment_id=aid, expires_seconds=120)

    res = client.get(f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/stream?token={ticket}")
    assert res.status_code == 200
    assert len(res.content) > 0


def test_scoped_media_ticket_download(test_context):
    """A valid, short-lived scoped media ticket allows downloading via ?token= query param."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]
    ticket = create_media_ticket(test_context["user_email"], case_id=cid, attachment_id=aid, expires_seconds=120)

    res = client.get(f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/download?token={ticket}")
    assert res.status_code == 200
    assert "attachment" in res.headers.get("content-disposition", "")
    assert len(res.content) > 0


def test_mismatched_ticket_rejected(test_context):
    """A ticket generated for a different attachment or case must be rejected with 403."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]

    # Ticket minted for attachment_id = 999999
    wrong_ticket = create_media_ticket(test_context["user_email"], case_id=cid, attachment_id=999999, expires_seconds=120)
    res = client.get(f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/stream?token={wrong_ticket}")
    assert res.status_code == 403
    assert "Media stream ticket is not valid" in res.json().get("detail", "")


def test_expired_ticket_rejected(test_context):
    """An expired ticket must be rejected with 401."""
    cid = test_context["case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]

    expired_ticket = create_media_ticket(test_context["user_email"], case_id=cid, attachment_id=aid, expires_seconds=-10)
    res = client.get(f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/stream?token={expired_ticket}")
    assert res.status_code == 401


def test_cross_case_isolation(test_context):
    """Accessing an attachment using another case ID must return 404 (not found / isolated)."""
    other_cid = test_context["other_case_id"]
    eid = test_context["evidence_id"]
    aid = test_context["attachment_id"]
    token = test_context["token"]

    res = client.get(
        f"/api/cases/{other_cid}/evidence/{eid}/attachments/{aid}/stream",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404


def test_nonexistent_evidence_isolation(test_context):
    """Accessing an attachment with a mismatched evidence ID must return 404."""
    cid = test_context["case_id"]
    aid = test_context["attachment_id"]
    token = test_context["token"]

    res = client.get(
        f"/api/cases/{cid}/evidence/999999/attachments/{aid}/stream",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404


def test_missing_storage_file_returns_404(test_context):
    """If an attachment record points to a missing file in storage, endpoint returns 404 cleanly."""
    cid = test_context.get("missing_att_case_id")
    eid = test_context.get("missing_att_evidence_id")
    aid = test_context.get("missing_att_id")
    if not aid:
        pytest.skip("No missing attachment record found to test")
    token = test_context["token"]

    res = client.get(
        f"/api/cases/{cid}/evidence/{eid}/attachments/{aid}/stream",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404
    assert "File not found" in res.json().get("detail", "")
