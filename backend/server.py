from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, Fill, PatternFill, Alignment, Border, Side
import csv

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
ACCESS_TOKEN_EXPIRE_MINUTES = 10080

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
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    sub_category: Optional[str] = None
    total_quantity: int
    quantity_available: int
    quantity_out: int
    location: Optional[str] = None
    status: str = "Available"
    condition: str = "OK"
    min_stock: Optional[int] = None
    notes: Optional[str] = None
    product_id: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    vendor: Optional[str] = None
    purchase_price: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ItemCreate(BaseModel):
    name: str
    category: str
    sub_category: Optional[str] = None
    total_quantity: int
    location: Optional[str] = None
    min_stock: Optional[int] = None
    notes: Optional[str] = None
    product_id: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    vendor: Optional[str] = None
    purchase_price: Optional[float] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    total_quantity: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    min_stock: Optional[int] = None
    notes: Optional[str] = None
    product_id: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    vendor: Optional[str] = None
    purchase_price: Optional[float] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: Optional[str] = None
    # Geo-coordinates for global map
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None
    # Project details
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    owner: Optional[str] = None
    client: Optional[str] = None
    budget: Optional[float] = None
    revenue: Optional[float] = None
    project_type: Optional[str] = None  # Film, Commercial, Music Video, etc.
    status: str = "Planning"  # Planning, On Track, At Risk, Delayed, Delivered, Archived
    priority: str = "Medium"  # Low, Medium, High, Critical
    progress: int = 0  # 0-100%
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectCreate(BaseModel):
    name: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    owner: Optional[str] = None
    client: Optional[str] = None
    budget: Optional[float] = None
    revenue: Optional[float] = None
    project_type: Optional[str] = None
    status: Optional[str] = "Planning"
    priority: Optional[str] = "Medium"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    owner: Optional[str] = None
    client: Optional[str] = None
    budget: Optional[float] = None
    revenue: Optional[float] = None
    project_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    progress: Optional[int] = None

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    action: str
    entity_type: str
    entity_id: str
    entity_name: Optional[str] = None
    details: Optional[dict] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MarkOutRequest(BaseModel):
    item_id: str
    project_id: str
    quantity: int
    expected_return: str
    notes: Optional[str] = None

class MarkInRequest(BaseModel):
    checkout_id: str
    quantity_returned: int
    all_good: bool = True
    notes: Optional[str] = None
    issues: Optional[List[str]] = None

class StartPackingRequest(BaseModel):
    project_id: str

class QuickMarkInRequest(BaseModel):
    checkout_id: str
    condition: str
    quantity_returned: Optional[int] = None  # If None, returns all

class TransferEquipmentRequest(BaseModel):
    checkout_id: str
    target_project_id: str
    quantity_to_transfer: int  # Can be partial or full

class Checkout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    project_id: str
    project_name: str
    quantity_out: int
    quantity_returned: int = 0
    quantity_missing: int = 0  # Track missing items separately
    quantity_damaged: int = 0  # Track damaged items
    checkout_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expected_return: str
    return_time: Optional[str] = None
    packing_start_time: Optional[str] = None
    packing_complete_time: Optional[str] = None
    packing_duration_minutes: Optional[int] = None
    status: str = "Active"
    notes: Optional[str] = None
    repack_checklist: Optional[dict] = None

class Issue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    description: str
    issue_type: str = "Damage"  # Damage, Malfunction, Missing Part, Calibration, Other
    severity: str = "Medium"
    status: str = "Open"
    reported_by: Optional[str] = None
    reported_by_email: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    vendor_contact: Optional[str] = None
    project_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

class IssueCreate(BaseModel):
    item_id: str
    description: str
    issue_type: Optional[str] = "Damage"
    severity: Optional[str] = "Medium"
    reported_by: Optional[str] = None
    reported_by_email: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    vendor_contact: Optional[str] = None
    project_id: Optional[str] = None

class IssueUpdate(BaseModel):
    description: Optional[str] = None
    issue_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_email: Optional[str] = None
    vendor_contact: Optional[str] = None
    resolution_notes: Optional[str] = None

# Licence Management Models
class Licence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    vendor: str
    category: str  # Software, Hardware, Service, etc.
    licence_type: str = "Annual"  # Monthly, Annual, Lifetime
    cost_per_period: float
    billing_period: str  # Monthly, Quarterly, Yearly
    renewal_date: str
    status: str = "Active"  # Active, Expiring Soon, Expired, Cancelled
    seats: Optional[int] = None  # Number of licences/seats
    account_email: Optional[str] = None  # Subscription credentials
    account_password: Optional[str] = None  # Subscription credentials
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LicenceCreate(BaseModel):
    name: str
    vendor: str
    category: str
    licence_type: Optional[str] = "Annual"
    cost_per_period: float
    billing_period: str
    renewal_date: str
    status: Optional[str] = "Active"
    seats: Optional[int] = None
    account_email: Optional[str] = None
    account_password: Optional[str] = None
    notes: Optional[str] = None

class LicenceUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[str] = None
    licence_type: Optional[str] = None
    cost_per_period: Optional[float] = None
    billing_period: Optional[str] = None
    renewal_date: Optional[str] = None
    status: Optional[str] = None
    seats: Optional[int] = None
    account_email: Optional[str] = None
    account_password: Optional[str] = None
    notes: Optional[str] = None

# Purchased Assets Models
class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    vendor: str  # Platform or vendor
    category: str  # 3D Models, Stock Footage, Sound Effects, etc.
    purchase_date: str
    purchase_price: Optional[float] = None
    project_id: Optional[str] = None  # Assigned project
    project_name: Optional[str] = None
    storage_location: str  # Local server, NAS path, cloud drive, etc.
    licence_type: Optional[str] = None  # Royalty-free, Editorial, etc.
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AssetCreate(BaseModel):
    name: str
    vendor: str
    category: str
    purchase_date: str
    purchase_price: Optional[float] = None
    project_id: Optional[str] = None
    storage_location: str
    licence_type: Optional[str] = None
    notes: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    project_id: Optional[str] = None
    storage_location: Optional[str] = None
    licence_type: Optional[str] = None
    notes: Optional[str] = None

