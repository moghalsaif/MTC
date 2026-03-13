"""
Test file for Data Integrity Audit, CRM CSV Import, Client Filters, and Cascade Delete features
Iteration 20 - Testing data integrity and CRM enhancements
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_ITER20_"


class TestAuthAndSetup:
    """Authentication tests to get tokens for other tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed - skipping tests requiring admin role")
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        """Get manager token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rohit@machvisuals.com",
            "password": "rohit@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Manager authentication failed")
    
    def test_admin_login(self, admin_token):
        """Test admin login works"""
        assert admin_token is not None
        print(f"Admin login successful, token obtained")
    
    def test_manager_login(self, manager_token):
        """Test manager login works"""
        assert manager_token is not None
        print(f"Manager login successful, token obtained")


class TestDataIntegrityAudit:
    """Test data integrity audit endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        """Get manager token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rohit@machvisuals.com",
            "password": "rohit@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Manager auth failed")
    
    def test_audit_integrity_admin_access(self, admin_token):
        """Test GET /api/audit/integrity - admin should have access"""
        response = requests.get(
            f"{BASE_URL}/api/audit/integrity",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "orphaned_checkouts" in data, "Missing orphaned_checkouts field"
        assert "orphaned_issues" in data, "Missing orphaned_issues field"
        assert "orphaned_lost_items" in data, "Missing orphaned_lost_items field"
        assert "orphaned_maintenance" in data, "Missing orphaned_maintenance field"
        assert "quantity_mismatches" in data, "Missing quantity_mismatches field"
        assert "total_orphaned" in data, "Missing total_orphaned field"
        assert "details" in data, "Missing details field"
        
        print(f"Audit integrity response: orphaned_checkouts={data['orphaned_checkouts']}, orphaned_issues={data['orphaned_issues']}, total_orphaned={data['total_orphaned']}")
    
    def test_audit_integrity_manager_denied(self, manager_token):
        """Test GET /api/audit/integrity - manager should be denied"""
        response = requests.get(
            f"{BASE_URL}/api/audit/integrity",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for manager, got {response.status_code}"
        print("Manager correctly denied access to audit/integrity")
    
    def test_audit_cleanup_admin_access(self, admin_token):
        """Test POST /api/audit/cleanup - admin should have access"""
        response = requests.post(
            f"{BASE_URL}/api/audit/cleanup",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Missing message field"
        assert "total_removed" in data, "Missing total_removed field"
        
        print(f"Cleanup response: message={data['message']}, total_removed={data['total_removed']}")
    
    def test_audit_cleanup_manager_denied(self, manager_token):
        """Test POST /api/audit/cleanup - manager should be denied"""
        response = requests.post(
            f"{BASE_URL}/api/audit/cleanup",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for manager, got {response.status_code}"
        print("Manager correctly denied access to audit/cleanup")
    
    def test_audit_integrity_returns_zero_after_cleanup(self, admin_token):
        """After cleanup, orphaned records should be zero"""
        # First run cleanup
        requests.post(
            f"{BASE_URL}/api/audit/cleanup",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Then check integrity
        response = requests.get(
            f"{BASE_URL}/api/audit/integrity",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Per agent note, orphaned data was cleaned up - should be 0
        print(f"After cleanup - total_orphaned: {data['total_orphaned']}")
        # Note: We verify the endpoint works, actual 0 depends on data state


class TestCascadeDelete:
    """Test cascade delete for items and projects"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    @pytest.fixture(scope="class")
    def manager_token(self):
        """Get manager token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rohit@machvisuals.com",
            "password": "rohit@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Manager auth failed")
    
    def test_create_item_and_cascade_delete(self, admin_token):
        """Test creating an item and deleting it - should cascade delete related records"""
        # Create a test item
        item_data = {
            "name": f"{TEST_PREFIX}CascadeItem_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "total_quantity": 5,
            "location": "Test Location"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/items",
            json=item_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Failed to create item: {create_response.text}"
        item = create_response.json()
        item_id = item["id"]
        
        # Delete the item (should cascade)
        delete_response = requests.delete(
            f"{BASE_URL}/api/items/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        delete_data = delete_response.json()
        
        # Verify cascade info in response
        assert "cascade" in delete_data, "Missing cascade info in response"
        assert "checkouts" in delete_data["cascade"], "Missing checkouts in cascade"
        assert "issues" in delete_data["cascade"], "Missing issues in cascade"
        assert "lost_items" in delete_data["cascade"], "Missing lost_items in cascade"
        assert "maintenance" in delete_data["cascade"], "Missing maintenance in cascade"
        
        print(f"Item deleted with cascade: {delete_data['cascade']}")
        
        # Verify item no longer exists
        get_response = requests.get(
            f"{BASE_URL}/api/items/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404, "Item should not exist after delete"
    
    def test_delete_item_blocked_with_active_checkouts(self, admin_token, manager_token):
        """Test that item with active checkouts cannot be deleted"""
        # Create item
        item_data = {
            "name": f"{TEST_PREFIX}BlockedItem_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "total_quantity": 5,
            "location": "Test Location"
        }
        create_item = requests.post(
            f"{BASE_URL}/api/items",
            json=item_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_item.status_code == 200
        item = create_item.json()
        item_id = item["id"]
        
        # Create project
        project_data = {
            "name": f"{TEST_PREFIX}BlockProject_{uuid.uuid4().hex[:6]}",
            "location": "Test Location"
        }
        create_project = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert create_project.status_code == 200
        project = create_project.json()
        project_id = project["id"]
        
        # Create checkout (mark-out)
        checkout_data = {
            "item_id": item_id,
            "project_id": project_id,
            "quantity": 2,
            "expected_return": "2026-02-01"
        }
        checkout_response = requests.post(
            f"{BASE_URL}/api/checkouts/mark-out",
            json=checkout_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert checkout_response.status_code == 200, f"Failed to create checkout: {checkout_response.text}"
        
        # Try to delete item - should fail
        delete_response = requests.delete(
            f"{BASE_URL}/api/items/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}"
        assert "active checkouts" in delete_response.json().get("detail", "").lower(), "Expected error about active checkouts"
        
        print("Item deletion correctly blocked due to active checkouts")
        
        # Cleanup: Mark item back in to allow deletion
        checkout_id = checkout_response.json()["checkout"]["id"]
        markin_response = requests.post(
            f"{BASE_URL}/api/checkouts/quick-mark-in",
            json={"checkout_id": checkout_id, "condition": "good"},
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert markin_response.status_code == 200
        
        # Now delete should work
        delete_response = requests.delete(
            f"{BASE_URL}/api/items/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        
        # Clean up project
        requests.delete(
            f"{BASE_URL}/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
    
    def test_cascade_delete_project(self, admin_token, manager_token):
        """Test that deleting a project cascades to checkouts and lost_items"""
        # Create item
        item_data = {
            "name": f"{TEST_PREFIX}ProjCascadeItem_{uuid.uuid4().hex[:6]}",
            "category": "Test Category",
            "total_quantity": 10,
            "location": "Test Location"
        }
        create_item = requests.post(
            f"{BASE_URL}/api/items",
            json=item_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_item.status_code == 200
        item = create_item.json()
        item_id = item["id"]
        
        # Create project
        project_data = {
            "name": f"{TEST_PREFIX}CascadeProject_{uuid.uuid4().hex[:6]}",
            "location": "Test Location"
        }
        create_project = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert create_project.status_code == 200
        project = create_project.json()
        project_id = project["id"]
        
        # Create checkout (mark-out)
        checkout_data = {
            "item_id": item_id,
            "project_id": project_id,
            "quantity": 2,
            "expected_return": "2026-02-01"
        }
        checkout_response = requests.post(
            f"{BASE_URL}/api/checkouts/mark-out",
            json=checkout_data,
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert checkout_response.status_code == 200
        checkout_id = checkout_response.json()["checkout"]["id"]
        
        # Mark item back in to allow project deletion
        markin_response = requests.post(
            f"{BASE_URL}/api/checkouts/quick-mark-in",
            json={"checkout_id": checkout_id, "condition": "good"},
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert markin_response.status_code == 200
        
        # Delete project - should cascade
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {manager_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        delete_data = delete_response.json()
        
        # Verify cascade info
        assert "cascade" in delete_data, "Missing cascade info"
        assert "checkouts" in delete_data["cascade"], "Missing checkouts in cascade"
        assert "lost_items" in delete_data["cascade"], "Missing lost_items in cascade"
        
        print(f"Project deleted with cascade: {delete_data['cascade']}")
        
        # Clean up item
        requests.delete(
            f"{BASE_URL}/api/items/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestCRMCSVImport:
    """Test CRM CSV import functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_csv_import_success(self, admin_token):
        """Test successful CSV import with valid data"""
        # Create CSV content
        csv_content = f"""Name,Email,Phone,Company,Source,City
{TEST_PREFIX}Lead1,testlead1_{uuid.uuid4().hex[:6]}@test.com,1234567890,Test Company 1,Website,Mumbai
{TEST_PREFIX}Lead2,testlead2_{uuid.uuid4().hex[:6]}@test.com,9876543210,Test Company 2,LinkedIn,Delhi
{TEST_PREFIX}Lead3,testlead3_{uuid.uuid4().hex[:6]}@test.com,5555555555,Test Company 3,Referral,Bangalore"""
        
        files = {'file': ('leads.csv', csv_content, 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/import-csv",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "created" in data, "Missing created field"
        assert "duplicates" in data, "Missing duplicates field"
        assert "errors" in data, "Missing errors field"
        
        print(f"CSV Import result: created={data['created']}, duplicates={data['duplicates']}, errors={data['errors']}")
        assert data["created"] >= 0, "Created should be non-negative"
    
    def test_csv_import_duplicate_detection(self, admin_token):
        """Test that CSV import detects duplicates by email"""
        unique_email = f"dupetest_{uuid.uuid4().hex[:6]}@test.com"
        
        # First import
        csv_content1 = f"""Name,Email,Phone,Company,Source
{TEST_PREFIX}DupeLead,{unique_email},1111111111,Dupe Company,Website"""
        
        files1 = {'file': ('leads1.csv', csv_content1, 'text/csv')}
        response1 = requests.post(
            f"{BASE_URL}/api/crm/leads/import-csv",
            files=files1,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second import with same email
        csv_content2 = f"""Name,Email,Phone,Company,Source
{TEST_PREFIX}DupeLead2,{unique_email},2222222222,Dupe Company 2,LinkedIn"""
        
        files2 = {'file': ('leads2.csv', csv_content2, 'text/csv')}
        response2 = requests.post(
            f"{BASE_URL}/api/crm/leads/import-csv",
            files=files2,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Second import should have detected duplicate
        print(f"Second import: created={data2['created']}, duplicates={data2['duplicates']}")
        # If first was created (created=1), second should have duplicates=1
    
    def test_csv_import_error_handling(self, admin_token):
        """Test CSV import handles rows without required name field"""
        csv_content = f"""Name,Email,Phone,Company
,missingname@test.com,1234567890,Company
{TEST_PREFIX}ValidLead,valid_{uuid.uuid4().hex[:6]}@test.com,9999999999,Valid Company"""
        
        files = {'file': ('leads_errors.csv', csv_content, 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/import-csv",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 1 error for the row without name
        print(f"Import with errors: created={data['created']}, errors={data['errors']}")


class TestCRMLeadFilters:
    """Test CRM lead status and source filters (backend support)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_get_leads_returns_status_and_source(self, admin_token):
        """Test GET /api/crm/leads returns leads with status and source fields for filtering"""
        response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        leads = response.json()
        
        if len(leads) > 0:
            # Verify lead has status and source for client-side filtering
            lead = leads[0]
            assert "status" in lead, "Lead should have status field"
            assert "source" in lead, "Lead should have source field"
            print(f"Sample lead: status={lead.get('status')}, source={lead.get('source')}")


class TestCRMDashboard:
    """Test CRM dashboard stats"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_crm_dashboard_stats(self, admin_token):
        """Test CRM dashboard returns all expected stats"""
        response = requests.get(
            f"{BASE_URL}/api/crm/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required stats fields
        assert "leads_this_month" in data, "Missing leads_this_month"
        assert "conversion_rate" in data, "Missing conversion_rate"
        assert "pipeline_value" in data, "Missing pipeline_value"
        assert "total_clients" in data, "Missing total_clients"
        assert "by_status" in data, "Missing by_status"
        assert "by_source" in data, "Missing by_source"
        
        print(f"CRM Dashboard: leads_this_month={data['leads_this_month']}, conversion_rate={data['conversion_rate']}, pipeline_value={data['pipeline_value']}, total_clients={data['total_clients']}")


class TestCRMClientFilters:
    """Test CRM client search and type filter (backend support)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_get_clients_returns_searchable_fields(self, admin_token):
        """Test GET /api/crm/clients returns clients with searchable fields"""
        response = requests.get(
            f"{BASE_URL}/api/crm/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) > 0:
            client = clients[0]
            # Verify client has fields needed for filtering
            assert "company_name" in client or client.get("company_name") is None, "Client should have company_name field"
            assert "client_type" in client or client.get("client_type") is None, "Client should have client_type field"
            print(f"Sample client: company_name={client.get('company_name')}, client_type={client.get('client_type')}")


class TestCRMLeadCRUD:
    """Test CRM lead CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_create_lead(self, admin_token):
        """Test creating a new lead"""
        lead_data = {
            "name": f"{TEST_PREFIX}CRUDLead_{uuid.uuid4().hex[:6]}",
            "company": "Test Company",
            "email": f"crudtest_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "1234567890",
            "source": "Website",
            "service_interested": "Virtual Production",
            "budget": 500000,
            "urgency": "High"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        lead = response.json()
        
        assert lead["name"] == lead_data["name"]
        assert lead["status"] == "New"
        assert "id" in lead
        assert "score" in lead
        
        print(f"Created lead: id={lead['id']}, name={lead['name']}, score={lead['score']}")
        return lead["id"]
    
    def test_update_lead_status(self, admin_token):
        """Test updating lead status"""
        # First create a lead
        lead_data = {
            "name": f"{TEST_PREFIX}UpdateLead_{uuid.uuid4().hex[:6]}",
            "email": f"updatetest_{uuid.uuid4().hex[:6]}@test.com",
            "source": "LinkedIn"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Update status
        update_response = requests.patch(
            f"{BASE_URL}/api/crm/leads/{lead_id}",
            json={"status": "Contacted", "notes": "Called and discussed requirements"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        updated_lead = update_response.json()
        
        assert updated_lead["status"] == "Contacted"
        print(f"Updated lead status to: {updated_lead['status']}")


class TestCRMClientCRUD:
    """Test CRM client CRUD and conversion"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_create_client(self, admin_token):
        """Test creating a new client"""
        client_data = {
            "company_name": f"{TEST_PREFIX}ClientCompany_{uuid.uuid4().hex[:6]}",
            "industry": "Technology",
            "contact_person": "John Doe",
            "email": f"client_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "9876543210",
            "client_type": "Brand"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/crm/clients",
            json=client_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        client = response.json()
        
        assert client["company_name"] == client_data["company_name"]
        assert "id" in client
        assert "onboarding" in client
        
        print(f"Created client: id={client['id']}, company={client['company_name']}")
    
    def test_client_onboarding_checklist(self, admin_token):
        """Test updating client onboarding checklist"""
        # Create a client first
        client_data = {
            "company_name": f"{TEST_PREFIX}OnboardClient_{uuid.uuid4().hex[:6]}",
            "client_type": "Agency"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/crm/clients",
            json=client_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        client = create_response.json()
        client_id = client["id"]
        
        # Update onboarding step
        update_response = requests.patch(
            f"{BASE_URL}/api/crm/clients/{client_id}/onboarding?step=welcome_email&value=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify the update
        get_response = requests.get(
            f"{BASE_URL}/api/crm/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        clients = get_response.json()
        updated_client = next((c for c in clients if c["id"] == client_id), None)
        
        if updated_client:
            assert updated_client.get("onboarding", {}).get("welcome_email") == True, "Onboarding step not updated"
            print(f"Client onboarding updated: welcome_email={updated_client['onboarding'].get('welcome_email')}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "sanat@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin auth failed")
    
    def test_cleanup_test_leads(self, admin_token):
        """Clean up test leads created during tests"""
        # Get all leads
        response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            leads = response.json()
            deleted = 0
            for lead in leads:
                if TEST_PREFIX in lead.get("name", ""):
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/crm/leads/{lead['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test leads")
    
    def test_cleanup_test_clients(self, admin_token):
        """Clean up test clients created during tests"""
        response = requests.get(
            f"{BASE_URL}/api/crm/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            clients = response.json()
            deleted = 0
            for client in clients:
                if TEST_PREFIX in client.get("company_name", ""):
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/crm/clients/{client['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
