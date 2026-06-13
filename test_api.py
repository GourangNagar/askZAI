from fastapi.testclient import TestClient
from main import app, get_db, Transaction
import json

client = TestClient(app)

def test_auto_detect_logic():
    print("Running Smoke Tests for Direct Endpoint...")
    
    # 1. Login to get token (using a mock user or directly mocking verify_token)
    # Actually, we can just hit the login endpoint if the DB has a user, but we don't know the password.
    # We can create a dummy user or just override the dependency.
    
    from main import verify_token
    
    # Override verify_token for testing
    app.dependency_overrides[verify_token] = lambda: "test-user-id"
    
    # Test 1: Category = "Salary" -> Should be Income
    response = client.post(
        "/api/finances/direct",
        json={"amount": 50000, "category": "Salary", "description": "Paycheck", "type": "expense"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    # Fetch from DB to verify type
    from database import SessionLocal
    db = SessionLocal()
    tx_id = response.json()["tx_id"]
    t1 = db.query(Transaction).filter(Transaction.id == tx_id).first()
    assert t1.tx_type == "income", f"Test 1 Failed: Expected income, got {t1.tx_type}"
    print("✅ Test 1 Passed: 'Salary' category auto-detected as Income")
    
    # Test 2: Category = "Food" -> Should be Expense
    response = client.post(
        "/api/finances/direct",
        json={"amount": 500, "category": "Food", "description": "Burger", "type": "expense"}
    )
    t2 = db.query(Transaction).filter(Transaction.id == response.json()["tx_id"]).first()
    assert t2.tx_type == "expense", f"Test 2 Failed: Expected expense, got {t2.tx_type}"
    print("✅ Test 2 Passed: 'Food' category left as Expense")
    
    # Test 3: Category = "Money Received" -> Should be Income
    response = client.post(
        "/api/finances/direct",
        json={"amount": 1000, "category": "Money Received", "description": "Gift", "type": "expense"}
    )
    t3 = db.query(Transaction).filter(Transaction.id == response.json()["tx_id"]).first()
    assert t3.tx_type == "income", f"Test 3 Failed: Expected income, got {t3.tx_type}"
    print("✅ Test 3 Passed: 'Money Received' category auto-detected as Income")
    
    # Cleanup DB
    db.delete(t1)
    db.delete(t2)
    db.delete(t3)
    db.commit()
    db.close()
    print("🎉 All Tests Passed! Auto-detection logic is flawlessly solid.")

if __name__ == "__main__":
    test_auto_detect_logic()