# (Shoot Log models removed)

class LostItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    project_id: str
    project_name: str
    quantity_lost: int
    date_lost: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    recovered: bool = False
    recovered_at: Optional[str] = None

class Maintenance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    maintenance_type: str
    start_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completion_date: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    status: str = "In Progress"

class MaintenanceCreate(BaseModel):
    item_id: str
    maintenance_type: str
    technician: Optional[str] = None
    notes: Optional[str] = None

class Reservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    project_id: str
    project_name: str
    quantity_reserved: int
    start_date: str
    end_date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReservationCreate(BaseModel):
    item_id: str
    project_id: str
    quantity_reserved: int
    start_date: str
    end_date: str

# Auth Routes
ALLOWED_EMAIL_DOMAIN = "@machvisuals.com"

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Validate email domain - only @machvisuals.com allowed
    if not user_data.email.lower().endswith(ALLOWED_EMAIL_DOMAIN):
        raise HTTPException(
            status_code=400, 
            detail=f"Registration restricted to {ALLOWED_EMAIL_DOMAIN} email addresses only"
        )
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token(data={"sub": user_data.email})
    user_response = UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        created_at=user_dict["created_at"]
    )
    
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(data={"sub": credentials.email})
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# Item Routes
@api_router.get("/items", response_model=List[Item])
async def get_items(current_user: dict = Depends(get_current_user)):
    items = await db.items.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/items", response_model=Item)
async def create_item(item_data: ItemCreate, current_user: dict = Depends(get_current_user)):
    item_dict = item_data.model_dump()
    item = Item(
        **item_dict,
        quantity_available=item_data.total_quantity,
        quantity_out=0
    )
    await db.items.insert_one(item.model_dump())
    return item

@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api_router.patch("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, item_data: ItemUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in item_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.items.update_one({"id": item_id}, {"$set": update_data})
    updated_item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not updated_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated_item

@api_router.put("/items/{item_id}", response_model=Item)
async def update_item_put(item_id: str, item_data: ItemUpdate, current_user: dict = Depends(get_current_user)):
    """PUT endpoint for updating items (used by frontend)"""
    existing = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in item_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Recalculate quantity_available if total_quantity changed
    if "total_quantity" in update_data:
        current_out = existing.get("quantity_out", 0)
        new_total = update_data["total_quantity"]
        update_data["quantity_available"] = new_total - current_out
    
    # Auto-create issue when condition changes to "Needs Repair" or "Damaged"
    old_condition = existing.get("condition", "OK")
    new_condition = update_data.get("condition")
    if new_condition and new_condition in ("Needs Repair", "Damaged") and old_condition not in ("Needs Repair", "Damaged"):
        # Check no existing open issue for this item
        existing_issue = await db.issues.find_one({"item_id": item_id, "status": {"$ne": "Resolved"}})
        if not existing_issue:
            issue = Issue(
                item_id=item_id,
                item_name=existing["name"],
                description=f"Item condition changed to {new_condition}",
                issue_type="Damage" if new_condition == "Damaged" else "Malfunction",
                severity="High" if new_condition == "Damaged" else "Medium",
                reported_by=current_user.get("name", current_user.get("email")),
                reported_by_email=current_user.get("email"),
            )
            await db.issues.insert_one(issue.model_dump())
        # Also set status to Under Maintenance
        update_data["status"] = "Under Maintenance"
    
    await db.items.update_one({"id": item_id}, {"$set": update_data})
    updated_item = await db.items.find_one({"id": item_id}, {"_id": 0})
    return updated_item

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Project Routes
@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return projects

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    project = Project(**project_data.model_dump())
    await db.projects.insert_one(project.model_dump())
    return project

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    active_checkouts = await db.checkouts.count_documents({"project_id": project_id, "status": "Active"})
    if active_checkouts > 0:
        raise HTTPException(status_code=400, detail="Cannot delete project with active checkouts")
    
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# Update Project
@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in project_data.model_dump().items() if v is not None}
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated

