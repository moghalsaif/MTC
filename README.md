# Flight Deck - Equipment Tracker Dashboard

A professional equipment tracking system for virtual production studios, designed to manage gear movement for shoots with real-time inventory control.

## Overview

Flight Deck helps production studios track equipment movement between studio and shoot locations. It provides instant visibility into what's available, what's out on shoots, and what needs attention.

## Features

### Core Workflows

**Mark Out (Send Gear to Shoot)**
- One-click workflow from equipment list
- Select project/shoot destination
- Set quantity and expected return date
- Automatic stock updates
- Optional notes and photos

**Mark In (Return Gear to Studio)**
- Quick return from "Items Out" view
- Built-in repack checklist (parts, batteries, cables, damage check)
- Auto-create Issues for damaged items
- Auto-create Lost Items for missing quantities
- Automatic stock reconciliation

### Dashboards

**Main Dashboard**
- Items Currently Out
- Overdue Gear (with alerts)
- Active Projects
- Open Issues
- Items Under Maintenance
- Lost Items (Unresolved)
- Low Stock Alerts

**Inventory View**
- Complete equipment list with live quantities
- Available / Out / Total stock columns
- Search and filter by category/status
- One-tap Mark Out buttons
- Add new items

**Items Currently Out**
- Grouped by Project
- Expected return dates with overdue flags
- Quick Mark In buttons
- Checkout history

**Project Management**
- Create and manage shoots/projects
- Associate equipment with projects
- Track project status (Planning/Active/Wrapped)

**Issues Dashboard**
- Track damaged or malfunctioning equipment
- Severity levels (Low/Medium/High/Critical)
- Assign to technicians
- Resolve issues

**Lost Items Dashboard**
- Track missing equipment
- Associate with projects where lost
- Mark as recovered

**Maintenance Dashboard**
- Schedule and track maintenance
- Types: Repair, Calibration, Firmware, Service
- Items marked "Under Maintenance" unavailable for checkout
- Return to "Available" when complete

### Business Logic

- **Live Quantities**: Real-time calculation of available vs. out
- **Overdue Detection**: Automatic flagging of gear past expected return
- **Auto-Issue Creation**: Damaged items create Issues automatically
- **Auto-Lost Creation**: Missing quantities create Lost Item records
- **Quantity-Based Tracking**: No serial numbers, just quantities
- **Reservation System**: Reserve gear for future shoots (prevents conflicts)
- **Low Stock Alerts**: Notifications for items below minimum stock

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS
- **Database**: MongoDB
- **Authentication**: JWT
- **UI Components**: Shadcn/UI + Radix UI

## Design System

**The Flight Deck Aesthetic**
- Industrial dark mode (#1B1B1B background)
- Safety orange (#F9982E) accents for primary actions
- Chivo font for headings
- Manrope for body text
- JetBrains Mono for data/numbers
- Sharp edges, high contrast, tactical feel

## Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Seed database with initial equipment
python seed_data.py

# Start server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```

### Environment Variables

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=equipment_tracker
JWT_SECRET_KEY=your-secret-key-here
CORS_ORIGINS=*
```

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

## Database Schema

### Items
- ID, Name, Category
- Total Quantity, Quantity Available, Quantity Out
- Location in Studio
- Status (Available/Reserved/Under Maintenance/Lost)
- Condition (OK/Needs Service/Damaged)
- Min Stock (for low stock alerts)

### Projects
- ID, Name, Location, Shoot Dates
- Owner, Status (Planning/Active/Wrapped)
- Expected Return

### Checkouts
- Item ID, Project ID, Quantity Out, Quantity Returned
- Checkout Time, Expected Return, Return Time
- Status (Active/Completed)
- Repack Checklist, Notes

### Issues
- Item ID, Description, Severity, Status
- Assigned To, Created/Resolved Dates

### Lost Items
- Item ID, Project ID, Quantity Lost
- Date Lost, Recovered (Yes/No), Recovered Date

### Maintenance
- Item ID, Type (Repair/Calibration/Firmware/Service)
- Start/Completion Dates, Technician, Cost, Notes
- Status (In Progress/Completed)

### Reservations
- Item ID, Project ID, Quantity Reserved
- Start/End Dates

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Items
- `GET /api/items` - List all items
- `POST /api/items` - Create item
- `GET /api/items/{id}` - Get item
- `PATCH /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Delete item

### Checkouts
- `POST /api/checkouts/mark-out` - Mark item out
- `POST /api/checkouts/mark-in` - Mark item in
- `GET /api/checkouts/active` - Get active checkouts
- `GET /api/checkouts/history` - Get checkout history

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project

### Issues
- `GET /api/issues` - List issues
- `POST /api/issues` - Create issue
- `PATCH /api/issues/{id}` - Update issue status

### Lost Items
- `GET /api/lost-items` - List lost items
- `PATCH /api/lost-items/{id}` - Mark recovered

### Maintenance
- `GET /api/maintenance` - List maintenance records
- `POST /api/maintenance` - Start maintenance
- `PATCH /api/maintenance/{id}` - Complete maintenance

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Usage Guide

### Daily Operations

**Starting Your Day**
1. Check Dashboard for overdue gear
2. Review Items Currently Out
3. Check Low Stock alerts

**Sending Gear to Shoot**
1. Go to Inventory
2. Find item in list
3. Click "Mark Out" next to item
4. Select Project/Shoot
5. Enter quantity and expected return
6. Add notes if needed
7. Confirm

**Receiving Gear Back**
1. Go to "Items Currently Out"
2. Find item/project
3. Click "Mark In"
4. Enter quantity returned
5. Complete repack checklist
6. Report any issues
7. Confirm

**Handling Issues**
- Damaged items: Use repack checklist to flag damage
- Missing items: Return less than checked out - system creates Lost Item
- Broken equipment: Go to Issues → Report Issue

**Maintenance**
1. Go to Maintenance
2. Click "Start Maintenance"
3. Select item, type, technician
4. Item marked "Under Maintenance" (unavailable)
5. When done: Click "Complete"
6. Item returns to "Available"

## Pre-Populated Equipment

The system comes pre-seeded with 83 items from your studio's equipment list including:

- Cameras: Blackmagic Pocket Cinema Camera 6K G2, Sony FX3
- Lenses: Canon 24-70mm EF
- Lighting: Amaran 300c, C Stands, Light Stands
- Audio: Hollyland LARK M2, Tentacle Sync
- Computing: RTX 4070/4080 setups, Apple iPad Pro
- Storage: Samsung T7 SSDs, AJA Drives
- Video: Blackmagic SDI Distribution, Converters
- Tracking: Jio Tracker, VR: Meta Quest 3
- Power: Batteries, Chargers, Cables
- And more...

## User Credentials

Credentials are managed by your system administrator.

## Support & Issues

For issues or questions, contact your system administrator.

## License

Proprietary - Virtual Production Studio Internal Use Only
