"""
Test Iteration 11: Inventory ↔ Issues Cross-Linking Features
Tests the auto-creation of issues when item condition changes and restoration when resolved.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "agent@machvisuals.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Create headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestItemConditionNeedsRepairAutoIssue:
    """Test that setting item condition to 'Needs Repair' auto-creates an issue"""
    
    def test_create_test_item(self, headers):
        """Create a test item for cross-link testing"""
        unique_id = str(uuid.uuid4())[:8]
        item_data = {
            "name": f"TEST_CrossLink_Item_{unique_id}",
            "category": "Camera & Optics",
            "total_quantity": 5,
            "location": "Mumbai"
        }
        response = requests.post(f"{API_URL}/items", json=item_data, headers=headers)
        assert response.status_code == 200, f"Failed to create item: {response.text}"
        
        item = response.json()
        assert item["condition"] == "OK", "New item should have condition 'OK'"
        assert item["status"] == "Available", "New item should have status 'Available'"
        
        # Store for other tests
        pytest.test_item_id = item["id"]
        pytest.test_item_name = item["name"]
        print(f"Created test item: {item['name']} (id: {item['id']})")
        return item
    
    def test_put_condition_needs_repair_creates_issue(self, headers):
        """PUT /api/items/{id} with condition='Needs Repair' should auto-create an issue"""
        item_id = pytest.test_item_id
        
        # Update condition to "Needs Repair"
        update_data = {"condition": "Needs Repair"}
        response = requests.put(f"{API_URL}/items/{item_id}", json=update_data, headers=headers)
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        updated_item = response.json()
        
        # Verify item status was changed to "Under Maintenance"
        assert updated_item["condition"] == "Needs Repair", "Condition should be 'Needs Repair'"
        assert updated_item["status"] == "Under Maintenance", "Status should be 'Under Maintenance' after condition set to Needs Repair"
        
        print(f"Item updated - condition: {updated_item['condition']}, status: {updated_item['status']}")
        return updated_item
    
    def test_issue_was_auto_created(self, headers):
        """Verify an issue was auto-created for the item"""
        item_id = pytest.test_item_id
        item_name = pytest.test_item_name
        
        # Get all issues
        response = requests.get(f"{API_URL}/issues", headers=headers)
        assert response.status_code == 200
        
        issues = response.json()
        
        # Find issue for our test item
        item_issues = [i for i in issues if i["item_id"] == item_id and i["status"] != "Resolved"]
        assert len(item_issues) >= 1, f"No open issue found for item {item_name}"
        
        issue = item_issues[0]
        pytest.auto_created_issue_id = issue["id"]
        
        # Verify issue properties
        assert issue["item_name"] == item_name, "Issue item_name should match"
        assert issue["issue_type"] == "Malfunction", f"Auto-created issue should have type 'Malfunction', got: {issue['issue_type']}"
        assert issue["severity"] in ["Medium", "High"], f"Severity should be Medium or High, got: {issue['severity']}"
        assert issue["reported_by"] is not None, "Issue should have reported_by set from current user"
        assert issue["reported_by_email"] is not None, "Issue should have reported_by_email set"
        
        print(f"Auto-created issue: {issue['id']} - type: {issue['issue_type']}, severity: {issue['severity']}")
        print(f"Reported by: {issue['reported_by']} ({issue['reported_by_email']})")


class TestIssueResolveRestoresItem:
    """Test that resolving an issue restores item condition to OK and status to Available"""
    
    def test_patch_issue_resolved_restores_item(self, headers):
        """PATCH /api/issues/{id} with status='Resolved' should restore item condition to OK"""
        issue_id = pytest.auto_created_issue_id
        item_id = pytest.test_item_id
        
        # Resolve the issue
        update_data = {
            "status": "Resolved",
            "resolution_notes": "Fixed during testing"
        }
        response = requests.patch(f"{API_URL}/issues/{issue_id}", json=update_data, headers=headers)
        assert response.status_code == 200, f"PATCH issue failed: {response.text}"
        
        resolved_issue = response.json()
        assert resolved_issue["status"] == "Resolved", "Issue status should be 'Resolved'"
        assert resolved_issue["resolved_at"] is not None, "Issue should have resolved_at timestamp"
        
        print(f"Issue resolved at: {resolved_issue['resolved_at']}")
        
        # Verify item was restored
        item_response = requests.get(f"{API_URL}/items/{item_id}", headers=headers)
        assert item_response.status_code == 200
        
        item = item_response.json()
        assert item["condition"] == "OK", f"Item condition should be 'OK' after issue resolved, got: {item['condition']}"
        assert item["status"] == "Available", f"Item status should be 'Available' after issue resolved, got: {item['status']}"
        
        print(f"Item restored - condition: {item['condition']}, status: {item['status']}")


class TestIssueResolveViaQueryParam:
    """Test backwards compatibility - resolving issue via query param ?status=Resolved"""
    
    def test_create_new_issue_for_query_param_test(self, headers):
        """Create another issue to test query param resolution"""
        item_id = pytest.test_item_id
        
        # First set item condition back to Needs Repair
        update_data = {"condition": "Needs Repair"}
        response = requests.put(f"{API_URL}/items/{item_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Get the new auto-created issue
        issues_resp = requests.get(f"{API_URL}/issues", headers=headers)
        issues = issues_resp.json()
        item_issues = [i for i in issues if i["item_id"] == item_id and i["status"] != "Resolved"]
        
        assert len(item_issues) >= 1, "Should have a new open issue"
        pytest.query_param_issue_id = item_issues[0]["id"]
        print(f"Created new issue for query param test: {pytest.query_param_issue_id}")
    
    def test_resolve_via_query_param(self, headers):
        """PATCH /api/issues/{id}?status=Resolved should work (backwards compat)"""
        issue_id = pytest.query_param_issue_id
        item_id = pytest.test_item_id
        
        # Resolve via query param
        response = requests.patch(f"{API_URL}/issues/{issue_id}?status=Resolved", headers=headers)
        assert response.status_code == 200, f"Query param resolve failed: {response.text}"
        
        resolved_issue = response.json()
        assert resolved_issue["status"] == "Resolved"
        
        # Verify item restored
        item_response = requests.get(f"{API_URL}/items/{item_id}", headers=headers)
        item = item_response.json()
        assert item["condition"] == "OK"
        assert item["status"] == "Available"
        
        print("Query param resolution works - backwards compatibility verified")


class TestManualIssueCreationUpdatesItem:
    """Test that POST /api/issues also updates item condition"""
    
    def test_create_new_item_for_manual_issue(self, headers):
        """Create a fresh item for manual issue test"""
        unique_id = str(uuid.uuid4())[:8]
        item_data = {
            "name": f"TEST_ManualIssue_Item_{unique_id}",
            "category": "Audio",
            "total_quantity": 2
        }
        response = requests.post(f"{API_URL}/items", json=item_data, headers=headers)
        assert response.status_code == 200
        
        item = response.json()
        pytest.manual_issue_item_id = item["id"]
        pytest.manual_issue_item_name = item["name"]
        
        assert item["condition"] == "OK"
        print(f"Created item for manual issue test: {item['name']}")
    
    def test_post_issue_updates_item_condition(self, headers):
        """POST /api/issues should set item condition to 'Needs Repair' if it was OK"""
        item_id = pytest.manual_issue_item_id
        
        issue_data = {
            "item_id": item_id,
            "description": "Manual test issue - speaker not working",
            "issue_type": "Malfunction",
            "severity": "High",
            "reported_by": "Test Reporter",
            "reported_by_email": "testreporter@machvisuals.com",
            "assigned_to": "Tech Team",
            "assigned_to_email": "tech@machvisuals.com",
            "vendor_contact": "Support Vendor - vendor@example.com"
        }
        
        response = requests.post(f"{API_URL}/issues", json=issue_data, headers=headers)
        assert response.status_code == 200, f"POST issue failed: {response.text}"
        
        created_issue = response.json()
        pytest.manual_issue_id = created_issue["id"]
        
        # Verify all fields were saved
        assert created_issue["item_name"] == pytest.manual_issue_item_name
        assert created_issue["description"] == issue_data["description"]
        assert created_issue["issue_type"] == "Malfunction"
        assert created_issue["severity"] == "High"
        assert created_issue["reported_by"] == "Test Reporter"
        assert created_issue["reported_by_email"] == "testreporter@machvisuals.com"
        assert created_issue["assigned_to"] == "Tech Team"
        assert created_issue["assigned_to_email"] == "tech@machvisuals.com"
        assert created_issue["vendor_contact"] == "Support Vendor - vendor@example.com"
        
        print(f"Manual issue created with all fields: {created_issue['id']}")
        
        # Verify item condition was updated
        item_response = requests.get(f"{API_URL}/items/{item_id}", headers=headers)
        item = item_response.json()
        assert item["condition"] == "Needs Repair", f"Item condition should be 'Needs Repair' after issue created, got: {item['condition']}"
        
        print(f"Item condition updated to: {item['condition']}")


class TestIssueUpdateFields:
    """Test PATCH /api/issues with various IssueUpdate fields"""
    
    def test_patch_issue_updates_all_fields(self, headers):
        """PATCH /api/issues/{id} should accept all IssueUpdate fields"""
        issue_id = pytest.manual_issue_id
        
        update_data = {
            "description": "Updated description - fixed partially",
            "issue_type": "Calibration",
            "severity": "Medium",
            "assigned_to": "Senior Tech",
            "assigned_to_email": "senior.tech@machvisuals.com",
            "vendor_contact": "Updated Vendor - newvendor@example.com",
            "resolution_notes": "Partial fix applied"
        }
        
        response = requests.patch(f"{API_URL}/issues/{issue_id}", json=update_data, headers=headers)
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        
        updated_issue = response.json()
        
        assert updated_issue["description"] == "Updated description - fixed partially"
        assert updated_issue["issue_type"] == "Calibration"
        assert updated_issue["severity"] == "Medium"
        assert updated_issue["assigned_to"] == "Senior Tech"
        assert updated_issue["assigned_to_email"] == "senior.tech@machvisuals.com"
        assert updated_issue["vendor_contact"] == "Updated Vendor - newvendor@example.com"
        assert updated_issue["resolution_notes"] == "Partial fix applied"
        
        print("All IssueUpdate fields updated successfully")


class TestDamagedConditionAutoIssue:
    """Test that setting condition to 'Damaged' also creates an issue"""
    
    def test_create_item_for_damaged_test(self, headers):
        """Create item for damaged condition test"""
        unique_id = str(uuid.uuid4())[:8]
        item_data = {
            "name": f"TEST_Damaged_Item_{unique_id}",
            "category": "Lighting",
            "total_quantity": 1
        }
        response = requests.post(f"{API_URL}/items", json=item_data, headers=headers)
        assert response.status_code == 200
        
        item = response.json()
        pytest.damaged_item_id = item["id"]
        pytest.damaged_item_name = item["name"]
        print(f"Created item for damaged test: {item['name']}")
    
    def test_put_condition_damaged_creates_issue(self, headers):
        """PUT with condition='Damaged' should also auto-create an issue"""
        item_id = pytest.damaged_item_id
        
        update_data = {"condition": "Damaged"}
        response = requests.put(f"{API_URL}/items/{item_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        item = response.json()
        assert item["condition"] == "Damaged"
        assert item["status"] == "Under Maintenance"
        
        # Check issue was created
        issues_resp = requests.get(f"{API_URL}/issues", headers=headers)
        issues = issues_resp.json()
        item_issues = [i for i in issues if i["item_id"] == item_id and i["status"] != "Resolved"]
        
        assert len(item_issues) >= 1, "Should have an open issue for damaged item"
        issue = item_issues[0]
        assert issue["issue_type"] == "Damage", f"Issue type should be 'Damage' for damaged condition, got: {issue['issue_type']}"
        assert issue["severity"] == "High", f"Severity should be 'High' for damaged items, got: {issue['severity']}"
        
        print(f"Damaged condition created issue: type={issue['issue_type']}, severity={issue['severity']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_items(self, headers):
        """Delete all test items created during testing"""
        items_to_delete = [
            getattr(pytest, 'test_item_id', None),
            getattr(pytest, 'manual_issue_item_id', None),
            getattr(pytest, 'damaged_item_id', None)
        ]
        
        for item_id in items_to_delete:
            if item_id:
                try:
                    requests.delete(f"{API_URL}/items/{item_id}", headers=headers)
                    print(f"Deleted test item: {item_id}")
                except:
                    pass
        
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
