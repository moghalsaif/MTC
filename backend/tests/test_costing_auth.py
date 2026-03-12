"""
Test file for iteration 17:
1. Password reset verification for sanat@machvisuals.com and rohit@machvisuals.com
2. Login flow validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPasswordReset:
    """Test that the password reset for admin and manager users is working"""
    
    def test_admin_login_with_new_password(self):
        """Test sanat@machvisuals.com can login with MachAdmin@2026"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "MachAdmin@2026"
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user object"
        assert data["user"]["email"] == "sanat@machvisuals.com"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        print(f"✓ Admin sanat@machvisuals.com logged in successfully with role: {data['user']['role']}")
    
    def test_manager_login_with_new_password(self):
        """Test rohit@machvisuals.com can login with MachManager@2026"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rohit@machvisuals.com",
            "password": "MachManager@2026"
        })
        
        assert response.status_code == 200, f"Manager login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user object"
        assert data["user"]["email"] == "rohit@machvisuals.com"
        assert data["user"]["role"] == "manager", f"Expected manager role, got {data['user']['role']}"
        print(f"✓ Manager rohit@machvisuals.com logged in successfully with role: {data['user']['role']}")
    
    def test_regular_user_login(self):
        """Test testcalc@machvisuals.com can login with Test1234!"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testcalc@machvisuals.com",
            "password": "Test1234!"
        })
        
        assert response.status_code == 200, f"Regular user login failed: {response.text}"
        data = response.json()
        
        assert data["user"]["role"] == "user", f"Expected user role, got {data['user']['role']}"
        print(f"✓ Regular user testcalc@machvisuals.com logged in successfully with role: {data['user']['role']}")
    
    def test_invalid_password_returns_401(self):
        """Test that wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "wrongpassword123"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid password correctly returns 401")
    
    def test_get_current_user_after_login(self):
        """Test /auth/me returns correct user info"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sanat@machvisuals.com",
            "password": "MachAdmin@2026"
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Now get current user
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert me_response.status_code == 200, f"/auth/me failed: {me_response.text}"
        data = me_response.json()
        
        assert data["email"] == "sanat@machvisuals.com"
        assert data["role"] == "admin"
        print(f"✓ /auth/me returns correct admin user info")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
