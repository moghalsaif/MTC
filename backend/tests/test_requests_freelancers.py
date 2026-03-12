"""
Backend tests for Requests and Freelancers features.
Tests CRUD operations, role-based access control, and validation rules.

Test Coverage:
- Requests: POST (with multipart), GET, PATCH (admin approval), DELETE
- Freelancers: GET (admin only), POST (admin only), PUT, DELETE
- RBAC: Verify non-admin cannot approve/reject or access freelancers
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
import io
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://frame-rate-tool.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"email": "sanat@machvisuals.com", "password": "MachAdmin@2026"}
MANAGER_CREDS = {"email": "rohit@machvisuals.com", "password": "MachManager@2026"}
USER_CREDS = {"email": "testcalc@machvisuals.com", "password": "Test1234!"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def user_token():
    """Get regular user token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
    assert response.status_code == 200, f"User login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def manager_token():
    """Get manager token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
    assert response.status_code == 200, f"Manager login failed: {response.text}"
    return response.json()["access_token"]


def get_auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def create_test_image():
    """Create a small test PNG image (1x1 pixel)"""
    # Minimal valid PNG
    png_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    )
    return io.BytesIO(png_data)


class TestRequestsAPI:
    """Tests for Requests CRUD and validation"""
    
    def test_create_request_success(self, admin_token):
        """Test creating a request with all required fields (multipart)"""
        # Get date 7+ days in future
        future_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        
        data = {
            "item_name": "TEST_DaVinci Resolve Studio",
            "category": "Licence",
            "product_url": "https://www.blackmagicdesign.com/products/davinciresolve",
            "justification": "Line 1: Required for Project Alpha color grading\nLine 2: Will benefit Project Beta as well\nLine 3: Long-term studio investment for all future projects",
            "l1_price": "32900",
            "negotiation_notes": "Spoke with BMD reseller for India pricing",
            "needed_by_date": future_date
        }
        
        files = {"photo": ("test_image.png", create_test_image(), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token),
            data=data,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to create request: {response.text}"
        result = response.json()
        
        # Validate response
        assert result["item_name"] == "TEST_DaVinci Resolve Studio"
        assert result["category"] == "Licence"
        assert result["status"] == "Pending"
        assert result["l1_price"] == 32900.0
        assert "id" in result
        assert result["has_photo"] == True
        
        # Store request_id for later tests
        TestRequestsAPI.test_request_id = result["id"]
        print(f"Created request with ID: {result['id']}")
    
    def test_create_request_insufficient_justification(self, admin_token):
        """Test that less than 3 lines in justification is rejected"""
        future_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        
        data = {
            "item_name": "TEST_Short Justification Item",
            "category": "Tool",
            "product_url": "https://example.com",
            "justification": "Only one line",  # Less than 3 lines
            "l1_price": "1000",
            "needed_by_date": future_date
        }
        
        files = {"photo": ("test.png", create_test_image(), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token),
            data=data,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for insufficient justification, got {response.status_code}"
        assert "3 lines" in response.json().get("detail", "").lower() or "justification" in response.json().get("detail", "").lower()
        print("Correctly rejected request with insufficient justification")
    
    def test_create_request_insufficient_lead_time(self, admin_token):
        """Test that date less than 7 days is rejected"""
        # Date only 3 days in future
        near_date = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
        
        data = {
            "item_name": "TEST_Near Date Item",
            "category": "Asset",
            "product_url": "https://example.com",
            "justification": "Line 1: Test\nLine 2: Test\nLine 3: Test",
            "l1_price": "1000",
            "needed_by_date": near_date
        }
        
        files = {"photo": ("test.png", create_test_image(), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token),
            data=data,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for near date, got {response.status_code}"
        assert "week" in response.json().get("detail", "").lower() or "7 days" in response.json().get("detail", "").lower()
        print("Correctly rejected request with insufficient lead time")
    
    def test_get_requests(self, user_token):
        """Test getting all requests (any authenticated user)"""
        response = requests.get(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(user_token)
        )
        
        assert response.status_code == 200, f"Failed to get requests: {response.text}"
        result = response.json()
        
        assert isinstance(result, list)
        print(f"Retrieved {len(result)} requests")
        
        # Verify our test request is in the list
        test_reqs = [r for r in result if r.get("item_name", "").startswith("TEST_")]
        assert len(test_reqs) > 0, "Test request not found in list"
    
    def test_approve_request_admin_success(self, admin_token):
        """Test admin can approve a request with vendor details"""
        request_id = getattr(TestRequestsAPI, 'test_request_id', None)
        if not request_id:
            pytest.skip("No test request to approve")
        
        approval_data = {
            "status": "Approved",
            "vendor_name": "BMD India Reseller",
            "vendor_contact": "+91-9876543210",
            "best_price": 29500.0,
            "registered_company_confirmed": True
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/requests/{request_id}",
            headers=get_auth_header(admin_token),
            json=approval_data
        )
        
        assert response.status_code == 200, f"Failed to approve request: {response.text}"
        result = response.json()
        
        assert result["status"] == "Approved"
        assert result["approval_details"]["vendor_name"] == "BMD India Reseller"
        assert result["approval_details"]["best_price"] == 29500.0
        assert result["approval_details"]["registered_company_confirmed"] == True
        print(f"Request {request_id} approved successfully")
    
    def test_approve_request_missing_vendor_fields(self, admin_token):
        """Test approval without vendor fields is rejected"""
        # First create another request
        future_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        data = {
            "item_name": "TEST_Another Request",
            "category": "Tool",
            "product_url": "https://example.com",
            "justification": "Line 1\nLine 2\nLine 3",
            "l1_price": "5000",
            "needed_by_date": future_date
        }
        files = {"photo": ("test.png", create_test_image(), "image/png")}
        
        create_resp = requests.post(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token),
            data=data,
            files=files
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test request")
        
        new_req_id = create_resp.json()["id"]
        
        # Try to approve without vendor fields
        approval_data = {
            "status": "Approved",
            # Missing vendor_name, vendor_contact, best_price
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/requests/{new_req_id}",
            headers=get_auth_header(admin_token),
            json=approval_data
        )
        
        assert response.status_code == 400, f"Expected 400 for missing vendor fields, got {response.status_code}"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/requests/{new_req_id}", headers=get_auth_header(admin_token))
        print("Correctly rejected approval without vendor details")
    
    def test_approve_request_non_admin_forbidden(self, user_token):
        """Test regular user cannot approve requests (RBAC)"""
        request_id = getattr(TestRequestsAPI, 'test_request_id', None)
        if not request_id:
            pytest.skip("No test request")
        
        approval_data = {
            "status": "Approved",
            "vendor_name": "Attacker",
            "vendor_contact": "123",
            "best_price": 1,
            "registered_company_confirmed": True
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/requests/{request_id}",
            headers=get_auth_header(user_token),
            json=approval_data
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Correctly blocked non-admin from approving requests")
    
    def test_reject_request_admin(self, admin_token):
        """Test admin can reject a request"""
        # Create a new request to reject
        future_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        data = {
            "item_name": "TEST_Reject Me Request",
            "category": "Subscription",
            "product_url": "https://example.com",
            "justification": "Line 1\nLine 2\nLine 3",
            "l1_price": "1000",
            "needed_by_date": future_date
        }
        files = {"photo": ("test.png", create_test_image(), "image/png")}
        
        create_resp = requests.post(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token),
            data=data,
            files=files
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test request")
        
        req_id = create_resp.json()["id"]
        
        rejection_data = {
            "status": "Rejected",
            "rejection_reason": "Not needed at this time"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/requests/{req_id}",
            headers=get_auth_header(admin_token),
            json=rejection_data
        )
        
        assert response.status_code == 200, f"Failed to reject request: {response.text}"
        result = response.json()
        
        assert result["status"] == "Rejected"
        assert "rejection_reason" in result.get("approval_details", {})
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/requests/{req_id}", headers=get_auth_header(admin_token))
        print("Admin rejected request successfully")
    
    def test_hold_request_admin(self, admin_token):
        """Test admin can put request on hold"""
        future_date = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
        data = {
            "item_name": "TEST_Hold Me Request",
            "category": "Asset",
            "product_url": "https://example.com",
            "justification": "Line 1\nLine 2\nLine 3",
            "l1_price": "2000",
            "needed_by_date": future_date
        }
        files = {"photo": ("test.png", create_test_image(), "image/png")}
        
        create_resp = requests.post(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token),
            data=data,
            files=files
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test request")
        
        req_id = create_resp.json()["id"]
        
        hold_data = {"status": "On Hold"}
        
        response = requests.patch(
            f"{BASE_URL}/api/requests/{req_id}",
            headers=get_auth_header(admin_token),
            json=hold_data
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "On Hold"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/requests/{req_id}", headers=get_auth_header(admin_token))
        print("Admin put request on hold successfully")


class TestFreelancersAPI:
    """Tests for Freelancers (admin-only) CRUD"""
    
    def test_get_freelancers_admin_success(self, admin_token):
        """Test admin can get freelancers list"""
        response = requests.get(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(admin_token)
        )
        
        assert response.status_code == 200, f"Failed to get freelancers: {response.text}"
        result = response.json()
        
        assert isinstance(result, list)
        print(f"Admin retrieved {len(result)} freelancers")
    
    def test_get_freelancers_user_forbidden(self, user_token):
        """Test regular user cannot access freelancers (RBAC)"""
        response = requests.get(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(user_token)
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Correctly blocked non-admin from accessing freelancers")
    
    def test_get_freelancers_manager_forbidden(self, manager_token):
        """Test manager cannot access freelancers (admin-only)"""
        response = requests.get(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(manager_token)
        )
        
        assert response.status_code == 403, f"Expected 403 for manager, got {response.status_code}"
        print("Correctly blocked manager from accessing freelancers")
    
    def test_create_freelancer_admin_success(self, admin_token):
        """Test admin can create freelancer"""
        freelancer_data = {
            "full_name": "TEST_John VFX Artist",
            "phone": "+91-9876543210",
            "email": "john.vfx@example.com",
            "city": "Mumbai",
            "portfolio_url": "https://vimeo.com/johnvfx",
            "service_types": ["Compositing (Nuke)", "VFX Supervision", "Matte Painting"],
            "day_rate": 8000,
            "project_rate": 150000,
            "availability": "Available",
            "engagement_type": "Freelance",
            "projects_worked": "Project Alpha, Project Beta",
            "rating": 5,
            "internal_notes": "Excellent Nuke skills, fast turnaround",
            "last_engaged_date": "2025-12-01"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(admin_token),
            json=freelancer_data
        )
        
        assert response.status_code == 200, f"Failed to create freelancer: {response.text}"
        result = response.json()
        
        assert result["full_name"] == "TEST_John VFX Artist"
        assert "Compositing (Nuke)" in result["service_types"]
        assert result["rating"] == 5
        assert result["day_rate"] == 8000
        assert "id" in result
        
        TestFreelancersAPI.test_freelancer_id = result["id"]
        print(f"Created freelancer with ID: {result['id']}")
    
    def test_create_freelancer_user_forbidden(self, user_token):
        """Test regular user cannot create freelancer"""
        freelancer_data = {
            "full_name": "TEST_Attacker Freelancer",
            "service_types": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(user_token),
            json=freelancer_data
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Correctly blocked non-admin from creating freelancer")
    
    def test_update_freelancer_admin(self, admin_token):
        """Test admin can update freelancer"""
        freelancer_id = getattr(TestFreelancersAPI, 'test_freelancer_id', None)
        if not freelancer_id:
            pytest.skip("No test freelancer to update")
        
        update_data = {
            "full_name": "TEST_John VFX Artist Updated",
            "phone": "+91-9876543210",
            "email": "john.vfx.updated@example.com",
            "city": "Pune",
            "portfolio_url": "https://vimeo.com/johnvfx",
            "service_types": ["Compositing (Nuke)", "VFX Supervision", "Matte Painting", "Rotoscoping"],
            "day_rate": 9000,
            "project_rate": 175000,
            "availability": "Busy",
            "engagement_type": "Retainer",
            "projects_worked": "Project Alpha, Project Beta, Project Gamma",
            "rating": 5,
            "internal_notes": "Now on retainer",
            "last_engaged_date": "2026-01-10"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/freelancers/{freelancer_id}",
            headers=get_auth_header(admin_token),
            json=update_data
        )
        
        assert response.status_code == 200, f"Failed to update freelancer: {response.text}"
        result = response.json()
        
        assert result["full_name"] == "TEST_John VFX Artist Updated"
        assert result["availability"] == "Busy"
        assert result["day_rate"] == 9000
        assert "Rotoscoping" in result["service_types"]
        print(f"Updated freelancer {freelancer_id}")
    
    def test_filter_freelancers_by_service(self, admin_token):
        """Test that service type filtering works (verify at API level)"""
        response = requests.get(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(admin_token)
        )
        
        assert response.status_code == 200
        freelancers = response.json()
        
        # Filter locally (API doesn't have query params for filtering)
        nuke_freelancers = [f for f in freelancers if "Compositing (Nuke)" in f.get("service_types", [])]
        
        # Our test freelancer should be in there
        test_fl = [f for f in nuke_freelancers if f.get("full_name", "").startswith("TEST_")]
        assert len(test_fl) > 0, "Test freelancer with Nuke service not found"
        print(f"Found {len(nuke_freelancers)} freelancers with Compositing (Nuke) service")
    
    def test_delete_freelancer_admin(self, admin_token):
        """Test admin can delete freelancer"""
        freelancer_id = getattr(TestFreelancersAPI, 'test_freelancer_id', None)
        if not freelancer_id:
            pytest.skip("No test freelancer to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/freelancers/{freelancer_id}",
            headers=get_auth_header(admin_token)
        )
        
        assert response.status_code == 200, f"Failed to delete freelancer: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(admin_token)
        )
        freelancers = get_response.json()
        assert not any(f["id"] == freelancer_id for f in freelancers)
        print(f"Deleted freelancer {freelancer_id}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_requests(self, admin_token):
        """Clean up TEST_ prefixed requests"""
        response = requests.get(
            f"{BASE_URL}/api/requests",
            headers=get_auth_header(admin_token)
        )
        
        if response.status_code == 200:
            test_reqs = [r for r in response.json() if r.get("item_name", "").startswith("TEST_")]
            for req in test_reqs:
                requests.delete(f"{BASE_URL}/api/requests/{req['id']}", headers=get_auth_header(admin_token))
            print(f"Cleaned up {len(test_reqs)} test requests")
    
    def test_cleanup_test_freelancers(self, admin_token):
        """Clean up TEST_ prefixed freelancers"""
        response = requests.get(
            f"{BASE_URL}/api/freelancers",
            headers=get_auth_header(admin_token)
        )
        
        if response.status_code == 200:
            test_fls = [f for f in response.json() if f.get("full_name", "").startswith("TEST_")]
            for fl in test_fls:
                requests.delete(f"{BASE_URL}/api/freelancers/{fl['id']}", headers=get_auth_header(admin_token))
            print(f"Cleaned up {len(test_fls)} test freelancers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
