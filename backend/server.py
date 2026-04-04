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
    referred_by_code: Optional[str] = None

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
    is_free: bool = True

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

class CashbackProofSubmit(BaseModel):
    cashback_click_id: str
    order_id: str
    order_date: str
    screenshot_url: str
    review_link: Optional[str] = None
    notes: Optional[str] = None

class AddFundsRequest(BaseModel):
    amount: float

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    profile_picture: Optional[str] = None
    bio: Optional[str] = None

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

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
        "referred_by_code": req.referred_by_code,
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
        
        # Process referral commission
        referral_code = current_user.get("referred_by_code")
        if referral_code:
            referrer = await db.users.find_one({"referral_code": referral_code}, {"_id": 0})
            if referrer:
                # Commission based on plan
                commission_percent = 0.40 if req.plan == "premium" else 0.30
                commission_amount = amount * commission_percent
                
                # Add commission to referrer's wallet
                await db.users.update_one(
                    {"id": referrer["id"]},
                    {"$inc": {"wallet_balance": commission_amount}}
                )
                
                # Record referral
                referral_doc = {
                    "id": str(uuid.uuid4()),
                    "referrer_id": referrer["id"],
                    "referred_user_id": current_user["id"],
                    "plan_type": req.plan,
                    "earned_amount": commission_amount,
                    "commission_percent": int(commission_percent * 100),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.referrals.insert_one(referral_doc)
                
                # Transaction record for referrer
                await db.transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": referrer["id"],
                    "type": "earning",
                    "amount": commission_amount,
                    "status": "completed",
                    "description": f"Referral commission ({req.plan} plan) - {int(commission_percent * 100)}%",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Notification to referrer
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": referrer["id"],
                    "title": "Referral Earnings!",
                    "message": f"You earned ₹{commission_amount} from {current_user['name']}'s {req.plan} membership!",
                    "read": False,
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
    
    # Filter based on membership
    if current_user["membership_plan"] != "premium":
        # Basic users can only see free videos with full access
        # Paid videos will show but with lock
        for video in videos:
            if not video.get("is_free", True):
                video["locked"] = True
    else:
        # Premium users see all videos unlocked
        for video in videos:
            video["locked"] = False
    
    return videos

@api_router.get("/referrals/my-code")
async def get_my_referral_code(current_user = Depends(get_current_user)):
    return {"referral_code": current_user["referral_code"]}

@api_router.get("/referrals/stats")
async def get_referral_stats(current_user = Depends(get_current_user)):
    referrals = await db.referrals.find({"referrer_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    total_earnings = sum([r.get("earned_amount", 0) for r in referrals])
    basic_referrals = [r for r in referrals if r.get("plan_type") == "basic"]
    premium_referrals = [r for r in referrals if r.get("plan_type") == "premium"]
    
    basic_earnings = sum([r.get("earned_amount", 0) for r in basic_referrals])
    premium_earnings = sum([r.get("earned_amount", 0) for r in premium_referrals])
    
    return {
        "total_referrals": len(referrals),
        "total_earnings": total_earnings,
        "basic_plan_referrals": len(basic_referrals),
        "basic_plan_earnings": basic_earnings,
        "premium_plan_referrals": len(premium_referrals),
        "premium_plan_earnings": premium_earnings,
        "referrals": referrals
    }

@api_router.get("/leaderboard/top-earners")
async def get_top_earners(limit: int = 50, filter: str = "all"):
    # Calculate date filter
    now = datetime.now(timezone.utc)
    date_filter = {}
    
    if filter == "daily":
        start_date = now - timedelta(days=1)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif filter == "weekly":
        start_date = now - timedelta(days=7)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    elif filter == "monthly":
        start_date = now - timedelta(days=30)
        date_filter = {"created_at": {"$gte": start_date.isoformat()}}
    
    users = await db.users.find(
        {"is_paid": True},
        {"_id": 0, "name": "1", "wallet_balance": "1", "id": "1", "membership_plan": "1", "created_at": "1"}
    ).sort("wallet_balance", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for idx, user in enumerate(users, 1):
        leaderboard.append({
            "rank": idx,
            "name": user.get("name", "User"),
            "earnings": user.get("wallet_balance", 0),
            "user_id": user.get("id"),
            "membership_plan": user.get("membership_plan", "basic"),
            "badge": "🏆" if idx == 1 else "🥈" if idx == 2 else "🥉" if idx == 3 else None
        })
    
    return leaderboard

@api_router.get("/leaderboard/my-rank")
async def get_my_rank(current_user = Depends(get_current_user)):
    all_users = await db.users.find(
        {"is_paid": True},
        {"_id": 0, "id": "1", "wallet_balance": "1"}
    ).sort("wallet_balance", -1).to_list(10000)
    
    my_rank = None
    total_users = len(all_users)
    
    for idx, user in enumerate(all_users, 1):
        if user["id"] == current_user["id"]:
            my_rank = idx
            break
    
    return {
        "rank": my_rank,
        "total_users": total_users,
        "earnings": current_user["wallet_balance"]
    }

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, current_user = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id, "is_paid": True}, {"_id": 0, "password": 0, "email": 0, "mobile": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user stats
    referrals = await db.referrals.find({"referrer_id": user_id}, {"_id": 0}).to_list(1000)
    total_referrals = len(referrals)
    
    transactions = await db.transactions.find(
        {"user_id": user_id, "type": "earning"},
        {"_id": 0}
    ).to_list(100)
    total_transactions = len(transactions)
    
    # Get rank
    all_users = await db.users.find(
        {"is_paid": True},
        {"_id": 0, "id": "1", "wallet_balance": "1"}
    ).sort("wallet_balance", -1).to_list(10000)
    
    rank = None
    for idx, u in enumerate(all_users, 1):
        if u["id"] == user_id:
            rank = idx
            break
    
    return {
        "name": user.get("name"),
        "membership_plan": user.get("membership_plan"),
        "wallet_balance": user.get("wallet_balance"),
        "referral_code": user.get("referral_code"),
        "created_at": user.get("created_at"),
        "rank": rank,
        "total_referrals": total_referrals,
        "total_transactions": total_transactions,
        "is_own_profile": user_id == current_user["id"]
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
    
    # Enrich with product details and proof submission
    for click in clicks:
        product = await db.cashback_products.find_one({"id": click["product_id"]}, {"_id": 0})
        if product:
            click["product_title"] = product.get("title")
            click["cashback_amount"] = product.get("cashback_amount")
            click["refund_days"] = product.get("refund_days")
        
        # Get proof if submitted
        proof = await db.cashback_proofs.find_one({"cashback_click_id": click["id"]}, {"_id": 0})
        if proof:
            click["proof_submitted"] = True
            click["proof_status"] = proof.get("status", "pending")
            click["order_id"] = proof.get("order_id")
        else:
            click["proof_submitted"] = False
    
    return clicks

@api_router.post("/cashback/submit-proof")
async def submit_cashback_proof(req: CashbackProofSubmit, current_user = Depends(get_current_user)):
    # Verify click belongs to user
    click = await db.cashback_clicks.find_one({"id": req.cashback_click_id, "user_id": current_user["id"]}, {"_id": 0})
    if not click:
        raise HTTPException(status_code=404, detail="Cashback click not found")
    
    # Check if proof already submitted
    existing_proof = await db.cashback_proofs.find_one({"cashback_click_id": req.cashback_click_id}, {"_id": 0})
    if existing_proof:
        raise HTTPException(status_code=400, detail="Proof already submitted")
    
    proof_doc = {
        "id": str(uuid.uuid4()),
        "cashback_click_id": req.cashback_click_id,
        "user_id": current_user["id"],
        "product_id": click["product_id"],
        "order_id": req.order_id,
        "order_date": req.order_date,
        "screenshot_url": req.screenshot_url,
        "review_link": req.review_link,
        "notes": req.notes,
        "status": "pending_review",
        "review_completed": False,
        "review_live": False,
        "refund_processed": False,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.cashback_proofs.insert_one(proof_doc)
    proof_doc.pop('_id', None)
    
    # Create notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "title": "Cashback Proof Submitted",
        "message": f"Your order proof for Order ID: {req.order_id} has been submitted for review.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return proof_doc

@api_router.get("/cashback/proof-status/{click_id}")
async def get_proof_status(click_id: str, current_user = Depends(get_current_user)):
    proof = await db.cashback_proofs.find_one({"cashback_click_id": click_id, "user_id": current_user["id"]}, {"_id": 0})
    if not proof:
        return {"submitted": False}
    
    return {
        "submitted": True,
        "status": proof.get("status"),
        "review_completed": proof.get("review_completed", False),
        "review_live": proof.get("review_live", False),
        "refund_processed": proof.get("refund_processed", False),
        "order_id": proof.get("order_id"),
        "submitted_at": proof.get("submitted_at")
    }

@api_router.get("/ecommerce/products")
async def get_ecommerce_products(current_user = Depends(get_current_user)):
    if not current_user["is_paid"]:
        raise HTTPException(status_code=403, detail="Membership required")
    
    products = await db.ecommerce_products.find({"stock": {"$gt": 0}}, {"_id": 0}).to_list(100)
    
    # Apply plan-based pricing
    for product in products:
        base_price = product.get("price", 0)
        if current_user["membership_plan"] == "premium":
            # Premium users get 15% discount
            product["price"] = round(base_price * 0.85, 2)
            product["original_price"] = base_price
            product["discount_percent"] = 15
        else:
            # Basic users see regular price
            product["price"] = base_price
            product["original_price"] = None
            product["discount_percent"] = 0
    
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.withdrawal_requests.insert_one(withdrawal_doc)
    withdrawal_doc.pop('_id', None)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"wallet_balance": -req.amount}}
    )
    
    return {"success": True, "message": "Withdrawal request submitted", "withdrawal": withdrawal_doc}

@api_router.get("/wallet/withdrawal-history")
async def get_withdrawal_history(current_user = Depends(get_current_user)):
    withdrawals = await db.withdrawal_requests.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return withdrawals

@api_router.post("/wallet/add-funds")
async def add_funds_to_wallet(req: AddFundsRequest, current_user = Depends(get_current_user)):
    # Create Razorpay order for adding funds
    amount_paisa = int(req.amount * 100)
    
    order_data = {
        "amount": amount_paisa,
        "currency": "INR",
        "receipt": f"topup_{current_user['id'][:20]}",
        "notes": {
            "user_id": current_user["id"],
            "type": "wallet_topup"
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
        raise HTTPException(status_code=500, detail=f"Failed to create topup order: {str(e)}")

@api_router.post("/wallet/verify-topup")
async def verify_wallet_topup(req: VerifyPaymentRequest, current_user = Depends(get_current_user)):
    try:
        params_dict = {
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # Get order details to find amount
        order = razorpay_client.order.fetch(req.razorpay_order_id)
        amount = order["amount"] / 100
        
        # Add funds to wallet
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$inc": {"wallet_balance": amount}}
        )
        
        # Record transaction
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "type": "topup",
            "amount": amount,
            "status": "completed",
            "description": "Wallet top-up",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "amount": amount}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")

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

# Cart endpoints
@api_router.get("/cart")
async def get_cart(current_user = Depends(get_current_user)):
    cart_items = await db.cart.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    # Enrich with product details
    for item in cart_items:
        product = await db.ecommerce_products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            # Apply plan-based pricing
            base_price = product.get("price", 0)
            if current_user["membership_plan"] == "premium":
                product["price"] = round(base_price * 0.85, 2)
                product["original_price"] = base_price
            item["product"] = product
    
    return cart_items

@api_router.post("/cart/add")
async def add_to_cart(req: CartItemAdd, current_user = Depends(get_current_user)):
    # Check if product exists
    product = await db.ecommerce_products.find_one({"id": req.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already in cart
    existing = await db.cart.find_one({"user_id": current_user["id"], "product_id": req.product_id}, {"_id": 0})
    if existing:
        # Update quantity
        await db.cart.update_one(
            {"user_id": current_user["id"], "product_id": req.product_id},
            {"$inc": {"quantity": req.quantity}}
        )
    else:
        # Add new item
        cart_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "product_id": req.product_id,
            "quantity": req.quantity,
            "added_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cart.insert_one(cart_doc)
    
    return {"success": True, "message": "Added to cart"}

@api_router.delete("/cart/{item_id}")
async def remove_from_cart(item_id: str, current_user = Depends(get_current_user)):
    await db.cart.delete_one({"id": item_id, "user_id": current_user["id"]})
    return {"success": True}

@api_router.post("/cart/checkout")
async def checkout_cart(current_user = Depends(get_current_user)):
    cart_items = await db.cart.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    total_amount = 0
    orders = []
    
    for item in cart_items:
        product = await db.ecommerce_products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        
        # Apply plan-based pricing
        price = product["price"]
        if current_user["membership_plan"] == "premium":
            price = round(price * 0.85, 2)
        
        item_total = price * item["quantity"]
        total_amount += item_total
        
        # Create order
        order_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "product_id": item["product_id"],
            "quantity": item["quantity"],
            "total_amount": item_total,
            "status": "pending",
            "tracking_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.insert_one(order_doc)
        orders.append(order_doc)
        
        # Update stock
        await db.ecommerce_products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )
    
    # Clear cart
    await db.cart.delete_many({"user_id": current_user["id"]})
    
    # Deduct from wallet
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"wallet_balance": -total_amount}}
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "type": "purchase",
        "amount": total_amount,
        "status": "completed",
        "description": f"Purchase of {len(orders)} items",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "orders": orders, "total_amount": total_amount}

# Profile endpoints
@api_router.get("/profile/me")
async def get_my_profile(current_user = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "mobile": current_user["mobile"],
        "profile_picture": current_user.get("profile_picture"),
        "bio": current_user.get("bio"),
        "membership_plan": current_user["membership_plan"],
        "wallet_balance": current_user["wallet_balance"],
        "referral_code": current_user["referral_code"],
        "created_at": current_user["created_at"]
    }

@api_router.put("/profile/update")
async def update_profile(req: ProfileUpdate, current_user = Depends(get_current_user)):
    update_data = {}
    if req.name:
        update_data["name"] = req.name
    if req.mobile:
        update_data["mobile"] = req.mobile
    if req.profile_picture:
        update_data["profile_picture"] = req.profile_picture
    if req.bio:
        update_data["bio"] = req.bio
    
    if update_data:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Profile updated"}

# Social Feed endpoints
@api_router.post("/posts/create")
async def create_post(req: PostCreate, current_user = Depends(get_current_user)):
    post_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_profile_picture": current_user.get("profile_picture"),
        "content": req.content,
        "image_url": req.image_url,
        "likes": 0,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.posts.insert_one(post_doc)
    post_doc.pop('_id', None)
    return post_doc

@api_router.get("/posts/feed")
async def get_feed(current_user = Depends(get_current_user), skip: int = 0, limit: int = 20):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return posts

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user = Depends(get_current_user)):
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"likes": 1}}
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
        "is_free": req.is_free,
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
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
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
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": withdrawal["user_id"],
        "title": "Withdrawal Approved",
        "message": f"Your withdrawal of ₹{withdrawal['amount']} has been approved and processed.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True}

