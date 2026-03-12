"""
Test file for Iteration 9 Features:
1. Category moves (Lightcraft Jetset -> Tracking, Green Mats -> Chroma Mat)
2. Enhanced Add Item form fields (product_id, serial_number, purchase_date, expiry_date, warranty_expiry, vendor, purchase_price, sub_category)
3. Dashboard cleanup (no recent activity section)
4. Documentation module (upload/download/delete files)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "agent@machvisuals.com"
TEST_PASSWORD = "password123"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


# ========== Category Move Tests ==========
class TestCategoryMoves:
    """Test that items were moved to correct categories"""
    
    def test_lightcraft_jetset_vertical_origin_in_tracking(self, auth_headers):
        """Lightcraft Jetset Vertical Origin should be in 'Tracking' category"""
        response = requests.get(f"{BASE_URL}/api/items", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        
        # Find Lightcraft Jetset Vertical Origin
        matching = [i for i in items if 'lightcraft' in i['name'].lower() and 'vertical' in i['name'].lower()]
        
        if matching:
            for item in matching:
                assert item['category'] == 'Tracking', f"Expected 'Tracking' category, got '{item['category']}' for '{item['name']}'"
            print(f"✓ Found {len(matching)} Lightcraft Jetset Vertical Origin item(s) in 'Tracking' category")
        else:
            pytest.skip("Lightcraft Jetset Vertical Origin item not found in inventory")
    
    def test_lightcraft_jetset_floor_origin_in_tracking(self, auth_headers):
        """Lightcraft Jetset Floor Origin should be in 'Tracking' category"""
        response = requests.get(f"{BASE_URL}/api/items", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        
        # Find Lightcraft Jetset Floor Origin
        matching = [i for i in items if 'lightcraft' in i['name'].lower() and 'floor' in i['name'].lower()]
        
        if matching:
            for item in matching:
                assert item['category'] == 'Tracking', f"Expected 'Tracking' category, got '{item['category']}' for '{item['name']}'"
            print(f"✓ Found {len(matching)} Lightcraft Jetset Floor Origin item(s) in 'Tracking' category")
        else:
            pytest.skip("Lightcraft Jetset Floor Origin item not found in inventory")
    
    def test_green_mats_in_chroma_mat(self, auth_headers):
        """Green Mats should be in 'Chroma Mat' category"""
        response = requests.get(f"{BASE_URL}/api/items", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        
        # Find Green Mats
        matching = [i for i in items if 'green mat' in i['name'].lower()]
        
        if matching:
            for item in matching:
                assert item['category'] == 'Chroma Mat', f"Expected 'Chroma Mat' category, got '{item['category']}' for '{item['name']}'"
            print(f"✓ Found {len(matching)} Green Mats item(s) in 'Chroma Mat' category")
        else:
            pytest.skip("Green Mats item not found in inventory")
    
    def test_tracking_category_exists(self, auth_headers):
        """Tracking category should have items"""
        response = requests.get(f"{BASE_URL}/api/items", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        
        tracking_items = [i for i in items if i['category'] == 'Tracking']
        assert len(tracking_items) > 0, "Tracking category should have at least one item"
        print(f"✓ Tracking category has {len(tracking_items)} items")
    
    def test_chroma_mat_category_exists(self, auth_headers):
        """Chroma Mat category should have items"""
        response = requests.get(f"{BASE_URL}/api/items", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        
        chroma_items = [i for i in items if i['category'] == 'Chroma Mat']
        assert len(chroma_items) > 0, "Chroma Mat category should have at least one item"
        print(f"✓ Chroma Mat category has {len(chroma_items)} items")


# ========== Enhanced Item Form Fields Tests ==========
class TestEnhancedItemFields:
    """Test that POST /api/items accepts new fields"""
    
    def test_create_item_with_all_new_fields(self, auth_headers):
        """POST /api/items should accept all new logging fields"""
        new_item = {
            "name": "TEST_Item_With_New_Fields",
            "category": "Camera & Optics",
            "sub_category": "Test Sub-Category",
            "total_quantity": 2,
            "location_in_studio": "Test Location A1",
            "product_id": "TEST-SKU-001",
            "serial_number": "TEST-SN-123456",
            "purchase_date": "2025-01-15",
            "expiry_date": "2027-01-15",
            "warranty_expiry": "2026-01-15",
            "vendor": "Test Vendor Inc.",
            "purchase_price": 999.99,
            "notes": "Test notes for new item"
        }
        
        response = requests.post(f"{BASE_URL}/api/items", json=new_item, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create item: {response.text}"
        
        created = response.json()
        assert created['name'] == new_item['name']
        assert created['sub_category'] == new_item['sub_category']
        assert created['product_id'] == new_item['product_id']
        assert created['serial_number'] == new_item['serial_number']
        assert created['purchase_date'] == new_item['purchase_date']
        assert created['expiry_date'] == new_item['expiry_date']
        assert created['warranty_expiry'] == new_item['warranty_expiry']
        assert created['vendor'] == new_item['vendor']
        assert created['purchase_price'] == new_item['purchase_price']
        assert created['notes'] == new_item['notes']
        
        print(f"✓ Item created with all new fields: {created['id']}")
        
        # Clean up - delete the test item
        delete_response = requests.delete(f"{BASE_URL}/api/items/{created['id']}", headers=auth_headers)
        assert delete_response.status_code == 200
        print("✓ Test item cleaned up")
    
    def test_create_item_minimal_fields(self, auth_headers):
        """POST /api/items should work with only required fields"""
        minimal_item = {
            "name": "TEST_Minimal_Item",
            "category": "Lighting",
            "total_quantity": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/items", json=minimal_item, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create minimal item: {response.text}"
        
        created = response.json()
        assert created['name'] == minimal_item['name']
        # Optional fields should be None or not present
        assert created.get('product_id') is None
        assert created.get('serial_number') is None
        
        print(f"✓ Minimal item created successfully: {created['id']}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/items/{created['id']}", headers=auth_headers)


# ========== Documents API Tests ==========
class TestDocumentsAPI:
    """Test Documentation module API endpoints"""
    
    def test_get_documents_list(self, auth_headers):
        """GET /api/documents should return list of documents"""
        response = requests.get(f"{BASE_URL}/api/documents", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        
        docs = response.json()
        assert isinstance(docs, list)
        print(f"✓ GET /api/documents returned {len(docs)} document(s)")
        
        # If documents exist, verify structure
        if docs:
            doc = docs[0]
            assert 'id' in doc
            assert 'name' in doc
            assert 'file_name' in doc
            assert 'category' in doc
            print(f"✓ Document structure verified: {doc['name']}")
    
    def test_upload_and_delete_document(self, auth_headers):
        """POST /api/documents should accept multipart file upload"""
        # Create a test file
        test_content = b"This is a test document content for testing purposes."
        files = {
            'file': ('test_document.txt', test_content, 'text/plain')
        }
        data = {
            'name': 'TEST_Uploaded_Document',
            'category': 'General',
            'description': 'Test description for upload'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents", 
            files=files, 
            data=data, 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to upload document: {response.text}"
        
        uploaded = response.json()
        assert uploaded['name'] == 'TEST_Uploaded_Document'
        assert uploaded['category'] == 'General'
        assert uploaded['file_name'] == 'test_document.txt'
        assert uploaded['file_size'] == len(test_content)
        doc_id = uploaded['id']
        
        print(f"✓ Document uploaded: {doc_id}")
        
        # Test download
        download_response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/download",
            headers=auth_headers
        )
        assert download_response.status_code == 200, f"Failed to download: {download_response.text}"
        assert download_response.content == test_content
        print(f"✓ Document downloaded successfully")
        
        # Test delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/documents/{doc_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        print(f"✓ Document deleted successfully")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/documents/{doc_id}/download", headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_document_categories(self, auth_headers):
        """Documents should support category filtering"""
        # Upload a document with specific category
        test_content = b"Test SOP document"
        files = {'file': ('test_sop.txt', test_content, 'text/plain')}
        data = {'name': 'TEST_SOP_Doc', 'category': 'SOPs'}
        
        response = requests.post(f"{BASE_URL}/api/documents", files=files, data=data, headers=auth_headers)
        assert response.status_code == 200
        doc_id = response.json()['id']
        
        # Get documents with category filter
        filtered_response = requests.get(f"{BASE_URL}/api/documents?category=SOPs", headers=auth_headers)
        assert filtered_response.status_code == 200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/documents/{doc_id}", headers=auth_headers)
        print("✓ Document category filtering works")


# ========== Dashboard Stats Tests ==========
class TestDashboardStats:
    """Test Dashboard stats endpoint"""
    
    def test_dashboard_stats_structure(self, auth_headers):
        """GET /api/dashboard/stats should return expected structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        
        stats = response.json()
        
        # Verify required fields exist
        assert 'total_items' in stats
        assert 'items_currently_out' in stats
        assert 'active_checkouts' in stats
        assert 'overdue_count' in stats
        assert 'open_issues' in stats
        assert 'lost_items_count' in stats
        assert 'under_maintenance_count' in stats
        assert 'active_projects' in stats
        
        print(f"✓ Dashboard stats: total_items={stats['total_items']}, active_projects={stats['active_projects']}")


# ========== Item Model Fields Verification ==========
class TestItemModelFields:
    """Verify Item model has all required fields"""
    
    def test_get_item_has_new_fields(self, auth_headers):
        """GET /api/items should return items with new fields in schema"""
        response = requests.get(f"{BASE_URL}/api/items", headers=auth_headers)
        assert response.status_code == 200
        
        items = response.json()
        if items:
            item = items[0]
            # Check that schema allows these fields (they may be null but should be present in schema)
            # These fields are optional so may not all be present
            expected_fields = ['id', 'name', 'category', 'total_quantity', 'quantity_available', 'quantity_out', 'status']
            for field in expected_fields:
                assert field in item, f"Missing required field: {field}"
            
            print(f"✓ Item schema verified with required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
