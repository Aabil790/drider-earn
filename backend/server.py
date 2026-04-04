from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import razorpay

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

razorpay_key_id = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_placeholder')
razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET', 'placeholder_secret')
razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

async def get_admin_user(current_user = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

class SignupRequest(BaseModel):
    email: EmailStr
    mobile: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateOrderRequest(BaseModel):
    plan: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

class VideoCategoryCreate(BaseModel):
    name: str
    description: str

class VideoCreate(BaseModel):
    category_id: str
    title: str
    description: str
    youtube_url: str
    thumbnail: Optional[str] = None

class CashbackProductCreate(BaseModel):
    title: str
    description: str
    product_link: str
    price: float
    cashback_amount: float
    refund_days: int
    image: Optional[str] = None

class EcommerceProductCreate(BaseModel):
    name: str
    description: str
    price: float
    image: Optional[str] = None
    stock: int
    category: Optional[str] = None

class OrderCreate(BaseModel):
    product_id: str
    quantity: int

class WithdrawalRequest(BaseModel):
    amount: float
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None

class SettingsUpdate(BaseModel):
    whatsapp_group_link: Optional[str] = None

@api_router.get("/")
async def root():
    return {"message": "Drider API"}

@api_router.post("/auth/signup")
async def signup(req: SignupRequest):
    existing = await db.users.find_one({"email": req.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    referral_code = str(uuid.uuid4())[:8].upper()
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": req.email,
        "mobile": req.mobile,
        "name": req.name,
        "password": hash_password(req.password),
        "role": "user",
        "membership_plan": "none",
        "is_paid": False,
        "referral_code": referral_code,
        "wallet_balance": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id})
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": req.email,
            "name": req.name,
            "role": "user",
            "membership_plan": "none",
            "is_paid": False,
            "referral_code": referral_code,
            "wallet_balance": 0.0
        }
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "membership_plan": user["membership_plan"],
            "is_paid": user["is_paid"],
            "referral_code": user["referral_code"],
            "wallet_balance": user["wallet_balance"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "membership_plan": current_user["membership_plan"],
        "is_paid": current_user["is_paid"],
        "referral_code": current_user["referral_code"],
        "wallet_balance": current_user["wallet_balance"]
    }

@api_router.get("/membership/plans")
async def get_membership_plans():
    return [
        {"id": "basic", "name": "Basic", "price": 99, "features": ["Access to training videos", "Cashback on products", "Referral earnings"]},
        {"id": "premium", "name": "Premium", "price": 199, "features": ["All Basic features", "Priority support", "Extra cashback", "Exclusive products"]}
    ]

@api_router.post("/membership/create-order")
async def create_membership_order(req: CreateOrderRequest, current_user = Depends(get_current_user)):
    if current_user["is_paid"]:
        raise HTTPException(status_code=400, detail="Membership already active")
    
    amount = 9900 if req.plan == "basic" else 19900
    
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"order_{current_user['id'][:20]}",
        "notes": {
            "user_id": current_user["id"],
            "plan": req.plan
        }
    }
    
    try:
        order = razorpay_client.order.create(data=order_data)
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "razorpay_key_id": razorpay_key_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@api_router.post("/membership/verify-payment")
async def verify_membership_payment(req: VerifyPaymentRequest, current_user = Depends(get_current_user)):
    try:
        params_dict = {
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"is_paid": True, "membership_plan": req.plan}}
        )
        
        amount = 99 if req.plan == "basic" else 199
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "type": "payment",
            "amount": amount,
            "status": "completed",
            "description": f"Membership purchase - {req.plan}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "title": "Welcome to Drider!",
            "message": f"Your {req.plan} membership is now active. Start earning now!",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "message": "Payment verified successfully"}
    except:
        raise HTTPException(status_code=400, detail="Payment verification failed")