@api_router.put("/admin/withdrawal-requests/{request_id}/reject")
async def reject_withdrawal(request_id: str, admin_user = Depends(get_admin_user)):
    withdrawal = await db.withdrawal_requests.find_one({"id": request_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.withdrawal_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Refund amount back to wallet
    await db.users.update_one(
        {"id": withdrawal["user_id"]},
        {"$inc": {"wallet_balance": withdrawal["amount"]}}
    )
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": withdrawal["user_id"],
        "title": "Withdrawal Rejected",
        "message": f"Your withdrawal request of ₹{withdrawal['amount']} has been rejected. Amount refunded to wallet.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True}

@api_router.get("/admin/cashback-clicks")
async def get_cashback_clicks(admin_user = Depends(get_admin_user)):
    clicks = await db.cashback_clicks.find({}, {"_id": 0}).sort("clicked_at", -1).to_list(100)
    
    # Enrich with proof data
    for click in clicks:
        proof = await db.cashback_proofs.find_one({"cashback_click_id": click["id"]}, {"_id": 0})
        if proof:
            click["proof_submitted"] = True
            click["proof_data"] = proof
        else:
            click["proof_submitted"] = False
    
    return clicks

@api_router.put("/admin/cashback-proofs/{proof_id}/update-status")
async def update_proof_status(proof_id: str, status: str, admin_user = Depends(get_admin_user)):
    valid_statuses = ["pending_review", "review_completed", "review_live", "approved"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    proof = await db.cashback_proofs.find_one({"id": proof_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")
    
    update_data = {"status": status}
    
    if status == "review_completed":
        update_data["review_completed"] = True
    elif status == "review_live":
        update_data["review_live"] = True
        update_data["review_completed"] = True
    elif status == "approved":
        update_data["refund_processed"] = True
        update_data["review_live"] = True
        update_data["review_completed"] = True
        
        # Process cashback - mark as verified and paid
        click = await db.cashback_clicks.find_one({"id": proof["cashback_click_id"]}, {"_id": 0})
        if click:
            product = await db.cashback_products.find_one({"id": click["product_id"]}, {"_id": 0})
            if product:
                cashback_amount = product["cashback_amount"]
                
                # Credit to user wallet
                await db.users.update_one(
                    {"id": proof["user_id"]},
                    {"$inc": {"wallet_balance": cashback_amount}}
                )
                
                # Mark click as verified and paid
                await db.cashback_clicks.update_one(
                    {"id": proof["cashback_click_id"]},
                    {"$set": {"verified": True, "cashback_paid": True}}
                )
                
                # Create transaction
                await db.transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": proof["user_id"],
                    "type": "earning",
                    "amount": cashback_amount,
                    "status": "completed",
                    "description": f"Cashback from {product['title']}",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Notify user
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": proof["user_id"],
                    "title": "Cashback Processed!",
                    "message": f"₹{cashback_amount} cashback credited to your wallet for Order #{proof['order_id']}",
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    await db.cashback_proofs.update_one(
        {"id": proof_id},
        {"$set": update_data}
    )
    
    # Notify user about status update
    status_messages = {
        "review_completed": "Your review has been verified!",
        "review_live": "Your review is now live!",
        "approved": "Your cashback has been processed!"
    }
    
    if status in status_messages:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": proof["user_id"],
            "title": "Cashback Status Update",
            "message": status_messages[status],
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"success": True}

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
