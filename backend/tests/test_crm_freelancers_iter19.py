"""
Test CRM and Freelancers Module - Iteration 19
Testing the full CRM system with lead management and Freelancer expense tracking

Features tested:
- CRM Dashboard with stats
- Lead management (CRUD, scoring, activity logging, at-risk flags)
- Client management with onboarding checklist
- Lead to Client conversion
- Freelancer expense tracking (admin-only)
- Freelancer payment recording
- Freelancer dashboard
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "sanat@machvisuals.com"
ADMIN_PASSWORD = "MachAdmin@2026"
USER_EMAIL = "testcalc@machvisuals.com"
USER_PASSWORD = "Test1234!"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get regular user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
    
    def test_user_login(self):
        """Test regular user login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ User login successful, role: {data['user']['role']}")


class TestCRMDashboard:
    """CRM Dashboard endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_crm_dashboard_loads(self):
        """Test CRM dashboard endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/crm/dashboard", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard has required fields
        assert "leads_this_month" in data
        assert "conversion_rate" in data
        assert "pipeline_value" in data
        assert "total_clients" in data
        assert "by_status" in data
        assert "by_source" in data
        assert "at_risk" in data
        assert "needs_attention" in data
        
        print(f"✓ Dashboard loaded: {data['total_leads']} leads, {data['total_clients']} clients")
        print(f"  - Leads this month: {data['leads_this_month']}")
        print(f"  - Conversion rate: {data['conversion_rate']}%")
        print(f"  - Pipeline value: {data['pipeline_value']}")
        print(f"  - At risk: {data['at_risk']}, Needs attention: {data['needs_attention']}")


