# Mach Traffic Controller — PRD

## Original Problem Statement
Equipment tracker dashboard for Mach Visuals, a virtual production company. The system manages physical equipment inventory for film/VFX production — tracking items in/out, project assignments, issues, maintenance, licences, and lost items.

## User Personas
- **Equipment Manager**: Tracks gear in/out for productions, manages inventory
- **Project Lead**: Views project-level equipment allocation
- **Admin**: Full access to all modules including licences

## Core Requirements
- Equipment inventory with categories (Camera & Optics, Lighting, Audio, etc.)
- Check-out/check-in workflow with project assignment
- Issue tracking for damaged equipment
- Lost items tracking
- Maintenance scheduling
- Licence & asset management
- Registration restricted to @machvisuals.com emails
- Dark theme with orange (#F9982E) brand accent

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT tokens
- **Data**: 90 items from MASTER FINALS.xlsx

## Architecture
```
/app/backend/server.py     — Single-file FastAPI (all routes, models)
/app/frontend/src/
  App.js                   — Router
  components/Layout.js     — Navigation (grouped sections)
  pages/Dashboard.js       — Stats + activity feed
  pages/Inventory.js       — Equipment list with filters
  pages/ItemsOut.js        — Active checkouts
  pages/Projects.js        — Project management
  pages/Licences.js        — Licence & asset dashboard
  pages/Issues.js          — Issue tracker
  pages/LostItems.js       — Missing equipment
  pages/Maintenance.js     — Maintenance records
  pages/Login.js           — Auth (login/register)
```

## What's Been Implemented (Feb 2026)
- [x] Full equipment CRUD with 90 items from MASTER FINALS.xlsx
- [x] 12 categories: Camera & Optics, Lighting, Audio, Video & Capture, Computing, Displays, Storage & Media, Networking, Power & Cables, Hardware & Tools, Tracking, Chroma Mat
- [x] Sub-categories in data model
- [x] Enhanced Add Item form with logging: Product ID, Serial Number, Purchase Date, Expiry Date, Warranty Expiry, Vendor, Purchase Price, Notes
- [x] Inventory page with category sidebar, grouped view, and sub-category display
- [x] Check-out / check-in workflow with partial returns
- [x] Equipment transfer between projects
- [x] Project management (CRUD, status tracking)
- [x] Issue tracking (auto-created for damaged returns)
- [x] Lost items tracking
- [x] Maintenance scheduling
- [x] Licence & asset management
- [x] Dashboard with 7 stat cards (clean, no activity clutter)
- [x] Documentation module: upload/download/delete with **user-created custom categories**
- [x] Dropdown navigation menus (Mach Traffic Controller dropdown, single links for Licences & Documents)
- [x] Edit existing inventory items (quantity, status, condition, all fields) via pencil icon
- [x] Location field is city-based (not studio location)
- [x] Font size 10% larger globally
- [x] Dark gradient background with orange accent
- [x] @machvisuals.com email domain restriction
- [x] PDF packing list with Paragraph wrapping for long item names
- [x] Wrap-up center with verification logic
- [x] Dead code cleanup (~700 lines removed: shoot logs, employees, tasks, command center)

## Navigation Structure
1. **Mach Traffic Controller**: Dashboard, Inventory, Items Out, Projects, Issues, Lost Items, Maintenance
2. **Licences & Assets**: Licences & Assets page
3. **Documentation**: Coming soon (placeholder)

## Key API Endpoints
- `POST /api/auth/register` — @machvisuals.com only
- `POST /api/auth/login`
- `GET /api/items` — 90 items with sub_category
- `GET /api/dashboard/stats` — Overview stats
- `GET /api/dashboard/recent-activity` — Activity feed for dashboard
- `POST /api/checkouts/mark-out` / `quick-mark-in` / `transfer`
- `GET /api/projects`, `GET /api/licences`, `GET /api/issues`, etc.

## Removed Features
- Command Center (deleted)
- Shoot Log / Master Log Sheet (deleted)
- Employee management (deleted)
- Task management (deleted)
- Time tracking (deleted)
- 3D globe / cube backgrounds (deleted)

## Test Credentials
- Email: agent@machvisuals.com
- Password: password123
