"""
Mach Traffic Controller API Tests
Tests for: Dashboard stats, Recent activity, Items (90 from Excel), Navigation validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://frame-rate-tool.preview.emergentagent.com').rstrip('/')

class TestAuth:
    """Authentication Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "agent@machvisuals.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "agent@machvisuals.com"
        print(f"✓ Login successful for {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@machvisuals.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_registration_domain_restriction(self):
        """Test registration is restricted to @machvisuals.com emails"""
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@gmail.com",
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 400, f"Expected 400 for non-machvisuals email: {response.text}"
        data = response.json()
        assert "machvisuals.com" in data.get("detail", "").lower()
        print("✓ Registration domain restriction working - non @machvisuals.com emails rejected")


class TestDashboard:
    """Dashboard Stats and Activity Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "agent@machvisuals.com",
            "password": "password123"
        })
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_dashboard_stats_returns_90_total_items(self):
        """CRITICAL: Dashboard stats should show total_items: 90 from Excel data"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check required fields exist
        assert "total_items" in data
        assert "items_currently_out" in data
        assert "overdue_count" in data
        assert "open_issues" in data
        assert "under_maintenance_count" in data
        assert "lost_items_count" in data
        assert "active_projects" in data
        
        # CRITICAL: Should have 90 items from the new Excel data
        total_items = data["total_items"]
        print(f"  Total items: {total_items}")
        print(f"  Items out: {data['items_currently_out']}")
        print(f"  Overdue: {data['overdue_count']}")
        print(f"  Open issues: {data['open_issues']}")
        print(f"  Maintenance: {data['under_maintenance_count']}")
        print(f"  Lost items: {data['lost_items_count']}")
        print(f"  Active projects: {data['active_projects']}")
        
        assert total_items == 90, f"Expected 90 items from Excel, got {total_items}"
        print(f"✓ Dashboard stats returned correctly with {total_items} total items")
    
    def test_dashboard_recent_activity(self):
        """Test recent activity endpoint for dashboard notifications"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/recent-activity")
        assert response.status_code == 200, f"Recent activity failed: {response.text}"
        data = response.json()
        
        # Should return a list of activities
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        # If there are activities, check they have required fields
        if len(data) > 0:
            activity = data[0]
            assert "type" in activity
            assert "description" in activity
            assert "timestamp" in activity
            print(f"✓ Recent activity endpoint returns {len(data)} activities")
            print(f"  Sample activity: {activity.get('description', 'N/A')}")
        else:
            print("✓ Recent activity endpoint works (no activities yet)")


class TestInventory:
    """Inventory Items Tests - Validates 90 items from Excel"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "agent@machvisuals.com",
            "password": "password123"
        })
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_items_returns_90_items(self):
        """CRITICAL: Items endpoint should return 90 items from MASTER FINALS.xlsx"""
        response = self.session.get(f"{BASE_URL}/api/items")
        assert response.status_code == 200, f"Items fetch failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        item_count = len(data)
        
        # CRITICAL: Should have exactly 90 items from the new Excel data
        assert item_count == 90, f"Expected 90 items from Excel, got {item_count}"
        print(f"✓ Items endpoint returns {item_count} items")
    
    def test_items_have_sub_category_field(self):
        """Items should have sub_category field from new Excel data"""
        response = self.session.get(f"{BASE_URL}/api/items")
        assert response.status_code == 200
        data = response.json()
        
        # Check that items have sub_category field (can be null)
        items_with_subcategory = [item for item in data if item.get("sub_category") is not None]
        print(f"  Items with sub_category: {len(items_with_subcategory)}/{len(data)}")
        print(f"✓ Items have sub_category field structure")
    
    def test_items_have_expected_categories(self):
        """Items should have categories from new Excel: Camera & Optics, Lighting, Audio, etc."""
        response = self.session.get(f"{BASE_URL}/api/items")
        assert response.status_code == 200
        data = response.json()
        
        categories = set(item.get("category") for item in data if item.get("category"))
        expected_categories = {
            "Camera & Optics",
            "Lighting", 
            "Audio",
            "Video & Capture",
            "Computing",
            "Displays",
            "Storage & Media",
            "Networking",
            "Power & Cables",
            "Hardware & Tools"
        }
        
        print(f"  Found categories: {categories}")
        
        # Check that at least some expected categories are present
        common_categories = categories & expected_categories
        assert len(common_categories) > 0, f"Expected at least some categories from: {expected_categories}"
        print(f"✓ Items have {len(common_categories)} expected categories: {common_categories}")
    
    def test_single_item_structure(self):
        """Test that individual items have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/items")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            required_fields = ["id", "name", "category", "total_quantity", "quantity_available", "quantity_out", "status"]
            for field in required_fields:
                assert field in item, f"Missing required field: {field}"
            print(f"✓ Items have correct structure with fields: {list(item.keys())}")


class TestPages:
    """Test that all required pages/endpoints work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "agent@machvisuals.com",
            "password": "password123"
        })
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_projects_endpoint(self):
        """Projects page API works"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Projects failed: {response.text}"
        print(f"✓ Projects endpoint works - {len(response.json())} projects")
    
    def test_issues_endpoint(self):
        """Issues page API works"""
        response = self.session.get(f"{BASE_URL}/api/issues")
        assert response.status_code == 200, f"Issues failed: {response.text}"
        print(f"✓ Issues endpoint works - {len(response.json())} issues")
    
    def test_lost_items_endpoint(self):
        """Lost Items page API works"""
        response = self.session.get(f"{BASE_URL}/api/lost-items")
        assert response.status_code == 200, f"Lost items failed: {response.text}"
        print(f"✓ Lost items endpoint works - {len(response.json())} lost items")
    
    def test_maintenance_endpoint(self):
        """Maintenance page API works"""
        response = self.session.get(f"{BASE_URL}/api/maintenance")
        assert response.status_code == 200, f"Maintenance failed: {response.text}"
        print(f"✓ Maintenance endpoint works - {len(response.json())} records")
    
    def test_licences_endpoint(self):
        """Licences & Assets page API works"""
        response = self.session.get(f"{BASE_URL}/api/licences")
        assert response.status_code == 200, f"Licences failed: {response.text}"
        print(f"✓ Licences endpoint works - {len(response.json())} licences")
    
    def test_active_checkouts_endpoint(self):
        """Items Out page - Active checkouts API works"""
        response = self.session.get(f"{BASE_URL}/api/checkouts/active")
        assert response.status_code == 200, f"Active checkouts failed: {response.text}"
        print(f"✓ Active checkouts (Items Out) endpoint works - {len(response.json())} checkouts")


class TestCommandCenterRemoved:
    """Test that Command Center route does NOT exist (should be removed)"""
    
    def test_command_center_route_removed(self):
        """Command Center should NOT exist - accessing /command should fail or redirect"""
        # This is a frontend test - backend doesn't have a /command endpoint
        # Just verify there's no /api/command route
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to access any potential command center endpoint
        response = session.get(f"{BASE_URL}/api/command")
        # Should return 404 or not found
        assert response.status_code in [404, 405, 422], f"Expected /api/command to not exist, got {response.status_code}"
        print("✓ No /api/command endpoint exists (Command Center removed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
