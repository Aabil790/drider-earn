import requests
import sys
import json
from datetime import datetime

class DriderAPITester:
    def __init__(self, base_url="https://drider-earn.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Test membership plans (public endpoint)
        self.run_test("Get Membership Plans", "GET", "membership/plans", 200)

    def test_admin_auth(self):
        """Test admin authentication"""
        print("\n🔍 Testing Admin Authentication...")
        
        # Admin login
        admin_data = {
            "email": "admin@drider.in",
            "password": "admin123"
        }
        
        response = self.run_test("Admin Login", "POST", "auth/login", 200, admin_data)
        if response and 'token' in response:
            self.admin_token = response['token']
            self.log_test("Admin Token Retrieved", True, "Token stored for subsequent tests")
            
            # Test admin access
            self.run_test("Admin Dashboard Stats", "GET", "admin/dashboard-stats", 200, token=self.admin_token)
            return True
        else:
            self.log_test("Admin Token Retrieved", False, "Failed to get admin token")
            return False

    def test_user_auth(self):
        """Test user authentication"""
        print("\n🔍 Testing User Authentication...")
        
        # Create test user
        timestamp = datetime.now().strftime("%H%M%S")
        user_data = {
            "email": f"testuser{timestamp}@test.com",
            "mobile": f"98765{timestamp}",
            "password": "testpass123",
            "name": f"Test User {timestamp}"
        }
        
        response = self.run_test("User Signup", "POST", "auth/signup", 200, user_data)
        if response and 'token' in response:
            self.user_token = response['token']
            self.log_test("User Token Retrieved", True, "Token stored for subsequent tests")
            
            # Test user profile
            self.run_test("Get User Profile", "GET", "auth/me", 200, token=self.user_token)
            
            # Test user login
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            self.run_test("User Login", "POST", "auth/login", 200, login_data)
            return True
        else:
            self.log_test("User Token Retrieved", False, "Failed to get user token")
            return False

    def test_membership_flow(self):
        """Test membership and payment flow"""
        print("\n🔍 Testing Membership Flow...")
        
        if not self.user_token:
            self.log_test("Membership Flow", False, "No user token available")
            return
        
        # Test create order
        order_data = {"plan": "basic"}
        self.run_test("Create Membership Order", "POST", "membership/create-order", 200, order_data, self.user_token)

    def test_admin_content_creation(self):
        """Test admin content creation"""
        print("\n🔍 Testing Admin Content Creation...")
        
        if not self.admin_token:
            self.log_test("Admin Content Creation", False, "No admin token available")
            return
        
        # Create video category
        category_data = {
            "name": "Test Category",
            "description": "Test category for automated testing"
        }
        category_response = self.run_test("Create Video Category", "POST", "admin/videos/category", 200, category_data, self.admin_token)
        
        if category_response and 'id' in category_response:
            category_id = category_response['id']
            
            # Create video
            video_data = {
                "category_id": category_id,
                "title": "Test Video",
                "description": "Test video description",
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            }
            self.run_test("Create Video", "POST", "admin/videos", 200, video_data, self.admin_token)
        
        # Create cashback product
        cashback_data = {
            "title": "Test Cashback Product",
            "description": "Test product for cashback",
            "product_link": "https://example.com/product",
            "price": 999.99,
            "cashback_amount": 50.0,
            "refund_days": 30,
            "image": "https://example.com/image.jpg"
        }
        self.run_test("Create Cashback Product", "POST", "admin/cashback-products", 200, cashback_data, self.admin_token)
        
        # Create ecommerce product
        ecommerce_data = {
            "name": "Test E-commerce Product",
            "description": "Test product for e-commerce",
            "price": 299.99,
            "stock": 10,
            "image": "https://example.com/product.jpg"
        }
        self.run_test("Create E-commerce Product", "POST", "admin/ecommerce-products", 200, ecommerce_data, self.admin_token)

    def test_user_features(self):
        """Test user features that require membership"""
        print("\n🔍 Testing User Features...")
        
        if not self.user_token:
            self.log_test("User Features", False, "No user token available")
            return
        
        # Test features that require membership (should fail for unpaid user)
        self.run_test("Get Video Categories (Unpaid)", "GET", "videos/categories", 403, token=self.user_token)
        self.run_test("Get Cashback Products (Unpaid)", "GET", "cashback-products", 403, token=self.user_token)
        self.run_test("Get E-commerce Products (Unpaid)", "GET", "ecommerce/products", 403, token=self.user_token)
        
        # Test features that work for all users
        self.run_test("Get Referral Code", "GET", "referrals/my-code", 200, token=self.user_token)
        self.run_test("Get Referral Stats", "GET", "referrals/stats", 200, token=self.user_token)
        self.run_test("Get Wallet Balance", "GET", "wallet/balance", 200, token=self.user_token)
        self.run_test("Get Wallet Transactions", "GET", "wallet/transactions", 200, token=self.user_token)
        self.run_test("Get Notifications", "GET", "notifications", 200, token=self.user_token)

    def test_admin_management(self):
        """Test admin management features"""
        print("\n🔍 Testing Admin Management...")
        
        if not self.admin_token:
            self.log_test("Admin Management", False, "No admin token available")
            return
        
        # Test admin endpoints
        self.run_test("Get All Users", "GET", "admin/users", 200, token=self.admin_token)
        self.run_test("Get Withdrawal Requests", "GET", "admin/withdrawal-requests", 200, token=self.admin_token)
        self.run_test("Get Cashback Clicks", "GET", "admin/cashback-clicks", 200, token=self.admin_token)
        
        # Test settings update
        settings_data = {"whatsapp_group_link": "https://chat.whatsapp.com/test123"}
        self.run_test("Update WhatsApp Settings", "PUT", "admin/settings", 200, settings_data, self.admin_token)

    def test_whatsapp_settings(self):
        """Test WhatsApp settings for paid users"""
        print("\n🔍 Testing WhatsApp Settings...")
        
        if not self.user_token:
            self.log_test("WhatsApp Settings", False, "No user token available")
            return
        
        # Should fail for unpaid user
        self.run_test("Get WhatsApp Link (Unpaid)", "GET", "settings/whatsapp", 403, token=self.user_token)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Drider API Testing...")
        print(f"Base URL: {self.base_url}")
        
        # Run test suites
        self.test_basic_endpoints()
        admin_success = self.test_admin_auth()
        user_success = self.test_user_auth()
        
        if admin_success:
            self.test_admin_content_creation()
            self.test_admin_management()
        
        if user_success:
            self.test_membership_flow()
            self.test_user_features()
            self.test_whatsapp_settings()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DriderAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())