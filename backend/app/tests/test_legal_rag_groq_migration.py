import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.services.ai_service import (
    DEFAULT_GROQ_MODEL,
    RETIRED_MODELS,
    _get_groq_client,
    handle_groq_exception,
    generate_groq_response,
    generate_ai_response,
    sanitize_reasoning,
)
from app.rag.retriever import answer_query_with_rag, extract_section_and_act_from_query
from app.models.user import User
from app.routes.deps import get_current_user_flexible
from main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_officer_user():
    return User(
        id=1,
        name="Inspector Sharma",
        email="sharma@police.gov.in",
        role="POLICE_OFFICER",
        police_station="Cyber Police Station",
        status="ACTIVE"
    )

@pytest.fixture
def client(mock_officer_user):
    app.dependency_overrides[get_current_user_flexible] = lambda: mock_officer_user
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def make_mock_groq_client(content: str):
    """Helper to create a mock Groq client returning specific completion text."""
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


# ---------------------------------------------------------------------------
# 1. AI Provider Service Layer - Configuration & Model Migration Tests
# ---------------------------------------------------------------------------

def test_default_model_is_gpt_oss_120b():
    """Verify default Groq model is migrated to openai/gpt-oss-120b."""
    assert DEFAULT_GROQ_MODEL == "openai/gpt-oss-120b"
    assert "llama-3.3-70b-versatile" in RETIRED_MODELS

def test_unconfigured_groq_client_raises_503():
    """Verify that unconfigured GROQ_API_KEY raises HTTP 503 instead of unexplained 500."""
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
        client, err = _get_groq_client()
        assert client is None
        assert "not configured" in err

        with pytest.raises(HTTPException) as exc_info:
            generate_groq_response("test prompt")
        assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "AI Provider service unavailable" in exc_info.value.detail

def test_generate_groq_response_uses_default_model():
    """Verify generate_groq_response sends request with openai/gpt-oss-120b and temp 0.2."""
    mock_client = make_mock_groq_client("Legal analysis response text.")
    with patch("app.services.ai_service._get_groq_client", return_value=(mock_client, None)), \
         patch.dict(os.environ, {}, clear=False):
        # Remove GROQ_MODEL if present to test pure default
        os.environ.pop("GROQ_MODEL", None)
        result = generate_groq_response("Explain Section 103 BNS", system_prompt="You are a legal assistant.")

        assert result == "Legal analysis response text."
        mock_client.chat.completions.create.assert_called_once()
        kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert kwargs["model"] == "openai/gpt-oss-120b"
        assert kwargs["temperature"] == 0.2
        assert len(kwargs["messages"]) == 2
        assert kwargs["messages"][0]["role"] == "system"
        assert kwargs["messages"][1]["role"] == "user"

def test_retired_model_auto_migrates_to_gpt_oss_120b():
    """Verify that if GROQ_MODEL is set to retired llama-3.3-70b-versatile, it is auto-migrated."""
    mock_client = make_mock_groq_client("Migrated response.")
    with patch("app.services.ai_service._get_groq_client", return_value=(mock_client, None)), \
         patch.dict(os.environ, {"GROQ_MODEL": "llama-3.3-70b-versatile"}):
        
        result = generate_groq_response("Test prompt")
        assert result == "Migrated response."
        kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert kwargs["model"] == "openai/gpt-oss-120b"

def test_generation_parameters_temperature_and_max_tokens():
    """Verify compatibility with temperature, max_completion_tokens, and top_p parameters."""
    mock_client = make_mock_groq_client("Response with custom params.")
    with patch("app.services.ai_service._get_groq_client", return_value=(mock_client, None)), \
         patch.dict(os.environ, {"GROQ_MAX_TOKENS": "2048", "GROQ_TEMPERATURE": "0.1", "GROQ_TOP_P": "0.95"}):
        
        result = generate_groq_response("Prompt")
        assert result == "Response with custom params."
        kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert kwargs["temperature"] == 0.1
        assert kwargs["max_completion_tokens"] == 2048
        assert kwargs["top_p"] == 0.95
        assert kwargs["reasoning_format"] == "parsed"