class TestCRMLeads:
    """CRM Lead management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
        self.test_lead_id = None
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_lead_with_all_fields(self):
        """Test creating a lead with all form fields"""
        lead_data = {
            "name": "TEST_John Smith",
            "company": "TEST_Acme Productions",
            "email": "john.smith@acmeproductions.com",
            "phone": "+91 9876543210",
            "source": "LinkedIn",
            "service_interested": "Virtual Production",
            "budget": 500000,
            "urgency": "High",
            "follow_up_date": "2026-02-01",
            "assigned_to": "Sales Team",
            "notes": "Test lead for iteration 19"
        }
        
        response = requests.post(f"{BASE_URL}/api/crm/leads", json=lead_data, headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        data = response.json()
        
        # Verify all fields saved correctly
        assert data["name"] == lead_data["name"]
        assert data["company"] == lead_data["company"]
        assert data["email"] == lead_data["email"]
        assert data["phone"] == lead_data["phone"]
        assert data["source"] == lead_data["source"]
        assert data["service_interested"] == lead_data["service_interested"]
        assert data["budget"] == lead_data["budget"]
        assert data["urgency"] == lead_data["urgency"]
        assert data["assigned_to"] == lead_data["assigned_to"]
        assert data["notes"] == lead_data["notes"]
        assert "id" in data
        
        # Store for later cleanup
        self.__class__.test_lead_id = data["id"]
        print(f"✓ Lead created with ID: {data['id']}")
    
    def test_lead_score_calculation_high_budget_high_urgency(self):
        """Test lead score calculation - High budget (>500k) + High urgency = 50"""
        lead_data = {
            "name": "TEST_High Score Lead",
            "budget": 600000,  # > 500k = 30 points
            "urgency": "High"  # = 30 points = total 60
        }
        
        response = requests.post(f"{BASE_URL}/api/crm/leads", json=lead_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Score = 30 (budget > 500k) + 30 (urgency high) = 60
        # Note: The implementation shows score > 500k = 30, high urgency = 30
        assert data["score"] == 60, f"Expected score 60, got {data['score']}"
        print(f"✓ Lead score calculated correctly: {data['score']}")
        
        # Cleanup
        self.__class__.test_high_score_lead_id = data["id"]
    
    def test_get_leads_list(self):
        """Test fetching leads list with at-risk flags"""
        response = requests.get(f"{BASE_URL}/api/crm/leads", headers=self.admin_headers)
        assert response.status_code == 200
        leads = response.json()
        assert isinstance(leads, list)
        
        # Check leads have required computed fields
        if leads:
            lead = leads[0]
            assert "hours_inactive" in lead
            assert "at_risk" in lead
            assert "needs_attention" in lead
            print(f"✓ Retrieved {len(leads)} leads with activity flags")
    
    def test_update_lead_status(self):
        """Test updating lead status from New to Contacted"""
        # First create a lead
        create_response = requests.post(f"{BASE_URL}/api/crm/leads", json={
            "name": "TEST_Status Update Lead"
        }, headers=self.admin_headers)
        lead_id = create_response.json()["id"]
        
        # Update status
        update_data = {"status": "Contacted"}
        response = requests.patch(f"{BASE_URL}/api/crm/leads/{lead_id}", json=update_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "Contacted"
        print(f"✓ Lead status updated to: {data['status']}")
        
        # Store for cleanup
        self.__class__.test_status_lead_id = lead_id
    
    def test_activity_log_tracks_changes(self):
        """Test activity log is updated when lead is modified"""
        # Create a lead
        create_response = requests.post(f"{BASE_URL}/api/crm/leads", json={
            "name": "TEST_Activity Log Lead"
        }, headers=self.admin_headers)
        lead_id = create_response.json()["id"]
        
        # Update it
        requests.patch(f"{BASE_URL}/api/crm/leads/{lead_id}", json={"status": "Qualified"}, headers=self.admin_headers)
        
        # Fetch and check activity log
        get_response = requests.get(f"{BASE_URL}/api/crm/leads", headers=self.admin_headers)
        leads = get_response.json()
        lead = next((l for l in leads if l["id"] == lead_id), None)
        
        assert lead is not None
        assert "activity_log" in lead
        assert len(lead["activity_log"]) >= 2  # Creation + status change
        
        # Check activity log has timestamps
        for activity in lead["activity_log"]:
            assert "action" in activity
            assert "at" in activity
            assert "by" in activity
        
        print(f"✓ Activity log has {len(lead['activity_log'])} entries with timestamps")
        self.__class__.test_activity_lead_id = lead_id


class TestCRMClients:
    """CRM Client management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_client(self):
        """Test creating a client with all fields"""
        client_data = {
            "company_name": "TEST_Client Corp",
            "industry": "Entertainment",
            "contact_person": "Jane Doe",
            "designation": "Producer",
            "email": "jane@testclient.com",
            "phone": "+91 9876543211",
            "address": "123 Test Street, Mumbai",
            "gst_number": "27AADCT1234A1Z5",
            "client_type": "Brand",
            "notes": "Test client for iteration 19"
        }
        
        response = requests.post(f"{BASE_URL}/api/crm/clients", json=client_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["company_name"] == client_data["company_name"]
        assert "id" in data
        
        # Check onboarding checklist is initialized
        assert "onboarding" in data
        assert data["onboarding"]["welcome_email"] == False
        assert data["onboarding"]["contract_signed"] == False
        assert data["onboarding"]["advance_received"] == False
        assert data["onboarding"]["brief_received"] == False
        assert data["onboarding"]["kickoff_scheduled"] == False
        
        print(f"✓ Client created with ID: {data['id']}")
        self.__class__.test_client_id = data["id"]
    
    def test_onboarding_checkbox_toggle(self):
        """Test toggling onboarding checklist items"""
        # First create a client
        create_response = requests.post(f"{BASE_URL}/api/crm/clients", json={
            "company_name": "TEST_Onboarding Client"
        }, headers=self.admin_headers)
        client_id = create_response.json()["id"]
        
        # Toggle welcome_email to true
        response = requests.patch(
            f"{BASE_URL}/api/crm/clients/{client_id}/onboarding?step=welcome_email&value=true",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboarding"]["welcome_email"] == True
        
        # Toggle contract_signed to true
        response = requests.patch(
            f"{BASE_URL}/api/crm/clients/{client_id}/onboarding?step=contract_signed&value=true",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboarding"]["contract_signed"] == True
        
        # Check percentage would be 40% (2 of 5)
        completed = sum([
            data["onboarding"]["welcome_email"],
            data["onboarding"]["contract_signed"],
            data["onboarding"]["advance_received"],
            data["onboarding"]["brief_received"],
            data["onboarding"]["kickoff_scheduled"]
        ])
        pct = round((completed / 5) * 100)
        assert pct == 40
        print(f"✓ Onboarding toggle works, {completed}/5 complete = {pct}%")
        
        self.__class__.test_onboarding_client_id = client_id
    
    def test_convert_lead_to_client(self):
        """Test converting a lead to client sets lead status to Won"""
        # Create a lead first
        lead_response = requests.post(f"{BASE_URL}/api/crm/leads", json={
            "name": "TEST_ConvertToClient",
            "company": "Convert Corp"
        }, headers=self.admin_headers)
        lead_id = lead_response.json()["id"]
        
        # Create client with lead_id reference
        client_data = {
            "company_name": "TEST_ConvertedClient Corp",
            "contact_person": "John ConvertTest",
            "lead_id": lead_id
        }
        
        client_response = requests.post(f"{BASE_URL}/api/crm/clients", json=client_data, headers=self.admin_headers)
        assert client_response.status_code == 200
        
        # Verify lead status changed to Won
        leads = requests.get(f"{BASE_URL}/api/crm/leads", headers=self.admin_headers).json()
        lead = next((l for l in leads if l["id"] == lead_id), None)
        
        assert lead is not None
        assert lead["status"] == "Won"
        
        # Check activity log has conversion entry
        conversion_activity = [a for a in lead.get("activity_log", []) if "Converted" in a.get("action", "")]
        assert len(conversion_activity) > 0
        
        print(f"✓ Lead converted to client, status changed to Won")
        self.__class__.test_convert_lead_id = lead_id
        self.__class__.test_converted_client_id = client_response.json()["id"]


class TestFreelancersAccessControl:
    """Test Freelancer endpoints are admin-only"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL, "password": USER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_freelancers_returns_403_for_regular_user(self, user_token):
        """Test regular user gets 403 on /api/freelancers"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/freelancers", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to freelancers endpoint")
    
    def test_freelancers_returns_200_for_admin(self, admin_token):
        """Test admin can access /api/freelancers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/freelancers", headers=headers)
        assert response.status_code == 200
        print(f"✓ Admin can access freelancers: {len(response.json())} freelancers found")
    
    def test_freelancer_payments_returns_403_for_regular_user(self, user_token):
        """Test regular user gets 403 on /api/freelancer-payments"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/freelancer-payments", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to freelancer payments")
    
    def test_freelancer_dashboard_returns_403_for_regular_user(self, user_token):
        """Test regular user gets 403 on /api/freelancer-dashboard"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/freelancer-dashboard", headers=headers)
        assert response.status_code == 403
        print("✓ Regular user correctly denied access to freelancer dashboard")


class TestFreelancerCRUD:
    """Test Freelancer CRUD operations - admin only"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_freelancer_with_motion_capture(self):
        """Test creating freelancer with Motion Capture service type"""
        freelancer_data = {
            "full_name": "TEST_Motion Capture Artist",
            "phone": "+91 9988776655",
            "email": "mocap@test.com",
            "city": "Mumbai",
            "portfolio_url": "https://portfolio.test.com",
            "service_types": ["Motion Capture", "3D Animation", "Rigging"],
            "rate_type": "per_day",
            "standard_rate": 15000,
            "availability": "Available",
            "internal_notes": "Test freelancer for iteration 19"
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancers", json=freelancer_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["full_name"] == freelancer_data["full_name"]
        assert "Motion Capture" in data["service_types"]
        assert data["rate_type"] == "per_day"
        assert data["standard_rate"] == 15000
        assert "id" in data
        assert data.get("total_paid") == 0
        assert data.get("projects_count") == 0
        
        print(f"✓ Freelancer created with Motion Capture: {data['id']}")
        self.__class__.test_freelancer_id = data["id"]
    
    def test_create_freelancer_per_shot_rate(self):
        """Test creating freelancer with per-shot rate type"""
        freelancer_data = {
            "full_name": "TEST_VFX Artist Per Shot",
            "service_types": ["Compositing (Nuke)", "Rotoscoping"],
            "rate_type": "per_shot",
            "standard_rate": 5000,
            "availability": "Busy"
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancers", json=freelancer_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["rate_type"] == "per_shot"
        print(f"✓ Freelancer with per_shot rate created: {data['id']}")
        self.__class__.test_per_shot_freelancer_id = data["id"]
    
    def test_create_freelancer_per_project_rate(self):
        """Test creating freelancer with per-project rate type"""
        freelancer_data = {
            "full_name": "TEST_Editor Per Project",
            "service_types": ["Video Editing", "Colour Grading"],
            "rate_type": "per_project",
            "standard_rate": 50000,
            "availability": "On Hold"
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancers", json=freelancer_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["rate_type"] == "per_project"
        print(f"✓ Freelancer with per_project rate created: {data['id']}")
        self.__class__.test_per_project_freelancer_id = data["id"]


class TestFreelancerPayments:
    """Test Freelancer payment recording and totals"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_record_payment_for_freelancer(self):
        """Test recording a payment against a freelancer for a project"""
        # First create a freelancer
        fl_response = requests.post(f"{BASE_URL}/api/freelancers", json={
            "full_name": "TEST_Payment Test Freelancer",
            "service_types": ["Video Editing"],
            "rate_type": "per_day",
            "standard_rate": 10000
        }, headers=self.admin_headers)
        freelancer_id = fl_response.json()["id"]
        
        # Record a payment
        payment_data = {
            "freelancer_id": freelancer_id,
            "project_name": "TEST_Project Alpha",
            "description": "5 days of editing work",
            "amount_charged": 50000,
            "amount_paid": 50000,
            "payment_date": "2026-01-15",
            "status": "Paid"
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancer-payments", json=payment_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["amount_charged"] == 50000
        assert data["amount_paid"] == 50000
        assert data["status"] == "Paid"
        print(f"✓ Payment recorded: {data['id']}")
        
        self.__class__.test_payment_freelancer_id = freelancer_id
        self.__class__.test_payment_id = data["id"]
    
    def test_freelancer_totals_update_after_payment(self):
        """Test freelancer total_paid and projects_count update after payment"""
        # Use freelancer from previous test
        if not hasattr(self.__class__, 'test_payment_freelancer_id'):
            pytest.skip("Requires payment test to run first")
        
        # Get freelancers list and find ours
        response = requests.get(f"{BASE_URL}/api/freelancers", headers=self.admin_headers)
        freelancers = response.json()
        fl = next((f for f in freelancers if f["id"] == self.__class__.test_payment_freelancer_id), None)
        
        assert fl is not None
        assert fl["total_paid"] == 50000  # From previous payment
        assert fl["projects_count"] == 1
        print(f"✓ Freelancer totals updated: total_paid={fl['total_paid']}, projects={fl['projects_count']}")
    
    def test_record_partial_payment(self):
        """Test recording a partial payment"""
        # Create freelancer
        fl_response = requests.post(f"{BASE_URL}/api/freelancers", json={
            "full_name": "TEST_Partial Payment Freelancer",
            "service_types": ["Sound Design"]
        }, headers=self.admin_headers)
        freelancer_id = fl_response.json()["id"]
        
        # Record partial payment
        payment_data = {
            "freelancer_id": freelancer_id,
            "project_name": "TEST_Project Beta",
            "description": "Partial advance",
            "amount_charged": 30000,
            "amount_paid": 15000,
            "payment_date": "2026-01-20",
            "status": "Partial"
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancer-payments", json=payment_data, headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "Partial"
        assert data["amount_charged"] == 30000
        assert data["amount_paid"] == 15000
        print(f"✓ Partial payment recorded: charged={data['amount_charged']}, paid={data['amount_paid']}")
        
        self.__class__.test_partial_payment_fl_id = freelancer_id


class TestFreelancerDashboard:
    """Test Freelancer Dashboard aggregations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_dashboard_returns_correct_structure(self):
        """Test freelancer dashboard has all required fields"""
        response = requests.get(f"{BASE_URL}/api/freelancer-dashboard", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_spent" in data
        assert "total_charged" in data
        assert "total_freelancers" in data
        assert "total_payments" in data
        assert "project_summary" in data
        
        print(f"✓ Dashboard: total_spent={data['total_spent']}, freelancers={data['total_freelancers']}")
        print(f"  - Total charged: {data['total_charged']}")
        print(f"  - Total payments: {data['total_payments']}")
        
        if data["project_summary"]:
            print(f"  - Project-wise spending: {len(data['project_summary'])} projects")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_freelancers(self):
        """Remove TEST_ prefixed freelancers"""
        response = requests.get(f"{BASE_URL}/api/freelancers", headers=self.admin_headers)
        if response.status_code == 200:
            for fl in response.json():
                if fl["full_name"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/freelancers/{fl['id']}", headers=self.admin_headers)
                    print(f"  Deleted freelancer: {fl['full_name']}")
        print("✓ Test freelancers cleaned up")
    
    def test_cleanup_test_leads(self):
        """Remove TEST_ prefixed leads (by checking name)"""
        # Note: No delete endpoint for leads in the implementation
        # Just logging what would need cleanup
        response = requests.get(f"{BASE_URL}/api/crm/leads", headers=self.admin_headers)
        if response.status_code == 200:
            test_leads = [l for l in response.json() if l.get("name", "").startswith("TEST_")]
            print(f"  Found {len(test_leads)} test leads (no delete endpoint available)")
        print("✓ Test leads logged")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
