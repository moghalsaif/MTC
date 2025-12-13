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
        self.created_items = []
        self.created_projects = []
        self.created_checkouts = []

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

    def test_auth_register(self):
        """Test user registration"""
        test_user_data = {
            "email": "admin@studio.com",
            "password": "admin123",
            "name": "Admin User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_auth_login(self):
        """Test user login"""
        login_data = {
            "email": "admin@studio.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "User Login",
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

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Equipment Tracker API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📋 AUTHENTICATION TESTS")
        if not self.test_auth_register():
            # Try login if register fails (user might already exist)
            if not self.test_auth_login():
                print("❌ Authentication failed - stopping tests")
                return False
        
        self.test_auth_me()
        
        # Core API Tests
        print("\n📦 INVENTORY TESTS")
        self.test_get_items()
        self.test_create_item()
        
        print("\n📁 PROJECT TESTS")
        self.test_get_projects()
        self.test_create_project()
        
        print("\n🔄 CHECKOUT/CHECKIN TESTS")
        self.test_mark_out_flow()
        self.test_get_active_checkouts()
        self.test_mark_in_flow()
        
        print("\n📊 DASHBOARD TESTS")
        self.test_dashboard_stats()
        
        print("\n🚨 ISSUES TESTS")
        self.test_issues_flow()
        
        print("\n🔧 MAINTENANCE TESTS")
        self.test_maintenance_flow()
        
        print("\n📋 LOST ITEMS TESTS")
        self.test_lost_items()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 TEST RESULTS: {self.tests_passed}/{self.tests_run} PASSED")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print("⚠️  SOME TESTS FAILED")
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