def test_reasoning_output_handling_and_sanitization():
    """Verify internal reasoning (<think> tags and message.reasoning) is excluded from final response."""
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Official legal answer."
    mock_choice.message.reasoning = "Internal chain of thought: Analyzing statutory penal sections..."
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    with patch("app.services.ai_service._get_groq_client", return_value=(mock_client, None)):
        res = generate_groq_response("Legal query")
        assert res == "Official legal answer."
        assert "chain of thought" not in res

    # Verify regex defense-in-depth sanitization
    raw_with_tags = "<think>Step 1: Check section 103</think>Act: Bharatiya Nyaya Sanhita\nSection: 103"
    cleaned = sanitize_reasoning(raw_with_tags)
    assert cleaned == "Act: Bharatiya Nyaya Sanhita\nSection: 103"
    assert "<think>" not in cleaned


# ---------------------------------------------------------------------------
# 2. Provider Error Handling Tests (Preventing Unexplained 500s)
# ---------------------------------------------------------------------------

def test_handle_groq_exception_404_model_not_found():
    """Verify 404 / model_not_found surfaces as HTTP 404 with descriptive details."""
    err = Exception("Error code: 404 - {'error': {'message': 'The model `llama-3.3-70b-versatile` does not exist', 'code': 'model_not_found'}}")
    setattr(err, "status_code", 404)

    with pytest.raises(HTTPException) as exc:
        handle_groq_exception(err, model_name="llama-3.3-70b-versatile")
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert "was not found or has been retired" in exc.value.detail
    assert "openai/gpt-oss-120b" in exc.value.detail

def test_handle_groq_exception_429_rate_limit():
    """Verify 429 rate limit surfaces as HTTP 429."""
    err = Exception("Error code: 429 - {'error': {'message': 'Rate limit reached', 'code': 'rate_limit_exceeded'}}")
    setattr(err, "status_code", 429)

    with pytest.raises(HTTPException) as exc:
        handle_groq_exception(err, model_name="openai/gpt-oss-120b")
    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "quota exceeded or rate limit reached" in exc.value.detail

def test_handle_groq_exception_401_authentication():
    """Verify 401 invalid API key surfaces as HTTP 502 with auth detail."""
    err = Exception("Error code: 401 - {'error': {'message': 'Invalid API Key', 'code': 'invalid_api_key'}}")
    setattr(err, "status_code", 401)

    with pytest.raises(HTTPException) as exc:
        handle_groq_exception(err, model_name="openai/gpt-oss-120b")
    assert exc.value.status_code == status.HTTP_502_BAD_GATEWAY
    assert "authentication failed" in exc.value.detail

def test_handle_groq_exception_504_timeout():
    """Verify timeout surfaces as HTTP 504."""
    err = Exception("Request timed out after 30 seconds.")
    with pytest.raises(HTTPException) as exc:
        handle_groq_exception(err, model_name="openai/gpt-oss-120b", timeout=30.0)
    assert exc.value.status_code == status.HTTP_504_GATEWAY_TIMEOUT
    assert "timed out after 30" in exc.value.detail

def test_handle_groq_exception_503_connection_error():
    """Verify connection failure surfaces as HTTP 503."""
    err = Exception("API connection error: failed to establish connection.")
    with pytest.raises(HTTPException) as exc:
        handle_groq_exception(err, model_name="openai/gpt-oss-120b")
    assert exc.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "temporarily unavailable or unreachable" in exc.value.detail

def test_reactive_fallback_when_custom_model_returns_404():
    """Verify that if a custom model returns 404, fallback to openai/gpt-oss-120b is executed."""
    mock_client = MagicMock()
    err_404 = Exception("The model custom-experimental-model does not exist (model_not_found)")
    setattr(err_404, "status_code", 404)

    mock_fallback_choice = MagicMock()
    mock_fallback_choice.message.content = "Fallback response from openai/gpt-oss-120b."
    mock_fallback_response = MagicMock()
    mock_fallback_response.choices = [mock_fallback_choice]

    # First call fails with 404, second call (fallback) succeeds
    mock_client.chat.completions.create.side_effect = [err_404, mock_fallback_response]

    with patch("app.services.ai_service._get_groq_client", return_value=(mock_client, None)):
        result = generate_groq_response("Test prompt", model="custom-experimental-model")
        assert result == "Fallback response from openai/gpt-oss-120b."
        assert mock_client.chat.completions.create.call_count == 2
        second_call_kwargs = mock_client.chat.completions.create.call_args_list[1].kwargs
        assert second_call_kwargs["model"] == "openai/gpt-oss-120b"


