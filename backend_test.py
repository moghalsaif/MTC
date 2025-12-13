import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class EquipmentTrackerAPITester:
    def __init__(self, base_url="https://prod-inventory-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage for specific features
        self.test_project_a_id = None
        self.test_project_b_id = None
        self.test_item_id = None
        self.test_checkout_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_result(name, True)
                    return True, response_data
                except:
                    self.log_result(name, True)
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_result(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_login(self):
        """Test login with provided test credentials"""
        login_data = {
            "email": "testuser@test.com",
            "password": "testpassword"
        }
        
        success, response = self.run_test(
            "Login with test credentials",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        success, _ = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_items(self):
        """Test get all items"""
        success, response = self.run_test(
            "Get All Items",
            "GET",
            "items",
            200
        )
        
        if success:
            print(f"   Found {len(response)} items in inventory")
            return len(response) > 0  # Should have pre-seeded items
        return False

    def test_create_item(self):
        """Test create new item"""
        item_data = {
            "name": "Test Camera",
            "category": "Camera",
            "total_quantity": 5,
            "location_in_studio": "Shelf A1",
            "min_stock": 2
        }
        
        success, response = self.run_test(
            "Create Item",
            "POST",
            "items",
            200,
            data=item_data
        )
        
        if success and 'id' in response:
            self.created_items.append(response['id'])
            return True
        return False

    def test_get_projects(self):
        """Test get all projects"""
        success, response = self.run_test(
            "Get All Projects",
            "GET",
            "projects",
            200
        )
        
        if success:
            print(f"   Found {len(response)} projects")
            return True
        return False

    def test_create_project(self):
        """Test create new project"""
        project_data = {
            "name": "Test Commercial Shoot",
            "location": "Studio B",
            "shoot_dates": "Dec 20-22, 2025",
            "owner": "Test Director",
            "status": "Planning"
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if success and 'id' in response:
            self.created_projects.append(response['id'])
            return True
        return False

    def test_mark_out_flow(self):
        """Test mark out workflow"""
        # First get an available item
        success, items = self.run_test("Get Items for Mark Out", "GET", "items", 200)
        if not success or not items:
            return False
            
        available_item = None
        for item in items:
            if item.get('quantity_available', 0) > 0 and item.get('status') == 'Available':
                available_item = item
                break
        
        if not available_item:
            self.log_result("Mark Out Flow", False, "No available items found")
            return False
        
        # Get a project
        success, projects = self.run_test("Get Projects for Mark Out", "GET", "projects", 200)
        if not success or not projects:
            return False
        
        project = projects[0]
        
        # Mark out the item
        expected_return = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        mark_out_data = {
            "item_id": available_item['id'],
            "project_id": project['id'],
            "quantity": 1,
            "expected_return": expected_return,
            "notes": "Test checkout"
        }
        
        success, response = self.run_test(
            "Mark Out Item",
            "POST",
            "checkouts/mark-out",
            200,
            data=mark_out_data
        )
        
        if success and 'checkout' in response:
            self.created_checkouts.append(response['checkout']['id'])
            return True
        return False

    def test_get_active_checkouts(self):
        """Test get active checkouts"""
        success, response = self.run_test(
            "Get Active Checkouts",
            "GET",
            "checkouts/active",
            200
        )
        
        if success:
            print(f"   Found {len(response)} active checkouts")
            return True
        return False

    def test_mark_in_flow(self):
        """Test mark in workflow"""
        if not self.created_checkouts:
            self.log_result("Mark In Flow", False, "No checkouts to mark in")
            return False
        
        checkout_id = self.created_checkouts[0]
        mark_in_data = {
            "checkout_id": checkout_id,
            "quantity_returned": 1,
            "repack_checklist": {
                "all_parts_present": True,
                "batteries_returned": True,
                "no_damage": True,
                "cables_included": True
            },
            "notes": "Test return",
            "issues": []
        }
        
        success, response = self.run_test(
            "Mark In Item",
            "POST",
            "checkouts/mark-in",
            200,
            data=mark_in_data
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            expected_keys = ['total_items', 'items_currently_out', 'active_checkouts', 'overdue_count', 'open_issues']
            for key in expected_keys:
                if key not in response:
                    self.log_result("Dashboard Stats Structure", False, f"Missing key: {key}")
                    return False
            
            print(f"   Total Items: {response.get('total_items', 0)}")
            print(f"   Items Out: {response.get('items_currently_out', 0)}")
            print(f"   Active Checkouts: {response.get('active_checkouts', 0)}")
            return True
        return False

    def test_issues_flow(self):
        """Test issues workflow"""
        # Get items for issue reporting
        success, items = self.run_test("Get Items for Issue", "GET", "items", 200)
        if not success or not items:
            return False
        
        item = items[0]
        
        # Create issue
        issue_data = {
            "item_id": item['id'],
            "description": "Test issue - camera lens stuck",
            "severity": "Medium",
            "assigned_to": "Tech Team"
        }
        
        success, response = self.run_test(
            "Create Issue",
            "POST",
            "issues",
            200,
            data=issue_data
        )
        
        if not success:
            return False
        
        # Get all issues
        success, issues = self.run_test("Get All Issues", "GET", "issues", 200)
        return success

    def test_maintenance_flow(self):
        """Test maintenance workflow"""
        # Get items for maintenance
        success, items = self.run_test("Get Items for Maintenance", "GET", "items", 200)
        if not success or not items:
            return False
        
        item = items[0]
        
        # Start maintenance
        maintenance_data = {
            "item_id": item['id'],
            "maintenance_type": "Calibration",
            "technician": "John Doe",
            "notes": "Regular calibration check"
        }
        
        success, response = self.run_test(
            "Start Maintenance",
            "POST",
            "maintenance",
            200,
            data=maintenance_data
        )
        
        if not success:
            return False
        
        # Get maintenance records
        success, maintenance = self.run_test("Get Maintenance Records", "GET", "maintenance", 200)
        return success

    def test_lost_items(self):
        """Test lost items endpoint"""
        success, response = self.run_test(
            "Get Lost Items",
            "GET",
            "lost-items",
            200
        )
        return success

    def test_create_test_projects(self):
        """Create Test Shoot A and Test Shoot B projects"""
        # Create Test Shoot A
        project_a_data = {
            "name": "Test Shoot A",
            "location": "Studio 1",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "owner": "Test User",
            "status": "Active"
        }
        
        success_a, response_a = self.run_test(
            "Create Test Shoot A",
            "POST",
            "projects",
            200,
            data=project_a_data
        )
        
        if success_a:
            self.test_project_a_id = response_a.get('id')
        
        # Create Test Shoot B
        project_b_data = {
            "name": "Test Shoot B",
            "location": "Studio 2", 
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            "owner": "Test User",
            "status": "Active"
        }
        
        success_b, response_b = self.run_test(
            "Create Test Shoot B",
            "POST",
            "projects",
            200,
            data=project_b_data
        )
        
        if success_b:
            self.test_project_b_id = response_b.get('id')
            
        return success_a and success_b

    def test_create_test_equipment(self):
        """Create test equipment for testing"""
        item_data = {
            "name": "Test Camera Equipment",
            "category": "Camera",
            "total_quantity": 5,
            "location_in_studio": "Equipment Room A",
            "min_stock": 1
        }
        
        success, response = self.run_test(
            "Create Test Equipment",
            "POST",
            "items",
            200,
            data=item_data
        )
        
        if success:
            self.test_item_id = response.get('id')
            return True
        return False

    def test_mark_out_equipment(self):
        """Test marking out equipment to Test Shoot A"""
        if not self.test_item_id or not self.test_project_a_id:
            self.log_result("Mark Out Equipment", False, "Missing test item or project")
            return False
            
        mark_out_data = {
            "item_id": self.test_item_id,
            "project_id": self.test_project_a_id,
            "quantity": 3,
            "expected_return": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "notes": "Test checkout for partial return and transfer testing"
        }
        
        success, response = self.run_test(
            "Mark Out Equipment to Test Shoot A",
            "POST",
            "checkouts/mark-out",
            200,
            data=mark_out_data
        )
        
        if success:
            checkout_data = response.get('checkout', {})
            self.test_checkout_id = checkout_data.get('id')
            return True
        return False

    def test_partial_mark_in_api(self):
        """Test POST /api/checkouts/quick-mark-in with partial quantity"""
        if not self.test_checkout_id:
            self.log_result("Partial Mark-In API", False, "No checkout to test with")
            return False
            
        partial_data = {
            "checkout_id": self.test_checkout_id,
            "condition": "good",
            "quantity_returned": 2  # Return 2 out of 3
        }
        
        success, response = self.run_test(
            "Partial Mark-In API (2/3 items)",
            "POST",
            "checkouts/quick-mark-in",
            200,
            data=partial_data
        )
        
        if success:
            # Verify partial return response
            remaining = response.get('remaining', 0)
            status = response.get('status', '')
            if remaining == 1 and status == 'Partial':
                self.log_result("Partial Mark-In Response Validation", True)
                return True
            else:
                self.log_result("Partial Mark-In Response Validation", False, 
                              f"Expected remaining=1, status=Partial, got remaining={remaining}, status={status}")
        
        return success

    def test_transfer_equipment_api(self):
        """Test POST /api/checkouts/transfer endpoint"""
        if not self.test_checkout_id or not self.test_project_b_id:
            self.log_result("Transfer Equipment API", False, "Missing checkout or target project")
            return False
            
        transfer_data = {
            "checkout_id": self.test_checkout_id,
            "target_project_id": self.test_project_b_id,
            "quantity_to_transfer": 1  # Transfer remaining 1 item
        }
        
        success, response = self.run_test(
            "Transfer Equipment API (1 item to Test Shoot B)",
            "POST",
            "checkouts/transfer",
            200,
            data=transfer_data
        )
        
        if success:
            # Verify transfer response
            message = response.get('message', '')
            new_checkout_id = response.get('new_checkout_id', '')
            if 'Test Shoot B' in message and new_checkout_id:
                self.log_result("Transfer Equipment Response Validation", True)
                return True
            else:
                self.log_result("Transfer Equipment Response Validation", False, 
                              f"Invalid response: {response}")
        
        return success

    def test_pdf_generation_api(self):
        """Test GET /api/projects/{id}/packing-list-pdf generates PDF with comparison table"""
        if not self.test_project_a_id:
            self.log_result("PDF Generation API", False, "No project to test with")
            return False
            
        try:
            url = f"{self.api_url}/projects/{self.test_project_a_id}/packing-list-pdf"
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                # Check if response is PDF
                content_type = response.headers.get('content-type', '')
                content_disposition = response.headers.get('content-disposition', '')
                
                if 'application/pdf' in content_type and 'attachment' in content_disposition:
                    self.log_result("PDF Generation API", True)
                    # Check if PDF has content (basic validation)
                    if len(response.content) > 1000:  # PDF should be substantial
                        self.log_result("PDF Content Size Validation", True)
                        return True
                    else:
                        self.log_result("PDF Content Size Validation", False, f"PDF too small: {len(response.content)} bytes")
                else:
                    self.log_result("PDF Generation API", False, f"Wrong content type: {content_type}")
            else:
                self.log_result("PDF Generation API", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_result("PDF Generation API", False, f"Error: {str(e)}")
            
        return False

    def test_wrap_up_project_setup(self):
        """Create Wrap-Up Test Project with completed checkouts"""
        # Create Wrap-Up Test Project
        project_data = {
            "name": "Wrap-Up Test Project",
            "location": "Studio A",
            "start_date": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "end_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "owner": "Test User",
            "status": "Active"
        }
        
        success, response = self.run_test(
            "Create Wrap-Up Test Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if success:
            self.wrap_up_project_id = response.get('id')
            return True
        return False

    def test_wrap_up_equipment_setup(self):
        """Create equipment and mark it out then return it for wrap-up testing"""
        if not self.wrap_up_project_id:
            self.log_result("Wrap-Up Equipment Setup", False, "No wrap-up project")
            return False
            
        # Create test equipment
        item_data = {
            "name": "Wrap-Up Test Camera",
            "category": "Camera",
            "total_quantity": 3,
            "location_in_studio": "Equipment Room B",
            "min_stock": 1
        }
        
        success, response = self.run_test(
            "Create Wrap-Up Test Equipment",
            "POST",
            "items",
            200,
            data=item_data
        )
        
        if not success:
            return False
            
        wrap_up_item_id = response.get('id')
        
        # Mark out equipment
        mark_out_data = {
            "item_id": wrap_up_item_id,
            "project_id": self.wrap_up_project_id,
            "quantity": 2,
            "expected_return": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "notes": "Wrap-up test checkout"
        }
        
        success, response = self.run_test(
            "Mark Out Wrap-Up Equipment",
            "POST",
            "checkouts/mark-out",
            200,
            data=mark_out_data
        )
        
        if not success:
            return False
            
        checkout_id = response.get('checkout', {}).get('id')
        
        # Mark in all equipment (complete return)
        mark_in_data = {
            "checkout_id": checkout_id,
            "condition": "good",
            "quantity_returned": None  # Return all
        }
        
        success, response = self.run_test(
            "Complete Return for Wrap-Up Test",
            "POST",
            "checkouts/quick-mark-in",
            200,
            data=mark_in_data
        )
        
        return success

    def test_get_project_checkouts_api(self):
        """Test GET /api/checkouts/project/{project_id} returns all checkouts including completed ones"""
        if not hasattr(self, 'wrap_up_project_id') or not self.wrap_up_project_id:
            self.log_result("Get Project Checkouts API", False, "No wrap-up project to test")
            return False
            
        success, response = self.run_test(
            "Get Project Checkouts (All including completed)",
            "GET",
            f"checkouts/project/{self.wrap_up_project_id}",
            200
        )
        
        if success:
            # Verify we get completed checkouts
            completed_checkouts = [c for c in response if c.get('status') == 'Completed']
            if len(completed_checkouts) > 0:
                self.log_result("Project Checkouts Include Completed", True)
                print(f"   Found {len(completed_checkouts)} completed checkouts")
                return True
            else:
                self.log_result("Project Checkouts Include Completed", False, "No completed checkouts found")
        
        return success

    def test_pdf_generation_for_completed_project(self):
        """Test PDF generation for project with all items returned"""
        if not hasattr(self, 'wrap_up_project_id') or not self.wrap_up_project_id:
            self.log_result("PDF Generation for Completed Project", False, "No wrap-up project to test")
            return False
            
        try:
            url = f"{self.api_url}/projects/{self.wrap_up_project_id}/packing-list-pdf"
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                # Check if response is PDF
                content_type = response.headers.get('content-type', '')
                content_disposition = response.headers.get('content-disposition', '')
                
                if 'application/pdf' in content_type and 'attachment' in content_disposition:
                    self.log_result("PDF Generation for Completed Project", True)
                    
                    # Check PDF content size
                    if len(response.content) > 1000:
                        self.log_result("PDF Content Size for Completed Project", True)
                        print(f"   PDF size: {len(response.content)} bytes")
                        return True
                    else:
                        self.log_result("PDF Content Size for Completed Project", False, f"PDF too small: {len(response.content)} bytes")
                else:
                    self.log_result("PDF Generation for Completed Project", False, f"Wrong content type: {content_type}")
            else:
                self.log_result("PDF Generation for Completed Project", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_result("PDF Generation for Completed Project", False, f"Error: {str(e)}")
            
        return False

    def run_all_tests(self):
        """Run all API tests focusing on wrap-up center functionality"""
        print("🧪 Equipment Tracker API Tests - Wrap-Up Center Focus")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication
        print("\n🔐 AUTHENTICATION")
        if not self.test_auth_login():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Setup wrap-up test data
        print("\n🏗️  SETUP WRAP-UP TEST DATA")
        if not self.test_wrap_up_project_setup():
            print("❌ Failed to create wrap-up test project - stopping tests")
            return False
            
        if not self.test_wrap_up_equipment_setup():
            print("❌ Failed to setup wrap-up test equipment - stopping tests")
            return False
        
        # Wrap-up center specific tests
        print("\n📋 WRAP-UP CENTER API TESTS")
        self.test_get_project_checkouts_api()
        self.test_pdf_generation_for_completed_project()
        
        # Legacy feature tests for regression
        print("\n📦 REGRESSION TESTS")
        if self.test_create_test_projects() and self.test_create_test_equipment():
            self.test_mark_out_equipment()
            self.test_partial_mark_in_api()
            self.test_transfer_equipment_api()
            self.test_pdf_generation_api()
        
        print("\n🔍 BASIC API VALIDATION")
        self.test_get_active_checkouts()
        self.test_get_projects()
        self.test_get_items()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 TEST RESULTS: {self.tests_passed}/{self.tests_run} PASSED")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL BACKEND TESTS PASSED!")
            return True
        else:
            print("⚠️  SOME BACKEND TESTS FAILED")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return False

def main():
    tester = EquipmentTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())