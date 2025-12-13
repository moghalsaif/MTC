from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
    total_quantity: int
    quantity_available: int
    quantity_out: int
    location_in_studio: Optional[str] = None
    status: str = "Available"
    condition: str = "OK"
    min_stock: Optional[int] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ItemCreate(BaseModel):
    name: str
    category: str
    total_quantity: int
    location_in_studio: Optional[str] = None
    min_stock: Optional[int] = None
    notes: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_quantity: Optional[int] = None
    location_in_studio: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    min_stock: Optional[int] = None
    notes: Optional[str] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    owner: Optional[str] = None
    status: str = "Planning"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProjectCreate(BaseModel):
    name: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[str] = "Planning"

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

class Checkout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    project_id: str
    project_name: str
    quantity_out: int
    quantity_returned: int = 0
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
    severity: str = "Medium"
    status: str = "Open"
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

class IssueCreate(BaseModel):
    item_id: str
    description: str
    severity: Optional[str] = "Medium"
    assigned_to: Optional[str] = None
    project_id: Optional[str] = None

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
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
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
    
    checkout = Checkout(
        item_id=request.item_id,
        item_name=item["name"],
        project_id=request.project_id,
        project_name=project["name"],
        quantity_out=request.quantity,
        expected_return=request.expected_return,
        notes=request.notes
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

# Quick Mark In (simplified)
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
    quantity_returned = checkout["quantity_out"]
    
    packing_duration = None
    if checkout.get("packing_start_time"):
        start = datetime.fromisoformat(checkout["packing_start_time"].replace('Z', '+00:00'))
        end = datetime.now(timezone.utc)
        packing_duration = int((end - start).total_seconds() / 60)
    
    if request.condition == "damaged":
        issue = Issue(
            item_id=checkout["item_id"],
            item_name=checkout["item_name"],
            description="Item returned damaged from shoot",
            project_id=checkout["project_id"],
            severity="High"
        )
        await db.issues.insert_one(issue.model_dump())
    elif request.condition == "missing":
        lost_item = LostItem(
            item_id=checkout["item_id"],
            item_name=checkout["item_name"],
            project_id=checkout["project_id"],
            project_name=checkout["project_name"],
            quantity_lost=checkout["quantity_out"]
        )
        await db.lost_items.insert_one(lost_item.model_dump())
        quantity_returned = 0
    
    await db.checkouts.update_one(
        {"id": request.checkout_id},
        {"$set": {
            "status": "Completed",
            "quantity_returned": quantity_returned,
            "return_time": return_time,
            "packing_complete_time": return_time,
            "packing_duration_minutes": packing_duration,
            "repack_checklist": {"condition": request.condition}
        }}
    )
    
    new_available = item["quantity_available"] + quantity_returned
    new_out = item["quantity_out"] - checkout["quantity_out"]
    
    await db.items.update_one(
        {"id": checkout["item_id"]},
        {"$set": {"quantity_available": new_available, "quantity_out": new_out}}
    )
    
    return {
        "message": "Item marked in successfully",
        "packing_duration_minutes": packing_duration,
        "condition": request.condition
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
    
    await db.checkouts.update_one(
        {"id": request.checkout_id},
        {"$set": {
            "status": "Completed",
            "quantity_returned": request.quantity_returned,
            "return_time": datetime.now(timezone.utc).isoformat(),
            "repack_checklist": request.repack_checklist
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
    
    issue = Issue(
        item_id=issue_data.item_id,
        item_name=item["name"],
        description=issue_data.description,
        severity=issue_data.severity or "Medium",
        assigned_to=issue_data.assigned_to,
        project_id=issue_data.project_id
    )
    await db.issues.insert_one(issue.model_dump())
    return issue

@api_router.patch("/issues/{issue_id}")
async def update_issue(issue_id: str, status: str, current_user: dict = Depends(get_current_user)):
    update_data = {"status": status}
    if status == "Resolved":
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.issues.update_one({"id": issue_id}, {"$set": update_data})
    return {"message": "Issue updated successfully"}

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
    
    active_checkouts = await db.checkouts.find(
        {"project_id": project_id, "status": "Active"}, 
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
    
    elements.append(Paragraph("FLIGHT DECK", title_style))
    elements.append(Paragraph("Equipment Packing List", subtitle_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    elements.append(Paragraph("PROJECT DETAILS", heading_style))
    
    project_data = [
        ['Project Name:', project['name']],
        ['Location:', project.get('location', 'N/A')],
        ['Start Date:', datetime.fromisoformat(project['start_date']).strftime('%B %d, %Y') if project.get('start_date') else 'N/A'],
        ['End Date:', datetime.fromisoformat(project['end_date']).strftime('%B %d, %Y') if project.get('end_date') else 'N/A'],
        ['Project Owner:', project.get('owner', 'N/A')],
        ['Status:', project['status']],
        ['Generated:', datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p UTC')]
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
    
    elements.append(Paragraph("EQUIPMENT CHECKED OUT", heading_style))
    
    if not active_checkouts:
        elements.append(Paragraph("No equipment currently checked out for this project.", styles['Normal']))
    else:
        equipment_data = [['Item Name', 'Category', 'Qty Out', 'Expected Return', 'Notes']]
        
        for checkout in active_checkouts:
            item = await db.items.find_one({"id": checkout['item_id']}, {"_id": 0})
            expected_return = datetime.fromisoformat(checkout['expected_return'].replace('Z', '+00:00')).strftime('%m/%d/%Y %I:%M %p')
            
            equipment_data.append([
                checkout['item_name'],
                item['category'] if item else 'N/A',
                str(checkout['quantity_out']),
                expected_return,
                checkout.get('notes', '')[:30] + '...' if checkout.get('notes') and len(checkout.get('notes', '')) > 30 else checkout.get('notes', '')
            ])
        
        equipment_table = Table(equipment_data, colWidths=[2*inch, 1.2*inch, 0.7*inch, 1.3*inch, 1.3*inch])
        equipment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F9982E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E5E5')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')])
        ]))
        
        elements.append(equipment_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        total_items = len(active_checkouts)
        total_quantity = sum(c['quantity_out'] for c in active_checkouts)
        
        summary_data = [
            ['Total Items:', str(total_items)],
            ['Total Quantity:', str(total_quantity)]
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F5F5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1B1B1B')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E5E5'))
        ]))
        
        elements.append(summary_table)
    
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
    elements.append(Paragraph("Generated by Flight Deck Equipment Tracker | Keep this document with equipment at all times", footer_style))
    
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