@api_router.get("/videos/categories")
async def get_video_categories(current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    categories = await db.video_categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/videos/category/{category_id}")
async def get_videos_by_category(category_id: str, current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    videos = await db.videos.find({"category_id": category_id}, {"_id": 0}).to_list(100)
    return videos

@api_router.get("/referrals/my-code")
async def get_my_referral_code(current_user = Depends(get_current_user)):
    return {"referral_code": current_user["referral_code"]}

@api_router.get("/referrals/stats")
async def get_referral_stats(current_user = Depends(get_current_user)):
    referrals = await db.referrals.find({"referrer_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    total_earnings = sum([r.get("earned_amount", 0) for r in referrals])
    return {
        "total_referrals": len(referrals),
        "total_earnings": total_earnings,
        "referrals": referrals
    }

@api_router.get("/cashback-products")
async def get_cashback_products(current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    products = await db.cashback_products.find({"status": "active"}, {"_id": 0}).to_list(100)
    return products

@api_router.post("/cashback-products/{product_id}/click")
async def track_cashback_click(product_id: str, current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    
    product = await db.cashback_products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    click_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_id": product_id,
        "clicked_at": datetime.now(timezone.utc).isoformat(),
        "verified": False,
        "cashback_paid": False
    }
    await db.cashback_clicks.insert_one(click_doc)
    
    return {"product_link": product["product_link"]}

@api_router.get("/cashback/history")
async def get_cashback_history(current_user = Depends(get_current_user)):
    clicks = await db.cashback_clicks.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return clicks

@api_router.get("/ecommerce/products")
async def get_ecommerce_products(current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    products = await db.ecommerce_products.find({"stock": {"$gt": 0}}, {"_id": 0}).to_list(100)
    return products

@api_router.get("/ecommerce/products/{product_id}")
async def get_ecommerce_product(product_id: str, current_user = Depends(get_current_user)):
    product = await db.ecommerce_products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/ecommerce/orders")
async def create_order(req: OrderCreate, current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    
    product = await db.ecommerce_products.find_one({"id": req.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["stock"] < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    total_amount = product["price"] * req.quantity
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_id": req.product_id,
        "quantity": req.quantity,
        "total_amount": total_amount,
        "status": "pending",
        "tracking_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    
    await db.ecommerce_products.update_one(
        {"id": req.product_id},
        {"$inc": {"stock": -req.quantity}}
    )
    
    return order_doc

@api_router.get("/ecommerce/my-orders")
async def get_my_orders(current_user = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return orders

@api_router.get("/wallet/balance")
async def get_wallet_balance(current_user = Depends(get_current_user)):
    return {"balance": current_user["wallet_balance"]}

@api_router.get("/wallet/transactions")
async def get_wallet_transactions(current_user = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return transactions

@api_router.post("/wallet/withdraw")
async def request_withdrawal(req: WithdrawalRequest, current_user = Depends(get_current_user)):
    if current_user["wallet_balance"] < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    withdrawal_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "amount": req.amount,
        "upi_id": req.upi_id,
        "bank_name": req.bank_name,
        "account_number": req.account_number,
        "ifsc_code": req.ifsc_code,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.withdrawal_requests.insert_one(withdrawal_doc)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"wallet_balance": -req.amount}}
    )
    
    return {"success": True, "message": "Withdrawal request submitted"}

@api_router.get("/notifications")
async def get_notifications(current_user = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.get("/settings/whatsapp")
async def get_whatsapp_link(current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    settings = await db.settings.find_one({}, {"_id": 0})
    return {"whatsapp_group_link": settings.get("whatsapp_group_link", "") if settings else ""}

@api_router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats(admin_user = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    paid_users = await db.users.count_documents({"is_paid": True})
    pending_withdrawals = await db.withdrawal_requests.count_documents({"status": "pending"})
    pending_cashback = await db.cashback_clicks.count_documents({"verified": True, "cashback_paid": False})
    
    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "pending_withdrawals": pending_withdrawals,
        "pending_cashback": pending_cashback
    }

@api_router.get("/admin/users")
async def get_all_users(admin_user = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.post("/admin/videos/category")
async def create_video_category(req: VideoCategoryCreate, admin_user = Depends(get_admin_user)):
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.video_categories.insert_one(category_doc)
    category_doc.pop('_id', None)
    return category_doc

@api_router.post("/admin/videos")
async def create_video(req: VideoCreate, admin_user = Depends(get_admin_user)):
    video_doc = {
        "id": str(uuid.uuid4()),
        "category_id": req.category_id,
        "title": req.title,
        "description": req.description,
        "youtube_url": req.youtube_url,
        "thumbnail": req.thumbnail,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.videos.insert_one(video_doc)
    video_doc.pop('_id', None)
    return video_doc

@api_router.post("/admin/cashback-products")
async def create_cashback_product(req: CashbackProductCreate, admin_user = Depends(get_admin_user)):
    product_doc = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "description": req.description,
        "product_link": req.product_link,
        "price": req.price,
        "cashback_amount": req.cashback_amount,
        "refund_days": req.refund_days,
        "image": req.image,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.cashback_products.insert_one(product_doc)
    product_doc.pop('_id', None)
    return product_doc

@api_router.post("/admin/ecommerce-products")
async def create_ecommerce_product(req: EcommerceProductCreate, admin_user = Depends(get_admin_user)):
    product_doc = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "description": req.description,
        "price": req.price,
        "image": req.image,
        "stock": req.stock,
        "category": req.category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.ecommerce_products.insert_one(product_doc)
    product_doc.pop('_id', None)
    return product_doc

@api_router.get("/admin/withdrawal-requests")
async def get_withdrawal_requests(admin_user = Depends(get_admin_user)):
    requests = await db.withdrawal_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.put("/admin/withdrawal-requests/{request_id}/approve")
async def approve_withdrawal(request_id: str, admin_user = Depends(get_admin_user)):
    withdrawal = await db.withdrawal_requests.find_one({"id": request_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.withdrawal_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved"}}
    )
    
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": withdrawal["user_id"],
        "type": "withdrawal",
        "amount": withdrawal["amount"],
        "status": "completed",
        "description": "Withdrawal processed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True}

@api_router.get("/admin/cashback-clicks")
async def get_cashback_clicks(admin_user = Depends(get_admin_user)):
    clicks = await db.cashback_clicks.find({}, {"_id": 0}).sort("clicked_at", -1).to_list(100)
    return clicks

@api_router.put("/admin/cashback-clicks/{click_id}/verify")
async def verify_cashback_click(click_id: str, admin_user = Depends(get_admin_user)):
    click = await db.cashback_clicks.find_one({"id": click_id}, {"_id": 0})
    if not click:
        raise HTTPException(status_code=404, detail="Click not found")
    
    if click["cashback_paid"]:
        raise HTTPException(status_code=400, detail="Cashback already paid")
    
    product = await db.cashback_products.find_one({"id": click["product_id"]}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.cashback_clicks.update_one(
        {"id": click_id},
        {"$set": {"verified": True, "cashback_paid": True}}
    )
    
    await db.users.update_one(
        {"id": click["user_id"]},
        {"$inc": {"wallet_balance": product["cashback_amount"]}}
    )
    
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": click["user_id"],
        "type": "earning",
        "amount": product["cashback_amount"],
        "status": "completed",
        "description": f"Cashback from {product['title']}",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": click["user_id"],
        "title": "Cashback Received!",
        "message": f"You earned ₹{product['cashback_amount']} cashback from {product['title']}",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True}

@api_router.put("/admin/settings")
async def update_settings(req: SettingsUpdate, admin_user = Depends(get_admin_user)):
    settings = await db.settings.find_one({}, {"_id": 0})
    
    if settings:
        await db.settings.update_one(
            {"id": settings["id"]},
            {"$set": {"whatsapp_group_link": req.whatsapp_group_link}}
        )
    else:
        await db.settings.insert_one({
            "id": str(uuid.uuid4()),
            "whatsapp_group_link": req.whatsapp_group_link
        })
    
    return {"success": True}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def create_admin():
    admin = await db.users.find_one({"email": "admin@drider.in"}, {"_id": 0})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": "admin@drider.in",
            "mobile": "7836835613",
            "name": "Admin",
            "password": hash_password("admin123"),
            "role": "admin",
            "membership_plan": "premium",
            "is_paid": True,
            "referral_code": "ADMIN001",
            "wallet_balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Admin user created")
