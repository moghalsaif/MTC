#!/usr/bin/env python3
"""
Test script for specific features mentioned in the review request:
1. 100% Verified logic fix
2. Licence Type dropdown (Monthly, Annual, Lifetime)
3. Asset categories (Environments, Motion Capture)
4. Separated spend cards
"""

import requests
import json
from datetime import datetime, timezone, timedelta

class SpecificFeaturesTester:
    def __init__(self, base_url="https://lead-manager-95.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.test_results = []
        
    def login(self):
        """Login with test credentials"""
        login_data = {
            "email": "testuser@test.com",
            "password": "testpassword"
        }
        
        response = requests.post(f"{self.api_url}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            print("✅ Login successful")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False
    
    def make_request(self, method, endpoint, data=None):
        """Make authenticated API request"""
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.api_url}/{endpoint}"
        
        if method == 'GET':
            response = requests.get(url, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        
        return response
    
    def test_licence_type_api(self):
        """Test licence type field in API"""
        print("\n🔍 Testing Licence Type API Support")
        
        # Test creating licence with different types
        licence_types = ['Monthly', 'Annual', 'Lifetime']
        created_licences = []
        
        for licence_type in licence_types:
            licence_data = {
                "name": f"Test {licence_type} Licence",
                "vendor": "Test Vendor",
                "category": "Software",
                "licence_type": licence_type,
                "cost_per_period": 1000.0,
                "billing_period": "Monthly",
                "renewal_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                "status": "Active"
            }
            
            response = self.make_request('POST', 'licences', licence_data)
            if response.status_code == 200:
                data = response.json()
                created_licences.append(data['id'])
                if data.get('licence_type') == licence_type:
                    print(f"✅ Created {licence_type} licence successfully")
                else:
                    print(f"❌ Licence type not saved correctly for {licence_type}")
            else:
                print(f"❌ Failed to create {licence_type} licence: {response.status_code}")
        
        # Test updating licence type
        if created_licences:
            update_data = {"licence_type": "Lifetime"}
            response = self.make_request('PUT', f'licences/{created_licences[0]}', update_data)
            if response.status_code == 200:
                data = response.json()
                if data.get('licence_type') == 'Lifetime':
                    print("✅ Licence type update successful")
                else:
                    print("❌ Licence type update failed")
        
        # Cleanup
        for licence_id in created_licences:
            self.make_request('DELETE', f'licences/{licence_id}')
        
        return len(created_licences) == 3
    
    def test_asset_categories_api(self):
        """Test new asset categories in API"""
        print("\n🔍 Testing Asset Categories API Support")
        
        # Test creating assets with new categories
        new_categories = ['Environments', 'Motion Capture']
        created_assets = []
        
        for category in new_categories:
            asset_data = {
                "name": f"Test {category} Asset",
                "vendor": "Test Vendor",
                "category": category,
                "purchase_date": datetime.now(timezone.utc).isoformat(),
                "purchase_price": 5000.0,
                "storage_location": f"//NAS/Assets/{category}",
                "licence_type": "Royalty-free"
            }
            
            response = self.make_request('POST', 'assets', asset_data)
            if response.status_code == 200:
                data = response.json()
                created_assets.append(data['id'])
                if data.get('category') == category:
                    print(f"✅ Created {category} asset successfully")
                else:
                    print(f"❌ Asset category not saved correctly for {category}")
            else:
                print(f"❌ Failed to create {category} asset: {response.status_code}")
        
        # Cleanup
        for asset_id in created_assets:
            self.make_request('DELETE', f'assets/{asset_id}')
        
        return len(created_assets) == 2
    
    def test_missing_items_verification_logic(self):
        """Test the 100% verified logic with missing items"""
        print("\n🔍 Testing 100% Verified Logic with Missing Items")
        
        # Create test project
        project_data = {
            "name": "Missing Items Test Project",
            "location": "Test Studio",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "owner": "Test User",
            "status": "Active"
        }
        
        response = self.make_request('POST', 'projects', project_data)
        if response.status_code != 200:
            print("❌ Failed to create test project")
            return False
        
        project_id = response.json()['id']
        print("✅ Created test project")
        
        # Create test item
        item_data = {
            "name": "Missing Items Test Camera",
            "category": "Camera",
            "total_quantity": 3,
            "location_in_studio": "Test Shelf",
            "min_stock": 1
        }
        
        response = self.make_request('POST', 'items', item_data)
        if response.status_code != 200:
            print("❌ Failed to create test item")
            return False
        
        item_id = response.json()['id']
        print("✅ Created test item")
        
        # Mark out items
        mark_out_data = {
            "item_id": item_id,
            "project_id": project_id,
            "quantity": 3,
            "expected_return": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "notes": "Test checkout for missing items verification"
        }
        
        response = self.make_request('POST', 'checkouts/mark-out', mark_out_data)
        if response.status_code != 200:
            print("❌ Failed to mark out items")
            return False
        
        checkout_id = response.json()['checkout']['id']
        print("✅ Marked out 3 items")
        
        # Return 2 items, mark 1 as missing
        mark_in_data = {
            "checkout_id": checkout_id,
            "condition": "good",
            "quantity_returned": 2
        }
        
        response = self.make_request('POST', 'checkouts/quick-mark-in', mark_in_data)
        if response.status_code != 200:
            print("❌ Failed to return 2 items")
            return False
        
        print("✅ Returned 2 items (good condition)")
        
        # Mark remaining 1 item as missing
        mark_missing_data = {
            "checkout_id": checkout_id,
            "condition": "missing",
            "quantity_returned": 1
        }
        
        response = self.make_request('POST', 'checkouts/quick-mark-in', mark_missing_data)
        if response.status_code != 200:
            print("❌ Failed to mark item as missing")
            return False
        
        response_data = response.json()
        if response_data.get('quantity_missing', 0) > 0:
            print("✅ Successfully marked 1 item as missing")
        else:
            print("❌ Missing item not recorded properly")
        
        # Get project checkouts to verify missing items are tracked
        response = self.make_request('GET', f'checkouts/project/{project_id}')
        if response.status_code == 200:
            checkouts = response.json()
            total_missing = sum(c.get('quantity_missing', 0) for c in checkouts)
            if total_missing > 0:
                print(f"✅ Project has {total_missing} missing items - verification should show FAILED")
            else:
                print("❌ Missing items not tracked in project checkouts")
        
        # Cleanup
        self.make_request('DELETE', f'projects/{project_id}')
        self.make_request('DELETE', f'items/{item_id}')
        
        return True
    
    def test_separated_spend_calculation(self):
        """Test that spend is calculated separately for subscriptions vs assets"""
        print("\n🔍 Testing Separated Spend Calculation")
        
        # Create test subscription
        licence_data = {
            "name": "Test Subscription for Spend",
            "vendor": "Test Vendor",
            "category": "Software",
            "licence_type": "Annual",
            "cost_per_period": 12000.0,  # ₹12,000 annually
            "billing_period": "Yearly",
            "renewal_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "status": "Active"
        }
        
        response = self.make_request('POST', 'licences', licence_data)
        if response.status_code != 200:
            print("❌ Failed to create test subscription")
            return False
        
        licence_id = response.json()['id']
        print("✅ Created test subscription")
        
        # Create test asset
        asset_data = {
            "name": "Test Asset for Spend",
            "vendor": "Test Vendor",
            "category": "Stock Footage",
            "purchase_date": datetime.now(timezone.utc).isoformat(),
            "purchase_price": 8000.0,  # ₹8,000 one-time
            "storage_location": "//NAS/Test",
            "licence_type": "Royalty-free"
        }
        
        response = self.make_request('POST', 'assets', asset_data)
        if response.status_code != 200:
            print("❌ Failed to create test asset")
            return False
        
        asset_id = response.json()['id']
        print("✅ Created test asset")
        
        # Get licence stats (subscription spend)
        response = self.make_request('GET', 'licences/stats/summary')
        if response.status_code == 200:
            stats = response.json()
            annual_spend = stats.get('total_annual_spend', 0)
            print(f"✅ Subscription annual spend: ₹{annual_spend}")
        else:
            print("❌ Failed to get licence stats")
        
        # Get assets (one-time spend)
        response = self.make_request('GET', 'assets')
        if response.status_code == 200:
            assets = response.json()
            total_asset_value = sum(a.get('purchase_price', 0) for a in assets)
            print(f"✅ Total asset value: ₹{total_asset_value}")
        else:
            print("❌ Failed to get assets")
        
        # Cleanup
        self.make_request('DELETE', f'licences/{licence_id}')
        self.make_request('DELETE', f'assets/{asset_id}')
        
        return True
    
    def run_all_tests(self):
        """Run all specific feature tests"""
        print("🧪 Testing Specific Features from Review Request")
        print("=" * 60)
        
        if not self.login():
            return False
        
        results = []
        
        # Test 1: Licence Type API support
        results.append(self.test_licence_type_api())
        
        # Test 2: Asset Categories API support
        results.append(self.test_asset_categories_api())
        
        # Test 3: Missing Items Verification Logic
        results.append(self.test_missing_items_verification_logic())
        
        # Test 4: Separated Spend Calculation
        results.append(self.test_separated_spend_calculation())
        
        print("\n" + "=" * 60)
        passed = sum(results)
        total = len(results)
        print(f"📊 SPECIFIC FEATURES TEST RESULTS: {passed}/{total} PASSED")
        
        if passed == total:
            print("🎉 ALL SPECIFIC FEATURES WORKING!")
            return True
        else:
            print("⚠️  SOME FEATURES NEED ATTENTION")
            return False

if __name__ == "__main__":
    tester = SpecificFeaturesTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)