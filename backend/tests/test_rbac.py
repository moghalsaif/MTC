"""
RBAC (Role-Based Access Control) Tests
Tests for admin, manager, and user role permissions

Roles:
- admin (sanat@machvisuals.com): Full access
- manager (rohit@machvisuals.com): Can add/edit items, resolve issues, delete licences/assets, but NOT delete items
- user (all others): Can mark in/out and report issues only
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "sanat@machvisuals.com", "password": "password123"}  # Try this first
ADMIN_CREDS_ALT = {"email": "sanat@machvisuals.com", "password": "Sanat1234!"}  # Alternative
MANAGER_CREDS = {"email": "rohit@machvisuals.com", "password": "Rohit1234!"}
USER_CREDS = {"email": "testcalc@machvisuals.com", "password": "Test1234!"}

# Registration for test user if needed
TEST_USER_REGISTER = {"email": "testcalc@machvisuals.com", "password": "Test1234!", "name": "Test Calc User"}


class TestAuthRoleReturns:
    """Test that login and /me endpoints return role field"""
    
    def get_token(self, email, password):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_login_returns_role_for_user(self):
        """POST /api/auth/login returns 'role' field in user object"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
        if response.status_code == 401:
            # Register the user first
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_REGISTER)
            print(f"Registration response: {reg_response.status_code} - {reg_response.text}")
            response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert "role" in data["user"], "User object missing 'role' field"
        assert data["user"]["role"] == "user", f"Expected role 'user', got '{data['user']['role']}'"
        print(f"✓ Regular user login returns role: {data['user']['role']}")
    
    def test_login_returns_role_for_manager(self):
        """POST /api/auth/login returns 'manager' role for rohit@machvisuals.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
        if response.status_code == 401:
            # Try registering manager
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", 
                json={"email": MANAGER_CREDS["email"], "password": MANAGER_CREDS["password"], "name": "Rohit Manager"})
            print(f"Manager registration: {reg_response.status_code}")
            response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
        
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "role" in data["user"]
        assert data["user"]["role"] == "manager", f"Expected role 'manager', got '{data['user']['role']}'"
        print(f"✓ Manager login returns role: {data['user']['role']}")
    
    def test_auth_me_returns_role(self):
        """GET /api/auth/me returns 'role' field"""
        token = self.get_token(USER_CREDS["email"], USER_CREDS["password"])
        assert token, "Failed to get token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "role" in data, "/auth/me response missing 'role' field"
        print(f"✓ /auth/me returns role: {data['role']}")


class TestRegularUserRestrictions:
    """Test that regular users (testcalc@machvisuals.com) are restricted from admin/manager actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get user token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
        if response.status_code == 401:
            requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_REGISTER)
            response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Could not authenticate user: {response.text}")
    
    def test_user_cannot_create_item(self):
        """Regular user gets 403 on POST /api/items"""
        response = requests.post(f"{BASE_URL}/api/items", json={
            "name": "TEST_RBAC_Item",
            "category": "Test",
            "total_quantity": 1
        }, headers=self.headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Regular user cannot create items (403)")
    
    def test_user_cannot_update_item(self):
        """Regular user gets 403 on PUT /api/items/{id}"""
        # First get an existing item
        items_response = requests.get(f"{BASE_URL}/api/items", headers=self.headers)
        if items_response.status_code == 200 and items_response.json():
            item_id = items_response.json()[0]["id"]
            
            response = requests.put(f"{BASE_URL}/api/items/{item_id}", json={
                "name": "Updated by user"
            }, headers=self.headers)
            
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            print("✓ Regular user cannot update items (403)")
        else:
            # No items, try with fake ID
            response = requests.put(f"{BASE_URL}/api/items/fake-id", json={
                "name": "Test"
            }, headers=self.headers)
            assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"
            print("✓ Regular user cannot update items")
    
    def test_user_cannot_delete_item(self):
        """Regular user gets 403 on DELETE /api/items/{id}"""
        items_response = requests.get(f"{BASE_URL}/api/items", headers=self.headers)
        if items_response.status_code == 200 and items_response.json():
            item_id = items_response.json()[0]["id"]
            
            response = requests.delete(f"{BASE_URL}/api/items/{item_id}", headers=self.headers)
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            print("✓ Regular user cannot delete items (403)")
        else:
            response = requests.delete(f"{BASE_URL}/api/items/fake-id", headers=self.headers)
            assert response.status_code in [403, 404]
            print("✓ Regular user cannot delete items")
    
    def test_user_cannot_delete_licence(self):
        """Regular user gets 403 on DELETE /api/licences/{id}"""
        licences_response = requests.get(f"{BASE_URL}/api/licences", headers=self.headers)
        if licences_response.status_code == 200 and licences_response.json():
            licence_id = licences_response.json()[0]["id"]
            
            response = requests.delete(f"{BASE_URL}/api/licences/{licence_id}", headers=self.headers)
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            print("✓ Regular user cannot delete licences (403)")
        else:
            response = requests.delete(f"{BASE_URL}/api/licences/fake-id", headers=self.headers)
            assert response.status_code in [403, 404]
            print("✓ Regular user cannot delete licences")
    
    def test_user_cannot_delete_asset(self):
        """Regular user gets 403 on DELETE /api/assets/{id}"""
        assets_response = requests.get(f"{BASE_URL}/api/assets", headers=self.headers)
        if assets_response.status_code == 200 and assets_response.json():
            asset_id = assets_response.json()[0]["id"]
            
            response = requests.delete(f"{BASE_URL}/api/assets/{asset_id}", headers=self.headers)
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            print("✓ Regular user cannot delete assets (403)")
        else:
            response = requests.delete(f"{BASE_URL}/api/assets/fake-id", headers=self.headers)
            assert response.status_code in [403, 404]
            print("✓ Regular user cannot delete assets")
    
    def test_user_cannot_resolve_issue(self):
        """Regular user gets 403 when trying to resolve issues"""
        issues_response = requests.get(f"{BASE_URL}/api/issues", headers=self.headers)
        if issues_response.status_code == 200 and issues_response.json():
            # Find an open issue
            open_issues = [i for i in issues_response.json() if i.get("status") != "Resolved"]
            if open_issues:
                issue_id = open_issues[0]["id"]
                
                response = requests.patch(f"{BASE_URL}/api/issues/{issue_id}", 
                    json={"status": "Resolved"},
                    headers=self.headers)
                
                assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
                print("✓ Regular user cannot resolve issues (403)")
                return
        
        print("ℹ No open issues to test resolve restriction")


class TestManagerPermissions:
    """Test that manager (rohit@machvisuals.com) has proper permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get manager token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
        if response.status_code == 401:
            reg = requests.post(f"{BASE_URL}/api/auth/register", 
                json={"email": MANAGER_CREDS["email"], "password": MANAGER_CREDS["password"], "name": "Rohit Manager"})
            response = requests.post(f"{BASE_URL}/api/auth/login", json=MANAGER_CREDS)
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Could not authenticate manager: {response.text}")
    
    def test_manager_can_create_item(self):
        """Manager can POST /api/items successfully"""
        response = requests.post(f"{BASE_URL}/api/items", json={
            "name": "TEST_RBAC_Manager_Item",
            "category": "Camera & Optics",
            "total_quantity": 1
        }, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_RBAC_Manager_Item"
        print(f"✓ Manager can create items - created item ID: {data['id']}")
        
        # Cleanup - but manager can't delete, so just note it
        self.created_item_id = data["id"]
    
    def test_manager_can_update_item(self):
        """Manager can PUT /api/items/{id} successfully"""
        # First create an item
        create_response = requests.post(f"{BASE_URL}/api/items", json={
            "name": "TEST_RBAC_Manager_Update",
            "category": "Audio",
            "total_quantity": 2
        }, headers=self.headers)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create test item")
        
        item_id = create_response.json()["id"]
        
        # Update it
        response = requests.put(f"{BASE_URL}/api/items/{item_id}", json={
            "name": "TEST_RBAC_Manager_Updated",
            "notes": "Updated by manager"
        }, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_RBAC_Manager_Updated"
        print("✓ Manager can update items")
    
    def test_manager_cannot_delete_item(self):
        """Manager gets 403 on DELETE /api/items/{id}"""
        items_response = requests.get(f"{BASE_URL}/api/items", headers=self.headers)
        if items_response.status_code == 200 and items_response.json():
            item_id = items_response.json()[0]["id"]
            
            response = requests.delete(f"{BASE_URL}/api/items/{item_id}", headers=self.headers)
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            print("✓ Manager cannot delete items (403)")
        else:
            response = requests.delete(f"{BASE_URL}/api/items/fake-id", headers=self.headers)
            assert response.status_code in [403, 404]
            print("✓ Manager cannot delete items")
    
    def test_manager_can_delete_licence(self):
        """Manager can DELETE /api/licences/{id}"""
        # First create a licence
        create_response = requests.post(f"{BASE_URL}/api/licences", json={
            "name": "TEST_RBAC_Licence",
            "vendor": "Test Vendor",
            "category": "Software",
            "cost_per_period": 100,
            "billing_period": "Monthly",
            "renewal_date": "2026-12-31"
        }, headers=self.headers)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create test licence: {create_response.text}")
        
        licence_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/licences/{licence_id}", headers=self.headers)
        assert response.status_code in [200, 204], f"Expected 200/204, got {response.status_code}: {response.text}"
        print("✓ Manager can delete licences")


class TestAdminPermissions:
    """Test that admin (sanat@machvisuals.com) has full access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for each test"""
        # Try primary password first
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code == 401:
            # Try alternative password
            response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS_ALT)
        if response.status_code == 401:
            # Try registering admin
            reg = requests.post(f"{BASE_URL}/api/auth/register", 
                json={"email": ADMIN_CREDS["email"], "password": ADMIN_CREDS["password"], "name": "Sanat Admin"})
            print(f"Admin registration: {reg.status_code} - {reg.text}")
            response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            data = response.json()
            print(f"Admin logged in with role: {data.get('user', {}).get('role')}")
        else:
            pytest.skip(f"Could not authenticate admin: {response.text}")
    
    def test_admin_has_admin_role(self):
        """Admin user should have 'admin' role"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin", f"Expected admin role, got {data['role']}"
        print("✓ Admin has 'admin' role")
    
    def test_admin_can_delete_item(self):
        """Admin can DELETE /api/items/{id}"""
        # First create an item
        create_response = requests.post(f"{BASE_URL}/api/items", json={
            "name": "TEST_RBAC_Admin_Delete",
            "category": "Audio",
            "total_quantity": 1
        }, headers=self.headers)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create test item: {create_response.text}")
        
        item_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/items/{item_id}", headers=self.headers)
        assert response.status_code in [200, 204], f"Expected 200/204, got {response.status_code}: {response.text}"
        print("✓ Admin can delete items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