# Mark Out
@api_router.post("/checkouts/mark-out")
async def mark_out(request: MarkOutRequest, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": request.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["quantity_available"] < request.quantity:
        raise HTTPException(status_code=400, detail="Insufficient quantity available")
    
    project = await db.projects.find_one({"id": request.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    packing_start_time = datetime.now(timezone.utc).isoformat()
    
    checkout = Checkout(
        item_id=request.item_id,
        item_name=item["name"],
        project_id=request.project_id,
        project_name=project["name"],
        quantity_out=request.quantity,
        expected_return=request.expected_return,
        notes=request.notes,
        packing_start_time=packing_start_time
    )
    
    await db.checkouts.insert_one(checkout.model_dump())
    
    new_available = item["quantity_available"] - request.quantity
    new_out = item["quantity_out"] + request.quantity
    
    await db.items.update_one(
        {"id": request.item_id},
        {"$set": {"quantity_available": new_available, "quantity_out": new_out}}
    )
    
    return {"message": "Item marked out successfully", "checkout": checkout.model_dump()}

# Start Packing
@api_router.post("/checkouts/start-packing")
async def start_packing(request: StartPackingRequest, current_user: dict = Depends(get_current_user)):
    packing_start = datetime.now(timezone.utc).isoformat()
    
    await db.checkouts.update_many(
        {"project_id": request.project_id, "status": "Active"},
        {"$set": {"packing_start_time": packing_start}}
    )
    
    return {"message": "Packing timer started", "start_time": packing_start}

# Quick Mark In (simplified) - now supports partial returns
@api_router.post("/checkouts/quick-mark-in")
async def quick_mark_in(request: QuickMarkInRequest, current_user: dict = Depends(get_current_user)):
    checkout = await db.checkouts.find_one({"id": request.checkout_id}, {"_id": 0})
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found")
    
    if checkout["status"] != "Active":
        raise HTTPException(status_code=400, detail="Checkout is not active")
    
    item = await db.items.find_one({"id": checkout["item_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return_time = datetime.now(timezone.utc).isoformat()
    
    # Handle partial or full return
    already_returned = checkout.get("quantity_returned", 0)
    already_missing = checkout.get("quantity_missing", 0)
    already_damaged = checkout.get("quantity_damaged", 0)
    remaining_qty = checkout["quantity_out"] - already_returned - already_missing
    
    qty_to_process = request.quantity_returned if request.quantity_returned is not None else remaining_qty
    
    if qty_to_process > remaining_qty:
        raise HTTPException(status_code=400, detail=f"Cannot process more than {remaining_qty} items")
    
    if qty_to_process < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    
    # Track quantities based on condition
    new_quantity_returned = already_returned
    new_quantity_missing = already_missing
    new_quantity_damaged = already_damaged
    qty_to_add_back = 0
    
    if request.condition == "good":
        new_quantity_returned = already_returned + qty_to_process
        qty_to_add_back = qty_to_process
    elif request.condition == "damaged":
        new_quantity_returned = already_returned + qty_to_process
        new_quantity_damaged = already_damaged + qty_to_process
        qty_to_add_back = qty_to_process  # Damaged items still return to inventory
        issue = Issue(
            item_id=checkout["item_id"],
            item_name=checkout["item_name"],
            description=f"Item returned damaged from shoot ({qty_to_process} unit(s))",
            project_id=checkout["project_id"],
            severity="High"
        )
        await db.issues.insert_one(issue.model_dump())
    elif request.condition == "missing":
        # Missing items are NOT added back to inventory
        new_quantity_missing = already_missing + qty_to_process
        qty_to_add_back = 0  # Missing items don't return
        lost_item = LostItem(
            item_id=checkout["item_id"],
            item_name=checkout["item_name"],
            project_id=checkout["project_id"],
            project_name=checkout["project_name"],
            quantity_lost=qty_to_process
        )
        await db.lost_items.insert_one(lost_item.model_dump())
    
    # Check if all items are accounted for (returned + missing = out)
    total_accounted = new_quantity_returned + new_quantity_missing
    is_fully_accounted = total_accounted >= checkout["quantity_out"]
    
    packing_duration = None
    if is_fully_accounted and checkout.get("packing_start_time"):
        start = datetime.fromisoformat(checkout["packing_start_time"].replace('Z', '+00:00'))
        end = datetime.now(timezone.utc)
        packing_duration = int((end - start).total_seconds() / 60)
    
    # Determine final status
    if is_fully_accounted:
        if new_quantity_missing > 0:
            final_status = "Completed with Missing"
        elif new_quantity_damaged > 0:
            final_status = "Completed with Issues"
        else:
            final_status = "Completed"
    else:
        final_status = "Active"
    
    # Update checkout record
    update_data = {
        "quantity_returned": new_quantity_returned,
        "quantity_missing": new_quantity_missing,
        "quantity_damaged": new_quantity_damaged,
        "repack_checklist": {"condition": request.condition, "last_return_time": return_time}
    }
    
    if is_fully_accounted:
        update_data["status"] = final_status
        update_data["return_time"] = return_time
        update_data["packing_complete_time"] = return_time
        update_data["packing_duration_minutes"] = packing_duration
    
    await db.checkouts.update_one(
        {"id": request.checkout_id},
        {"$set": update_data}
    )
    
    # Update inventory - only add back non-missing items
    if qty_to_add_back > 0:
        new_available = item["quantity_available"] + qty_to_add_back
        new_out = item["quantity_out"] - qty_to_add_back
        await db.items.update_one(
            {"id": checkout["item_id"]},
            {"$set": {"quantity_available": new_available, "quantity_out": new_out}}
        )
    
    # For missing items, reduce total quantity and quantity_out
    if request.condition == "missing":
        new_out = item["quantity_out"] - qty_to_process
        new_total = item["total_quantity"] - qty_to_process
        await db.items.update_one(
            {"id": checkout["item_id"]},
            {"$set": {"quantity_out": new_out, "total_quantity": new_total}}
        )
    
    return {
        "message": "Item processed successfully",
        "condition": request.condition,
        "quantity_processed": qty_to_process,
        "quantity_returned": new_quantity_returned,
        "quantity_missing": new_quantity_missing,
        "quantity_damaged": new_quantity_damaged,
        "remaining": checkout["quantity_out"] - total_accounted,
        "packing_duration_minutes": packing_duration,
        "status": final_status
    }

# Mark In
@api_router.post("/checkouts/mark-in")
async def mark_in(request: MarkInRequest, current_user: dict = Depends(get_current_user)):
    checkout = await db.checkouts.find_one({"id": request.checkout_id}, {"_id": 0})
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found")
    
    if checkout["status"] != "Active":
        raise HTTPException(status_code=400, detail="Checkout is not active")
    
    item = await db.items.find_one({"id": checkout["item_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    quantity_missing = checkout["quantity_out"] - request.quantity_returned
    
    if quantity_missing > 0:
        lost_item = LostItem(
            item_id=checkout["item_id"],
            item_name=checkout["item_name"],
            project_id=checkout["project_id"],
            project_name=checkout["project_name"],
            quantity_lost=quantity_missing
        )
        await db.lost_items.insert_one(lost_item.model_dump())
    
    if request.issues:
        for issue_desc in request.issues:
            issue = Issue(
                item_id=checkout["item_id"],
                item_name=checkout["item_name"],
                description=issue_desc,
                project_id=checkout["project_id"]
            )
            await db.issues.insert_one(issue.model_dump())
    
    return_time = datetime.now(timezone.utc).isoformat()
    
    packing_duration = None
    if checkout.get("packing_start_time"):
        start = datetime.fromisoformat(checkout["packing_start_time"].replace('Z', '+00:00'))
        end = datetime.now(timezone.utc)
        packing_duration = int((end - start).total_seconds() / 60)
    
    await db.checkouts.update_one(
        {"id": request.checkout_id},
        {"$set": {
            "status": "Completed",
            "quantity_returned": request.quantity_returned,
            "return_time": return_time,
            "packing_complete_time": return_time,
            "packing_duration_minutes": packing_duration,
            "repack_checklist": {"all_good": request.all_good}
        }}
    )
    
    new_available = item["quantity_available"] + request.quantity_returned
    new_out = item["quantity_out"] - checkout["quantity_out"]
    
    await db.items.update_one(
        {"id": checkout["item_id"]},
        {"$set": {"quantity_available": new_available, "quantity_out": new_out}}
    )
    
    return {
        "message": "Item marked in successfully",
        "quantity_missing": quantity_missing,
        "packing_duration_minutes": packing_duration
    }

# Checkout Routes
@api_router.get("/checkouts/active", response_model=List[Checkout])
async def get_active_checkouts(current_user: dict = Depends(get_current_user)):
    checkouts = await db.checkouts.find({"status": "Active"}, {"_id": 0}).to_list(1000)
    return checkouts

@api_router.get("/checkouts/history", response_model=List[Checkout])
async def get_checkout_history(current_user: dict = Depends(get_current_user)):
    checkouts = await db.checkouts.find({}, {"_id": 0}).sort("checkout_time", -1).to_list(1000)
    return checkouts

# Get ALL checkouts for a project (active + completed) - for Wrap-Up Center audit
@api_router.get("/checkouts/project/{project_id}")
async def get_project_checkouts(project_id: str, current_user: dict = Depends(get_current_user)):
    checkouts = await db.checkouts.find(
        {"project_id": project_id}, 
        {"_id": 0}
    ).sort("checkout_time", -1).to_list(1000)
    return checkouts

# Transfer Equipment between projects
@api_router.post("/checkouts/transfer")
async def transfer_equipment(request: TransferEquipmentRequest, current_user: dict = Depends(get_current_user)):
    # Get the source checkout
    checkout = await db.checkouts.find_one({"id": request.checkout_id}, {"_id": 0})
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found")
    
    if checkout["status"] != "Active":
        raise HTTPException(status_code=400, detail="Can only transfer from active checkouts")
    
    # Get target project
    target_project = await db.projects.find_one({"id": request.target_project_id}, {"_id": 0})
    if not target_project:
        raise HTTPException(status_code=404, detail="Target project not found")
    
    if request.target_project_id == checkout["project_id"]:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same project")
    
    # Calculate remaining quantity in source checkout
    remaining_qty = checkout["quantity_out"] - checkout.get("quantity_returned", 0)
    
    if request.quantity_to_transfer > remaining_qty:
        raise HTTPException(status_code=400, detail=f"Cannot transfer more than {remaining_qty} items")
    
    if request.quantity_to_transfer < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    
    transfer_time = datetime.now(timezone.utc).isoformat()
    
    # Create new checkout for target project with new timestamp
    new_checkout = Checkout(
        item_id=checkout["item_id"],
        item_name=checkout["item_name"],
        project_id=request.target_project_id,
        project_name=target_project["name"],
        quantity_out=request.quantity_to_transfer,
        quantity_returned=0,
        checkout_time=transfer_time,
        expected_return=checkout["expected_return"],
        packing_start_time=transfer_time,
        notes=f"Transferred from {checkout['project_name']}"
    )
    await db.checkouts.insert_one(new_checkout.model_dump())
    
    # Update or complete the source checkout
    if request.quantity_to_transfer >= remaining_qty:
        # Full transfer - mark source as completed
        await db.checkouts.update_one(
            {"id": request.checkout_id},
            {"$set": {
                "status": "Transferred",
                "return_time": transfer_time,
                "notes": f"{checkout.get('notes', '')} | Transferred to {target_project['name']}".strip(" |")
            }}
        )
    else:
        # Partial transfer - reduce quantity in source
        new_source_qty = checkout["quantity_out"] - request.quantity_to_transfer
        await db.checkouts.update_one(
            {"id": request.checkout_id},
            {"$set": {
                "quantity_out": new_source_qty,
                "notes": f"{checkout.get('notes', '')} | Partial transfer to {target_project['name']}".strip(" |")
            }}
        )
    
    return {
        "message": f"Successfully transferred {request.quantity_to_transfer} {checkout['item_name']} to {target_project['name']}",
        "new_checkout_id": new_checkout.id,
        "quantity_transferred": request.quantity_to_transfer,
        "source_project": checkout["project_name"],
        "target_project": target_project["name"]
    }

# Issue Routes
@api_router.get("/issues", response_model=List[Issue])
async def get_issues(current_user: dict = Depends(get_current_user)):
    issues = await db.issues.find({}, {"_id": 0}).to_list(1000)
    return issues

@api_router.post("/issues", response_model=Issue)
async def create_issue(issue_data: IssueCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": issue_data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    issue_dict = issue_data.model_dump()
    issue_dict["item_name"] = item["name"]
    if not issue_dict.get("reported_by"):
        issue_dict["reported_by"] = current_user.get("name", current_user.get("email"))
    if not issue_dict.get("reported_by_email"):
        issue_dict["reported_by_email"] = current_user.get("email")
    
    issue = Issue(**issue_dict)
    await db.issues.insert_one(issue.model_dump())
    
    # Update item condition to Needs Repair if not already
    if item.get("condition") == "OK":
        await db.items.update_one({"id": issue_data.item_id}, {"$set": {"condition": "Needs Repair"}})
    
    return issue

@api_router.patch("/issues/{issue_id}")
async def update_issue(issue_id: str, current_user: dict = Depends(get_current_user), status: Optional[str] = None, issue_update: Optional[IssueUpdate] = None):
    existing = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    update_data = {}
    
    # Handle body-based update
    if issue_update:
        update_data = {k: v for k, v in issue_update.model_dump().items() if v is not None}
    
    # Handle query param status (backwards compat)
    if status:
        update_data["status"] = status
    
    if update_data.get("status") == "Resolved":
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
        # Cross-link: restore item condition to OK
        await db.items.update_one(
            {"id": existing["item_id"]},
            {"$set": {"condition": "OK", "status": "Available"}}
        )
    
    if update_data:
        await db.issues.update_one({"id": issue_id}, {"$set": update_data})
    
    updated = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    return updated

# Lost Items Routes
@api_router.get("/lost-items", response_model=List[LostItem])
async def get_lost_items(current_user: dict = Depends(get_current_user)):
    lost_items = await db.lost_items.find({}, {"_id": 0}).to_list(1000)
    return lost_items

@api_router.patch("/lost-items/{lost_item_id}")
async def mark_recovered(lost_item_id: str, current_user: dict = Depends(get_current_user)):
    await db.lost_items.update_one(
        {"id": lost_item_id},
        {"$set": {"recovered": True, "recovered_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Item marked as recovered"}

# Maintenance Routes
@api_router.get("/maintenance", response_model=List[Maintenance])
async def get_maintenance(current_user: dict = Depends(get_current_user)):
    maintenance = await db.maintenance.find({}, {"_id": 0}).to_list(1000)
    return maintenance

@api_router.post("/maintenance", response_model=Maintenance)
async def create_maintenance(maintenance_data: MaintenanceCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": maintenance_data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    maintenance = Maintenance(
        item_id=maintenance_data.item_id,
        item_name=item["name"],
        maintenance_type=maintenance_data.maintenance_type,
        technician=maintenance_data.technician,
        notes=maintenance_data.notes
    )
    await db.maintenance.insert_one(maintenance.model_dump())
    
    await db.items.update_one(
        {"id": maintenance_data.item_id},
        {"$set": {"status": "Under Maintenance"}}
    )
    
    return maintenance

@api_router.patch("/maintenance/{maintenance_id}")
async def complete_maintenance(maintenance_id: str, current_user: dict = Depends(get_current_user)):
    maintenance = await db.maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    await db.maintenance.update_one(
        {"id": maintenance_id},
        {"$set": {
            "status": "Completed",
            "completion_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.items.update_one(
        {"id": maintenance["item_id"]},
        {"$set": {"status": "Available"}}
    )
    
    return {"message": "Maintenance completed"}

# Reservation Routes
@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations(current_user: dict = Depends(get_current_user)):
    reservations = await db.reservations.find({}, {"_id": 0}).to_list(1000)
    return reservations

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation_data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": reservation_data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    project = await db.projects.find_one({"id": reservation_data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    reservation = Reservation(
        item_id=reservation_data.item_id,
        item_name=item["name"],
        project_id=reservation_data.project_id,
        project_name=project["name"],
        quantity_reserved=reservation_data.quantity_reserved,
        start_date=reservation_data.start_date,
        end_date=reservation_data.end_date
    )
    await db.reservations.insert_one(reservation.model_dump())
    return reservation

# Dashboard Stats
@api_router.get("/projects/{project_id}/packing-list-pdf")
async def generate_packing_list_pdf(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get ALL checkouts for this project (active + completed) for comparison
    all_checkouts = await db.checkouts.find(
        {"project_id": project_id, "status": {"$in": ["Active", "Completed", "Completed with Missing", "Completed with Issues", "Transferred"]}}, 
        {"_id": 0}
    ).to_list(1000)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1B1B1B'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#71717A'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1B1B1B'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    elements.append(Paragraph("MACH TRAFFIC CONTROLLER", title_style))
    elements.append(Paragraph("Equipment Packing List", subtitle_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    elements.append(Paragraph("PROJECT DETAILS", heading_style))
    
    generated_time = datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')
    
    project_data = [
        ['Project Name:', project['name']],
        ['Location:', project.get('location', 'N/A')],
        ['Start Date:', datetime.fromisoformat(project['start_date']).strftime('%B %d, %Y') if project.get('start_date') else 'N/A'],
        ['End Date:', datetime.fromisoformat(project['end_date']).strftime('%B %d, %Y') if project.get('end_date') else 'N/A'],
        ['Project Owner:', project.get('owner', 'N/A')],
        ['Status:', project['status']],
        ['Generated:', generated_time]
    ]
    
    project_table = Table(project_data, colWidths=[2*inch, 4*inch])
    project_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#71717A')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1B1B1B')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E5E5'))
    ]))
    
    elements.append(project_table)
    elements.append(Spacer(1, 0.4 * inch))
    
    # EQUIPMENT COMPARISON TABLE - Shows Out vs Returned vs Missing vs Remaining
    elements.append(Paragraph("EQUIPMENT STATUS COMPARISON", heading_style))
    
    if not all_checkouts:
        elements.append(Paragraph("No equipment records for this project.", styles['Normal']))
    else:
        # Updated comparison table with missing column
        item_name_style = ParagraphStyle(
            'ItemName',
            parent=styles['Normal'],
            fontSize=8,
            fontName='Helvetica',
            leading=10,
            wordWrap='CJK'
        )
        item_name_header_style = ParagraphStyle(
            'ItemNameHeader',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.black,
            leading=11
        )
        
        equipment_data = [
            [Paragraph('Item Name', item_name_header_style), 'Qty Out', 'Returned', 'Missing', 'Pending', 'Status']
        ]
        
        total_out = 0
        total_returned = 0
        total_missing = 0
        total_pending = 0
        
        for checkout in all_checkouts:
            item = await db.items.find_one({"id": checkout['item_id']}, {"_id": 0})
            qty_out = checkout['quantity_out']
            qty_returned = checkout.get('quantity_returned', 0)
            qty_missing = checkout.get('quantity_missing', 0)
            qty_pending = qty_out - qty_returned - qty_missing
            
            total_out += qty_out
            total_returned += qty_returned
            total_missing += qty_missing
            total_pending += max(0, qty_pending)
            
            # Determine status - CRITICAL: Missing items = NOT VERIFIED
            if checkout['status'] == 'Transferred':
                status = 'TRANSFERRED'
            elif qty_missing > 0:
                status = '✕ MISSING'
            elif qty_pending > 0:
                status = '○ PENDING'
            elif checkout.get('quantity_damaged', 0) > 0:
                status = '⚠ DAMAGED'
            else:
                status = '✓ COMPLETE'
            
            equipment_data.append([
                Paragraph(checkout['item_name'], item_name_style),
                str(qty_out),
                str(qty_returned),
                str(qty_missing) if qty_missing > 0 else '—',
                str(qty_pending) if qty_pending > 0 else '—',
                status
            ])
        
        equipment_table = Table(equipment_data, colWidths=[2.4*inch, 0.6*inch, 0.7*inch, 0.6*inch, 0.6*inch, 0.9*inch])
        equipment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F9982E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (5, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E5E5')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')])
        ]))
        
        elements.append(equipment_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # Summary with comparison - CRITICAL: Show missing separately
        verified_returned = total_returned  # Only items actually back
        completion_pct = round((verified_returned / total_out * 100), 1) if total_out > 0 else 0
        
        # CRITICAL FIX: Only 100% verified if NO missing items AND all returned
        is_fully_verified = total_missing == 0 and total_pending == 0 and total_out > 0
        
        summary_data = [
            ['Total Items Checked Out:', str(len(all_checkouts))],
            ['Total Quantity Out:', str(total_out)],
            ['Total Quantity Returned:', str(total_returned)],
            ['Total Quantity Missing:', str(total_missing)],
            ['Total Pending Return:', str(total_pending)],
            ['Verified Completion:', f'{completion_pct}%']
        ]
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F5F5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1B1B1B')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E5E5')),
            # Highlight missing row in red if any missing
            ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#FEE2E2') if total_missing > 0 else colors.HexColor('#F5F5F5')),
            ('TEXTCOLOR', (1, 3), (1, 3), colors.HexColor('#DC2626') if total_missing > 0 else colors.HexColor('#1B1B1B'))
        ]))
        
        elements.append(summary_table)
        
        # CRITICAL: Show different message based on verification status
        elements.append(Spacer(1, 0.3 * inch))
        
        if total_missing > 0:
            # ITEMS ARE MISSING - NOT VERIFIED
            warning_style = ParagraphStyle(
                'Warning',
                parent=styles['Normal'],
                fontSize=14,
                textColor=colors.HexColor('#DC2626'),
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=10
            )
            
            warning_box = ParagraphStyle(
                'WarningBox',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#DC2626'),
                alignment=TA_CENTER
            )
            
            elements.append(Paragraph("✕ INVENTORY VERIFICATION FAILED", warning_style))
            elements.append(Paragraph(f"{total_missing} item(s) are MISSING from this project.", warning_box))
            elements.append(Paragraph(f"Only {total_returned} of {total_out} items have been returned to inventory.", warning_box))
            elements.append(Paragraph("This project CANNOT be considered fully verified until all items are accounted for.", warning_box))
        
        elif total_pending > 0:
            # ITEMS STILL PENDING
            pending_style = ParagraphStyle(
                'Pending',
                parent=styles['Normal'],
                fontSize=14,
                textColor=colors.HexColor('#F59E0B'),
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=10
            )
            
            pending_box = ParagraphStyle(
                'PendingBox',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#1B1B1B'),
                alignment=TA_CENTER
            )
            
            elements.append(Paragraph("○ VERIFICATION IN PROGRESS", pending_style))
            elements.append(Paragraph(f"{total_pending} item(s) are still pending return.", pending_box))
        
        elif is_fully_verified:
            # ALL ITEMS RETURNED - 100% VERIFIED
            confirmation_style = ParagraphStyle(
                'Confirmation',
                parent=styles['Normal'],
                fontSize=14,
                textColor=colors.HexColor('#10B981'),
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                spaceAfter=10
            )
            
            confirmation_box = ParagraphStyle(
                'ConfirmationBox',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#1B1B1B'),
                alignment=TA_CENTER
            )
            
            elements.append(Paragraph("✓ 100% INVENTORY VERIFIED", confirmation_style))
            elements.append(Paragraph(f"All {total_out} item(s) assigned to this project have been verified and returned to inventory.", confirmation_box))
            elements.append(Paragraph(f"Verification completed on {generated_time}", confirmation_box))
    
    elements.append(Spacer(1, 0.5 * inch))
    
    elements.append(Paragraph("HANDOVER SIGNATURES", heading_style))
    
    signature_data = [
        ['Checked Out By:', '_' * 40, 'Date:', '_' * 20],
        ['', '', '', ''],
        ['Received By:', '_' * 40, 'Date:', '_' * 20],
    ]
    
    signature_table = Table(signature_data, colWidths=[1.3*inch, 2.5*inch, 0.7*inch, 1.5*inch])
    signature_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#71717A')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(signature_table)
    
    elements.append(Spacer(1, 0.3 * inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#71717A'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Generated by Mach Traffic Controller | Keep this document with equipment at all times", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"packing_list_{project['name'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/projects/{project_id}/packing-stats")
async def get_packing_stats(project_id: str, current_user: dict = Depends(get_current_user)):
    checkouts = await db.checkouts.find(
        {"project_id": project_id, "status": "Completed", "packing_duration_minutes": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    if not checkouts:
        return {
            "total_items": 0,
            "average_time_minutes": 0,
            "total_time_minutes": 0,
            "fastest_item": None,
            "slowest_item": None
        }
    
    durations = [c["packing_duration_minutes"] for c in checkouts]
    total_time = sum(durations)
    avg_time = total_time / len(durations)
    
    fastest = min(checkouts, key=lambda x: x["packing_duration_minutes"])
    slowest = max(checkouts, key=lambda x: x["packing_duration_minutes"])
    
    return {
        "total_items": len(checkouts),
        "average_time_minutes": round(avg_time, 1),
        "total_time_minutes": total_time,
        "fastest_item": {
            "name": fastest["item_name"],
            "time_minutes": fastest["packing_duration_minutes"]
        },
        "slowest_item": {
            "name": slowest["item_name"],
            "time_minutes": slowest["packing_duration_minutes"]
        }
    }

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    items_count = await db.items.count_documents({})
    items_out = await db.items.count_documents({"quantity_out": {"$gt": 0}})
    active_checkouts = await db.checkouts.count_documents({"status": "Active"})
    
    now = datetime.now(timezone.utc)
    overdue_checkouts = []
    active = await db.checkouts.find({"status": "Active"}, {"_id": 0}).to_list(1000)
    for checkout in active:
        try:
            expected = datetime.fromisoformat(checkout["expected_return"].replace('Z', '+00:00'))
            if expected < now:
                overdue_checkouts.append(checkout)
        except:
            pass
    
    open_issues = await db.issues.count_documents({"status": "Open"})
    lost_items = await db.lost_items.count_documents({"recovered": False})
    under_maintenance = await db.items.count_documents({"status": "Under Maintenance"})
    active_projects = await db.projects.count_documents({"status": "Active"})
    
    low_stock_items = []
    items = await db.items.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if item.get("min_stock") and item["quantity_available"] <= item["min_stock"]:
            low_stock_items.append(item)
    
    return {
        "total_items": items_count,
        "items_currently_out": items_out,
        "active_checkouts": active_checkouts,
        "overdue_count": len(overdue_checkouts),
        "overdue_items": overdue_checkouts,
        "open_issues": open_issues,
        "lost_items_count": lost_items,
        "under_maintenance_count": under_maintenance,
        "active_projects": active_projects,
        "low_stock_items": low_stock_items
    }

# Licence Management Routes
@api_router.get("/licences")
async def get_licences(current_user: dict = Depends(get_current_user)):
    licences = await db.licences.find({}, {"_id": 0}).to_list(1000)
    return licences

@api_router.post("/licences")
async def create_licence(licence_data: LicenceCreate, current_user: dict = Depends(get_current_user)):
    licence = Licence(**licence_data.model_dump())
    await db.licences.insert_one(licence.model_dump())
    return licence

@api_router.get("/licences/{licence_id}")
async def get_licence(licence_id: str, current_user: dict = Depends(get_current_user)):
    licence = await db.licences.find_one({"id": licence_id}, {"_id": 0})
    if not licence:
        raise HTTPException(status_code=404, detail="Licence not found")
    return licence

@api_router.put("/licences/{licence_id}")
async def update_licence(licence_id: str, licence_data: LicenceUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.licences.find_one({"id": licence_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Licence not found")
    
    update_data = {k: v for k, v in licence_data.model_dump().items() if v is not None}
    
    await db.licences.update_one(
        {"id": licence_id},
        {"$set": update_data}
    )
    
    updated = await db.licences.find_one({"id": licence_id}, {"_id": 0})
    return updated

@api_router.delete("/licences/{licence_id}")
async def delete_licence(licence_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.licences.delete_one({"id": licence_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Licence not found")
    return {"message": "Licence deleted successfully"}

@api_router.get("/licences/stats/summary")
async def get_licence_stats(current_user: dict = Depends(get_current_user)):
    licences = await db.licences.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate annual spend
    total_annual = 0
    by_category = {}
    by_vendor = {}
    
    for licence in licences:
        if licence.get("status") != "Cancelled":
            cost = licence.get("cost_per_period", 0)
            period = licence.get("billing_period", "Monthly")
            
            # Convert to annual
            if period == "Monthly":
                annual = cost * 12
            elif period == "Quarterly":
                annual = cost * 4
            else:  # Yearly
                annual = cost
            
            total_annual += annual
            
            # Group by category
            cat = licence.get("category", "Other")
            by_category[cat] = by_category.get(cat, 0) + annual
            
            # Group by vendor
            vendor = licence.get("vendor", "Unknown")
            by_vendor[vendor] = by_vendor.get(vendor, 0) + annual
    
    # Check for expiring soon (within 30 days)
    now = datetime.now(timezone.utc)
    expiring_soon = []
    for licence in licences:
        if licence.get("status") == "Active" and licence.get("renewal_date"):
            try:
                renewal = datetime.fromisoformat(licence["renewal_date"].replace('Z', '+00:00'))
                if renewal.tzinfo is None:
                    renewal = renewal.replace(tzinfo=timezone.utc)
                days_until = (renewal - now).days
                if 0 <= days_until <= 30:
                    expiring_soon.append({
                        "id": licence["id"],
                        "name": licence["name"],
                        "renewal_date": licence["renewal_date"],
                        "days_until": days_until
                    })
            except:
                pass
    
    return {
        "total_annual_spend": round(total_annual, 2),
        "total_licences": len(licences),
        "active_licences": len([l for l in licences if l.get("status") == "Active"]),
        "by_category": by_category,
        "by_vendor": by_vendor,
        "expiring_soon": expiring_soon
    }

# Purchased Assets Routes
@api_router.get("/assets")
async def get_assets(current_user: dict = Depends(get_current_user)):
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    # Populate project names
    for asset in assets:
        if asset.get("project_id"):
            project = await db.projects.find_one({"id": asset["project_id"]}, {"_id": 0})
            asset["project_name"] = project["name"] if project else None
    return assets

@api_router.post("/assets")
async def create_asset(asset_data: AssetCreate, current_user: dict = Depends(get_current_user)):
    asset_dict = asset_data.model_dump()
    
    # Get project name if project_id provided
    if asset_dict.get("project_id"):
        project = await db.projects.find_one({"id": asset_dict["project_id"]}, {"_id": 0})
        asset_dict["project_name"] = project["name"] if project else None
    
    asset = Asset(**asset_dict)
    await db.assets.insert_one(asset.model_dump())
    return asset

@api_router.get("/assets/{asset_id}")
async def get_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@api_router.put("/assets/{asset_id}")
async def update_asset(asset_id: str, asset_data: AssetUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = {k: v for k, v in asset_data.model_dump().items() if v is not None}
    
    # Get project name if project_id updated
    if "project_id" in update_data:
        if update_data["project_id"]:
            project = await db.projects.find_one({"id": update_data["project_id"]}, {"_id": 0})
            update_data["project_name"] = project["name"] if project else None
        else:
            update_data["project_name"] = None
    
    await db.assets.update_one(
        {"id": asset_id},
        {"$set": update_data}
    )
    
    updated = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    return updated

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted successfully"}


# ==================== ACTIVITY LOG ====================

async def log_activity(user: dict, action: str, entity_type: str, entity_id: str, entity_name: str = None, details: dict = None):
    log = ActivityLog(
        user_id=user.get("id", user.get("email")),
        user_name=user.get("name", user.get("email")),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details
    )
    await db.activity_logs.insert_one(log.model_dump())

@api_router.get("/activity-logs")
async def get_activity_logs(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

@api_router.get("/dashboard/recent-activity")
async def get_recent_activity(current_user: dict = Depends(get_current_user), limit: int = 30):
    """Get recent activity across the system for the dashboard notifications feed."""
    activities = []

    # Recent checkouts
    recent_checkouts = await db.checkouts.find({}, {"_id": 0}).sort("checkout_time", -1).to_list(15)
    for c in recent_checkouts:
        activities.append({
            "type": "checkout",
            "action": "marked_out" if c["status"] == "Active" else c["status"].lower().replace(" ", "_"),
            "description": f"{c['item_name']} — {c['project_name']}",
            "detail": f"Qty: {c['quantity_out']}" + (f", Returned: {c.get('quantity_returned', 0)}" if c.get("quantity_returned") else ""),
            "timestamp": c["checkout_time"],
            "status": c["status"]
        })

    # Recent issues
    recent_issues = await db.issues.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    for i in recent_issues:
        activities.append({
            "type": "issue",
            "action": "reported",
            "description": f"Issue: {i['item_name']}",
            "detail": i["description"][:80],
            "timestamp": i["created_at"],
            "status": i["status"]
        })

    # Recent lost items
    recent_lost = await db.lost_items.find({}, {"_id": 0}).sort("date_lost", -1).to_list(5)
    for l in recent_lost:
        activities.append({
            "type": "lost_item",
            "action": "recovered" if l.get("recovered") else "lost",
            "description": f"Lost: {l['item_name']}",
            "detail": f"Qty: {l['quantity_lost']} from {l['project_name']}",
            "timestamp": l["date_lost"],
            "status": "Recovered" if l.get("recovered") else "Missing"
        })

    # Recent maintenance
    recent_maint = await db.maintenance.find({}, {"_id": 0}).sort("start_date", -1).to_list(5)
    for m in recent_maint:
        activities.append({
            "type": "maintenance",
            "action": m["status"].lower(),
            "description": f"Maintenance: {m['item_name']}",
            "detail": m["maintenance_type"],
            "timestamp": m["start_date"],
            "status": m["status"]
        })

    # Sort all by timestamp descending
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return activities[:limit]


# ==================== DOCUMENTATION ====================

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    file_name: str
    file_size: int
    file_type: str
    category: str = "General"
    description: Optional[str] = None
    uploaded_by: Optional[str] = None
    file_data: Optional[str] = None  # base64 encoded
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user), category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    docs = await db.documents.find(query, {"_id": 0, "file_data": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.get("/document-categories")
async def get_document_categories(current_user: dict = Depends(get_current_user)):
    cats = await db.document_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return [c["name"] for c in cats]

@api_router.post("/document-categories")
async def create_document_category(current_user: dict = Depends(get_current_user), name: str = ""):
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Category name required")
    name = name.strip()
    existing = await db.document_categories.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    await db.document_categories.insert_one({"name": name, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"name": name}

@api_router.post("/documents")
async def upload_document(current_user: dict = Depends(get_current_user), file: UploadFile = File(...), name: str = Form(...), category: str = Form("General"), description: str = Form("")):
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB.")
    
    import base64
    encoded = base64.b64encode(contents).decode('utf-8')
    
    doc = Document(
        name=name,
        file_name=file.filename,
        file_size=len(contents),
        file_type=file.content_type or "application/octet-stream",
        category=category,
        description=description,
        uploaded_by=current_user.get("name", current_user.get("email")),
        file_data=encoded
    )
    await db.documents.insert_one(doc.model_dump())
    return {"id": doc.id, "name": doc.name, "file_name": doc.file_name, "file_size": doc.file_size, "file_type": doc.file_type, "category": doc.category, "description": doc.description, "uploaded_by": doc.uploaded_by, "created_at": doc.created_at}

@api_router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    import base64
    file_bytes = base64.b64decode(doc["file_data"])
    
    return StreamingResponse(
        BytesIO(file_bytes),
        media_type=doc["file_type"],
        headers={"Content-Disposition": f'attachment; filename="{doc["file_name"]}"'}
    )

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}


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