# ---------------------------------------------------------------------------
# 3. RAG Pipeline Preservation & Representative Legal Query Tests
# ---------------------------------------------------------------------------

def test_section_and_act_extraction_preserved():
    """Verify regex extraction of section and act names is fully preserved."""
    sec, act = extract_section_and_act_from_query("what is punishment under section 103 of BNS?")
    assert sec == "103"
    assert act == "Bharatiya Nyaya Sanhita"

    sec, act = extract_section_and_act_from_query("tell me about 303 bns")
    assert sec == "303"
    assert act == "Bharatiya Nyaya Sanhita"

    sec, act = extract_section_and_act_from_query("sec 109 bnss")
    assert sec == "109"
    assert act == "Bharatiya Nagarik Suraksha Sanhita"

def test_rag_query_with_sufficient_legal_context():
    """Verify answer_query_with_rag returns formatted answer, sources, high confidence, and openai/gpt-oss-120b model."""
    mock_context = "--- Document Record: Document: BNS_2023.pdf | Act: Bharatiya Nyaya Sanhita | Section: 103 | Offence: Murder ---\nWhoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine."
    mock_sources = [{
        "document": "BNS_2023.pdf",
        "section": "103",
        "act_name": "Bharatiya Nyaya Sanhita",
        "year": "2023",
        "offence": "Punishment for Murder",
        "file_type": "pdf",
        "score": 1.0
    }]
    ai_response = (
        "Act:\nBharatiya Nyaya Sanhita\n\n"
        "Section:\n103\n\n"
        "Offence:\nPunishment for Murder\n\n"
        "Punishment:\nDeath or imprisonment for life and fine\n\n"
        "Explanation:\nPrescribes punishment for the offence of murder.\n\n"
        "Source:\nBNS_2023.pdf"
    )

    with patch("app.rag.retriever.retrieve_context_with_metadata", return_value=(mock_context, mock_sources)), \
         patch("app.rag.retriever.generate_ai_response", return_value=ai_response):
        
        result = answer_query_with_rag("What is punishment for murder under section 103 BNS?")
        assert isinstance(result, dict)
        assert "Death or imprisonment for life" in result["answer"]
        assert result["model"] == "openai/gpt-oss-120b"
        assert result["confidence"] == "high"
        assert "103" in result["matched_sections"]
        assert len(result["sources"]) == 1
        assert result["sources"][0]["document"] == "BNS_2023.pdf"

def test_rag_query_with_insufficient_context_preserved():
    """Verify that insufficient context query returns standard grounding fallback message."""
    with patch("app.rag.retriever.retrieve_context_with_metadata", return_value=("", [])):
        result = answer_query_with_rag("What is the penalty for interstellar spacecraft speeding?")
        assert "do not contain sufficient information" in result["answer"]
        assert result["confidence"] == "low"
        assert result["matched_sections"] == []
        assert result["sources"] == []
        assert result["model"] == "openai/gpt-oss-120b"


# ---------------------------------------------------------------------------
# 4. Legal Query REST Endpoint (/api/legal/query) Tests
# ---------------------------------------------------------------------------

