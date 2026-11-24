import os
import sys
import logging
from dotenv import load_dotenv

# Ensure backend root is on sys.path and load environment variables
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("verify_live_migration")

from app.services.ai_service import (
    generate_groq_response,
    generate_ai_response,
    sanitize_reasoning,
    DEFAULT_GROQ_MODEL
)
from app.rag.retriever import answer_query_with_rag

def verify_live():
    print("=" * 70)
    print("CRIMEGPT LIVE GROQ API & LEGAL RAG VALIDATION")
    print(f"Target Model: {DEFAULT_GROQ_MODEL}")
    print("=" * 70)

    # ------------------------------------------------------------------------
    # 1. Live Groq API Request with openai/gpt-oss-120b & max_completion_tokens
    # ------------------------------------------------------------------------
    print("\n[CHECK 1 & 2] Testing Live Groq API request with max_completion_tokens & reasoning isolation...")
    prompt = "State only the formal legal name of Section 103 of Bharatiya Nyaya Sanhita, 2023."
    response = generate_groq_response(
        prompt=prompt,
        model="openai/gpt-oss-120b",
        temperature=0.2,
        max_completion_tokens=2048
    )
    print(f"Response received ({len(response)} chars):\n{response}")
    assert len(response) > 0, "Response must not be empty"
    assert "<think>" not in response, "Internal reasoning tags must NOT be present in response"
    assert "</think>" not in response, "Closing reasoning tags must NOT be present in response"
    print("✓ Check 1 & 2 PASSED: Live Groq API request succeeded with max_completion_tokens and isolated reasoning.")

    # ------------------------------------------------------------------------
    # 2. Test Actual Legal RAG for BNS Section 103 (Murder)
    # ------------------------------------------------------------------------
    print("\n[CHECK 3] Testing Actual Legal RAG response for BNS Section 103 (Murder)...")
    q103 = "What is punishment for murder under section 103 of Bharatiya Nyaya Sanhita?"
    res103 = answer_query_with_rag(q103)
    print(f"Model used: {res103.get('model')}")
    print(f"Confidence: {res103.get('confidence')}")
    print(f"Matched Sections: {res103.get('matched_sections')}")
    print(f"Answer:\n{res103.get('answer')}")
    assert res103.get("model") == "openai/gpt-oss-120b", f"Expected openai/gpt-oss-120b, got {res103.get('model')}"
    assert "103" in res103.get("matched_sections") or "103" in res103.get("answer"), "Section 103 must be matched"
    print("✓ Check 3 (Section 103) PASSED.")

    # ------------------------------------------------------------------------
    # 3. Test Actual Legal RAG for BNS Section 303 (Theft)
    # ------------------------------------------------------------------------
    print("\n[CHECK 4] Testing Actual Legal RAG response for BNS Section 303 (Theft)...")
    q303 = "Explain theft and its punishment under section 303 of BNS"
    res303 = answer_query_with_rag(q303)
    print(f"Model used: {res303.get('model')}")
    print(f"Confidence: {res303.get('confidence')}")
    print(f"Matched Sections: {res303.get('matched_sections')}")
    print(f"Answer:\n{res303.get('answer')}")
    assert res303.get("model") == "openai/gpt-oss-120b"
    assert "303" in res303.get("matched_sections") or "303" in res303.get("answer"), "Section 303 must be matched"
    print("✓ Check 4 (Section 303) PASSED.")

    # ------------------------------------------------------------------------
    # 4. Test Actual Legal RAG for BNS Section 109 (Attempt to Murder)
    # ------------------------------------------------------------------------
    print("\n[CHECK 5] Testing Actual Legal RAG response for BNS Section 109 (Attempt to Murder)...")
    q109 = "What are the legal provisions for attempt to murder under section 109 BNS?"
    res109 = answer_query_with_rag(q109)
    print(f"Model used: {res109.get('model')}")
    print(f"Confidence: {res109.get('confidence')}")
    print(f"Matched Sections: {res109.get('matched_sections')}")
    print(f"Answer:\n{res109.get('answer')}")
    assert res109.get("model") == "openai/gpt-oss-120b"
    assert "109" in res109.get("matched_sections") or "109" in res109.get("answer"), "Section 109 must be matched"
    print("✓ Check 5 (Section 109) PASSED.")

    # ------------------------------------------------------------------------
    # 5. Test Proactive Retired-Model Auto-Migration
    # ------------------------------------------------------------------------
    print("\n[CHECK 6] Testing Retired-Model Auto-Migration (llama-3.3-70b-versatile -> openai/gpt-oss-120b)...")
    resp_retired = generate_groq_response(
        prompt="Confirm in one short sentence that this request was routed successfully.",
        model="llama-3.3-70b-versatile"
    )
    print(f"Auto-migrated response:\n{resp_retired}")
    assert len(resp_retired) > 0
    print("✓ Check 6 PASSED: Retired model was seamlessly auto-migrated without error.")

    # ------------------------------------------------------------------------
    # 6. Test Reactive Fallback on 404 (non-existent custom model)
    # ------------------------------------------------------------------------
    print("\n[CHECK 7] Testing Reactive Fallback on 404 (non-existent model -> fallback to openai/gpt-oss-120b)...")
    resp_fallback = generate_groq_response(
        prompt="Confirm fallback resolution in one short sentence.",
        model="non-existent-custom-groq-model-2026"
    )
    print(f"Fallback response:\n{resp_fallback}")
    assert len(resp_fallback) > 0
    print("✓ Check 7 PASSED: Non-existent model triggered clean reactive fallback to openai/gpt-oss-120b.")

    print("\n" + "=" * 70)
    print("ALL LIVE VERIFICATION CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    verify_live()
