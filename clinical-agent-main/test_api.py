#!/usr/bin/env python3
"""
Local API Test Script for Clinical Decision Support Agent
Run this after starting the API with: uvicorn app.main:app --reload
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Check ===")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"Status: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        return r.status_code == 200
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_list_patients():
    """Test listing patients"""
    print("\n=== Testing List Patients ===")
    try:
        r = requests.get(f"{BASE_URL}/patients")
        print(f"Status: {r.status_code}")
        patients = r.json()
        print(f"Available patients: {len(patients)}")
        for p in patients[:3]:  # Show first 3
            print(f"  - {p['patient_id']}: {p['name']}")
        return r.status_code == 200
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_assessment(patient_id="PT-103"):
    """Test clinical assessment"""
    print(f"\n=== Testing Assessment for {patient_id} ===")
    try:
        r = requests.post(f"{BASE_URL}/assess/{patient_id}")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Prediction: {data.get('prediction')}")
            print(f"Risk Level: {data.get('risk_level')}")
            print(f"Confidence: {data.get('confidence')}")
            print(f"Reasoning: {data.get('reasoning')}")
            print(f"Citations: {len(data.get('citations', []))}")
            return True
        else:
            print(f"Error: {r.text}")
            return False
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_chat():
    """Test chat endpoint with conversation memory"""
    print("\n=== Testing Chat Endpoint ===")
    session_id = "test-session-local-001"

    # Test 1: Initial question
    print("\n1. Asking about lung cancer symptoms...")
    try:
        r = requests.post(
            f"{BASE_URL}/chat",
            json={
                "session_id": session_id,
                "message": "What symptoms trigger an urgent referral for lung cancer?",
                "top_k": 5,
            },
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Grounded: {data.get('grounded')}")
            print(f"Answer: {data.get('answer', '')[:300]}...")
            print(f"Citations: {len(data.get('citations', []))}")
        else:
            print(f"Error: {r.text}")
            return False
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

    # Test 2: Follow-up question (tests memory)
    print("\n2. Follow-up question (testing memory)...")
    try:
        r = requests.post(
            f"{BASE_URL}/chat",
            json={
                "session_id": session_id,
                "message": "What about if the patient is under 40?",
                "top_k": 5,
            },
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Answer: {data.get('answer', '')[:300]}...")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"❌ Failed: {e}")

    # Test 3: Question about hoarseness
    print("\n3. Asking about hoarseness...")
    try:
        r = requests.post(
            f"{BASE_URL}/chat",
            json={
                "session_id": session_id,
                "message": "Does persistent hoarseness require urgent referral, and at what age?",
                "top_k": 5,
            },
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Answer: {data.get('answer', '')[:300]}...")
    except Exception as e:
        print(f"❌ Failed: {e}")

    return True


def test_chat_history():
    """Test retrieving chat history"""
    print("\n=== Testing Chat History ===")
    session_id = "test-session-local-001"
    try:
        r = requests.get(f"{BASE_URL}/chat/{session_id}/history")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Session: {data.get('session_id')}")
            print(f"Messages: {len(data.get('messages', []))}")
            for i, msg in enumerate(data.get("messages", [])[:4]):
                print(f"  {i+1}. [{msg['role']}] {msg['content'][:80]}...")
            return True
        else:
            print(f"Error: {r.text}")
            return False
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_delete_session():
    """Test deleting chat session"""
    print("\n=== Testing Delete Session ===")
    session_id = "test-session-local-001"
    try:
        r = requests.delete(f"{BASE_URL}/chat/{session_id}")
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        return r.status_code == 200
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_grounding_check():
    """Test that model refuses to answer when evidence is missing"""
    print("\n=== Testing Grounding/Guardrails ===")
    session_id = "test-grounding-001"
    try:
        r = requests.post(
            f"{BASE_URL}/chat",
            json={
                "session_id": session_id,
                "message": "What is the treatment protocol for stage 4 pancreatic cancer?",  # Likely not in NG12
                "top_k": 3,
            },
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Grounded: {data.get('grounded')}")
            print(f"Answer: {data.get('answer', '')}")
            if "couldn't find support" in data.get(
                "answer", ""
            ).lower() or not data.get("grounded"):
                print("✅ Correctly refused to answer or indicated low confidence")
            else:
                print("⚠️  May have hallucinated - check answer carefully")
        return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def run_all_tests():
    """Run all tests in sequence"""
    print("=" * 60)
    print("CLINICAL DECISION SUPPORT API - LOCAL TEST SUITE")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print("Make sure API is running: uvicorn app.main:app --reload")

    results = []

    # Basic tests
    results.append(("Health Check", test_health()))
    results.append(("List Patients", test_list_patients()))

    # Assessment test
    results.append(("Assessment PT-103", test_assessment("PT-103")))
    results.append(("Assessment PT-107", test_assessment("PT-107")))  # Hoarseness

    # Chat tests
    results.append(("Chat Endpoint", test_chat()))
    results.append(("Chat History", test_chat_history()))
    results.append(("Grounding Check", test_grounding_check()))
    results.append(("Delete Session", test_delete_session()))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for _, r in results if r)
    total = len(results)
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    print(f"\nTotal: {passed}/{total} tests passed")

    return passed == total


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        # Quick test only
        test_health()
        test_assessment("PT-103")
        test_chat()
    else:
        success = run_all_tests()
        sys.exit(0 if success else 1)