def test_endpoint_query_representative_murder_103(client):
    """Test Representative Legal Question 1: Section 103 BNS (Murder)."""
    mock_rag_result = {
        "answer": "Act:\nBharatiya Nyaya Sanhita\n\nSection:\n103\n\nOffence:\nPunishment for Murder\n\nPunishment:\nDeath or imprisonment for life, and fine.",
        "response": "Act:\nBharatiya Nyaya Sanhita\n\nSection:\n103\n\nOffence:\nPunishment for Murder\n\nPunishment:\nDeath or imprisonment for life, and fine.",
        "sources": [{"document": "BNS_2023.pdf", "section": "103"}],
        "matched_sections": ["103"],
        "confidence": "high",
        "model": "openai/gpt-oss-120b"
    }

    with patch("app.routes.legal.answer_query_with_rag", return_value=mock_rag_result):
        resp = client.post("/api/legal/query", json={"query": "What is punishment for murder under section 103 BNS?"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["model"] == "openai/gpt-oss-120b"
        assert data["confidence"] == "high"
        assert data["matched_sections"] == ["103"]
        assert "Punishment for Murder" in data["answer"]

def test_endpoint_query_representative_theft_303(client):
    """Test Representative Legal Question 2: Section 303 BNS (Theft)."""
    mock_rag_result = {
        "answer": "Act:\nBharatiya Nyaya Sanhita\n\nSection:\n303\n\nOffence:\nTheft\n\nPunishment:\nImprisonment up to three years, or with fine, or both.",
        "response": "Act:\nBharatiya Nyaya Sanhita\n\nSection:\n303\n\nOffence:\nTheft\n\nPunishment:\nImprisonment up to three years, or with fine, or both.",
        "sources": [{"document": "BNS_2023.pdf", "section": "303"}],
        "matched_sections": ["303"],
        "confidence": "high",
        "model": "openai/gpt-oss-120b"
    }

    with patch("app.routes.legal.answer_query_with_rag", return_value=mock_rag_result):
        resp = client.post("/api/legal/query", json={"query": "Explain theft under section 303 of Bharatiya Nyaya Sanhita"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["model"] == "openai/gpt-oss-120b"
        assert "Theft" in data["answer"]
        assert data["matched_sections"] == ["303"]

def test_endpoint_query_representative_attempt_murder_109(client):
    """Test Representative Legal Question 3: Section 109 BNS (Attempt to Murder)."""
    mock_rag_result = {
        "answer": "Act:\nBharatiya Nyaya Sanhita\n\nSection:\n109\n\nOffence:\nAttempt to Murder\n\nPunishment:\nImprisonment up to ten years and fine; if hurt caused, up to imprisonment for life.",
        "response": "Act:\nBharatiya Nyaya Sanhita\n\nSection:\n109\n\nOffence:\nAttempt to Murder\n\nPunishment:\nImprisonment up to ten years and fine; if hurt caused, up to imprisonment for life.",
        "sources": [{"document": "BNS_2023.pdf", "section": "109"}],
        "matched_sections": ["109"],
        "confidence": "high",
        "model": "openai/gpt-oss-120b"
    }

    with patch("app.routes.legal.answer_query_with_rag", return_value=mock_rag_result):
        resp = client.post("/api/legal/query", json={"query": "What are the legal provisions for attempt to murder under BNS 109?"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["model"] == "openai/gpt-oss-120b"
        assert "Attempt to Murder" in data["answer"]

def test_endpoint_provider_404_error_does_not_surface_as_500(client):
    """Verify that a provider 404 (model retired/not found) surfaces cleanly as HTTP 404, NOT HTTP 500."""
    err_404 = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Configured Groq AI model 'llama-3.3-70b-versatile' was not found or has been retired. Officially recommended model is 'openai/gpt-oss-120b'."
    )
    with patch("app.routes.legal.answer_query_with_rag", side_effect=err_404):
        resp = client.post("/api/legal/query", json={"query": "What is section 103 BNS?"})
        assert resp.status_code == 404
        assert "has been retired" in resp.json()["detail"]
        assert "openai/gpt-oss-120b" in resp.json()["detail"]

def test_endpoint_provider_429_error_does_not_surface_as_500(client):
    """Verify that a provider 429 rate limit surfaces cleanly as HTTP 429, NOT HTTP 500."""
    err_429 = HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Groq AI quota exceeded or rate limit reached. Please try again later."
    )
    with patch("app.routes.legal.answer_query_with_rag", side_effect=err_429):
        resp = client.post("/api/legal/query", json={"query": "What is section 103 BNS?"})
        assert resp.status_code == 429
        assert "quota exceeded" in resp.json()["detail"]

def test_endpoint_provider_503_error_does_not_surface_as_500(client):
    """Verify that unconfigured key or service failure surfaces cleanly as HTTP 503, NOT HTTP 500."""
    err_503 = HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="AI Provider service unavailable: GROQ_API_KEY is not configured or in mock mode"
    )
    with patch("app.routes.legal.answer_query_with_rag", side_effect=err_503):
        resp = client.post("/api/legal/query", json={"query": "What is section 103 BNS?"})
        assert resp.status_code == 503
        assert "AI Provider service unavailable" in resp.json()["detail"]
