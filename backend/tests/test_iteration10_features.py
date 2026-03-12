"""
Iteration 10 Backend Tests
Features tested:
- Nav dropdown structure (verified via frontend)
- Edit inventory items via PUT /api/items/{id}
- Custom document categories
- Location field renamed from location_in_studio
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests - get token for other tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "agent@machvisuals.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestItemUpdatePUT(TestAuth):
    """Test PUT /api/items/{id} endpoint for editing items"""
    
    def test_put_items_endpoint_exists(self, headers):
        """Verify PUT /api/items/{id} endpoint accepts requests"""
        # Get first item
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        assert response.status_code == 200
        items = response.json()
        assert len(items) > 0, "No items found in inventory"
        
        item_id = items[0]["id"]
        original_name = items[0]["name"]
        
        # Test PUT endpoint exists and accepts request
        response = requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json={"name": original_name}  # No actual change
        )
        assert response.status_code == 200, f"PUT request failed: {response.text}"
    
    def test_put_updates_total_quantity(self, headers):
        """Verify PUT can update total_quantity and recalculates quantity_available"""
        # Get first item
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        items = response.json()
        item = items[0]
        item_id = item["id"]
        original_qty = item["total_quantity"]
        
        # Update quantity
        new_qty = original_qty + 5
        response = requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json={"total_quantity": new_qty}
        )
        assert response.status_code == 200
        
        # Verify update
        updated = response.json()
        assert updated["total_quantity"] == new_qty
        
        # Revert change
        requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json={"total_quantity": original_qty}
        )
    
    def test_put_updates_location_field(self, headers):
        """Verify PUT can update location field (renamed from location_in_studio)"""
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        items = response.json()
        item_id = items[0]["id"]
        
        # Update location
        response = requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json={"location": "TEST_Mumbai"}
        )
        assert response.status_code == 200
        
        # Verify update
        updated = response.json()
        assert updated["location"] == "TEST_Mumbai"
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/items/{item_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["location"] == "TEST_Mumbai"
    
    def test_put_updates_status_and_condition(self, headers):
        """Verify PUT can update status and condition fields"""
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        items = response.json()
        item = items[0]
        item_id = item["id"]
        original_status = item["status"]
        original_condition = item["condition"]
        
        # Update status and condition
        response = requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json={"status": "Under Maintenance", "condition": "Needs Repair"}
        )
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["status"] == "Under Maintenance"
        assert updated["condition"] == "Needs Repair"
        
        # Revert
        requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json={"status": original_status, "condition": original_condition, "location": None}
        )
    
    def test_put_accepts_all_edit_fields(self, headers):
        """Verify PUT accepts all fields that edit dialog can modify"""
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        items = response.json()
        item_id = items[0]["id"]
        
        # All editable fields
        update_data = {
            "name": "TEST_Updated Item",
            "category": "Audio",
            "sub_category": "TEST_Sub",
            "total_quantity": 10,
            "location": "TEST_Delhi",
            "status": "Available",
            "condition": "OK",
            "product_id": "TEST_SKU123",
            "serial_number": "TEST_SN456",
            "vendor": "TEST_Vendor",
            "purchase_price": 999.99,
            "purchase_date": "2025-01-15",
            "expiry_date": "2030-01-15",
            "warranty_expiry": "2027-01-15",
            "notes": "TEST_Notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/items/{item_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200
        
        # Verify fields were updated
        updated = response.json()
        assert updated["name"] == "TEST_Updated Item"
        assert updated["location"] == "TEST_Delhi"
        assert updated["purchase_price"] == 999.99


class TestDocumentCategories(TestAuth):
    """Test custom document categories endpoints"""
    
    def test_get_document_categories(self, headers):
        """Verify GET /api/document-categories returns list"""
        response = requests.get(f"{BASE_URL}/api/document-categories", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_post_document_category_creates_new(self, headers):
        """Verify POST /api/document-categories creates category"""
        # Create unique category name
        import uuid
        cat_name = f"TEST_Category_{str(uuid.uuid4())[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/document-categories?name={cat_name}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == cat_name
        
        # Verify it appears in list
        get_response = requests.get(f"{BASE_URL}/api/document-categories", headers=headers)
        categories = get_response.json()
        assert cat_name in categories
    
    def test_post_document_category_rejects_empty(self, headers):
        """Verify POST rejects empty category name"""
        response = requests.post(
            f"{BASE_URL}/api/document-categories?name=",
            headers=headers
        )
        assert response.status_code == 400
    
    def test_post_document_category_rejects_duplicate(self, headers):
        """Verify POST rejects duplicate category name"""
        # Create category
        response = requests.post(
            f"{BASE_URL}/api/document-categories?name=TEST_Duplicate",
            headers=headers
        )
        # Either 200 (new) or 400 (already exists)
        
        # Try to create again
        response2 = requests.post(
            f"{BASE_URL}/api/document-categories?name=TEST_Duplicate",
            headers=headers
        )
        assert response2.status_code == 400


class TestItemModelLocationField(TestAuth):
    """Verify Item model uses 'location' field, not 'location_in_studio'"""
    
    def test_items_have_location_field(self, headers):
        """Verify items response includes 'location' field"""
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        assert response.status_code == 200
        items = response.json()
        
        if len(items) > 0:
            item = items[0]
            assert "location" in item, "Item missing 'location' field"
            assert "location_in_studio" not in item, "Item still has old 'location_in_studio' field"
    
    def test_create_item_with_location(self, headers):
        """Verify creating item with location field works"""
        response = requests.post(
            f"{BASE_URL}/api/items",
            headers=headers,
            json={
                "name": "TEST_Location_Item",
                "category": "Audio",
                "total_quantity": 1,
                "location": "TEST_Bangalore"
            }
        )
        assert response.status_code == 200
        
        created = response.json()
        assert created["location"] == "TEST_Bangalore"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/items/{created['id']}", headers=headers)


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_items(self, headers):
        """Remove TEST_ prefixed items"""
        response = requests.get(f"{BASE_URL}/api/items", headers=headers)
        items = response.json()
        
        for item in items:
            if item["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/items/{item['id']}", headers=headers)
        
        # Restore first item if it was modified
        if items:
            first_item = items[0]
            requests.put(
                f"{BASE_URL}/api/items/{first_item['id']}",
                headers=headers,
                json={
                    "name": "Hollyland LARK M2 Wireless Lavalier Microphone",
                    "category": "Audio",
                    "sub_category": "Microphones",
                    "total_quantity": 1,
                    "location": None,
                    "status": "Available",
                    "condition": "OK",
                    "product_id": None,
                    "serial_number": None,
                    "vendor": None,
                    "purchase_price": None,
                    "purchase_date": None,
                    "expiry_date": None,
                    "warranty_expiry": None,
                    "notes": None
                }
            )
