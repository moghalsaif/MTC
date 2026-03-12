# Mach Traffic Controller — PRD

## Original Problem Statement
Equipment tracker dashboard for Mach Visuals, a virtual production company. The system manages physical equipment inventory for film/VFX production — tracking items in/out, project assignments, issues, maintenance, licences, and lost items.

## User Personas
- **Equipment Manager (Admin)**: Full system access, can delete anything
- **Manager**: Can add/edit inventory, resolve issues, delete licences — cannot delete inventory items
- **Crew (User)**: Can mark in/out, report issues, view everything — restricted from add/edit/delete operations

## Core Requirements
- Equipment inventory with categories (Camera & Optics, Lighting, Audio, etc.)
- Check-out/check-in workflow with project assignment
- Issue tracking for damaged equipment
- Lost items tracking, Maintenance scheduling, Licence & asset management
- RBAC with three roles: admin, manager, user
- Registration restricted to @machvisuals.com emails
- Dark theme with orange (#F9982E) brand accent

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT tokens + RBAC
- **Data**: 90+ items from MASTER FINALS.xlsx

## RBAC Matrix
| Permission | Admin (sanat@) | Manager (rohit@) | User (others) |
|---|---|---|---|
| View everything | Yes | Yes | Yes |
| Mark in/out | Yes | Yes | Yes |
| Report issues | Yes | Yes | Yes |
| Add inventory items | Yes | Yes | No |
| Edit inventory items | Yes | Yes | No |
| Delete inventory items | Yes | No | No |
| Resolve issues | Yes | Yes | No |
| Delete licences/assets | Yes | Yes | No |

## Architecture
```
/app/backend/server.py     — FastAPI with RBAC (ROLE_MAP, require_role())
/app/frontend/src/
  App.js                   — Router
  contexts/AuthContext.js   — Auth + RBAC permission flags
  components/Layout.js     — Nav with role badge
  pages/Inventory.js       — RBAC-gated Add/Edit buttons
  pages/Issues.js          — RBAC-gated Resolve button
  pages/Licences.js        — RBAC-gated Delete buttons
  pages/TimecodeCalculator.js — SMPTE timecode calculator
  pages/Dashboard.js, Documentation.js, Projects.js, etc.
```

## What's Been Implemented
- [x] Full equipment CRUD with 90 items, 12 categories
- [x] Check-out/check-in workflow with partial returns & transfers
- [x] Inventory <> Issues cross-linking
- [x] Issue tracking with types, severity, resolution
- [x] Documentation module with custom categories
- [x] Licence & asset management
- [x] Dashboard, Projects, Lost Items, Maintenance
- [x] Timecode Calculator (9 frame rates, drop-frame, copy-to-clipboard)
- [x] **RBAC**: admin/manager/user roles with backend enforcement + frontend UI gating
- [x] Dropdown navigation, dark theme, 10% larger fonts

## Navigation Structure
1. **Mach Traffic Controller**: Dashboard, Inventory, Items Out, Projects, Issues, Lost Items, Maintenance
2. **Licences & Assets**: Licences & Assets page
3. **Documentation**: Documents page
4. **Tools at mach**: Timecode Calculator

## Test Credentials
- Admin: sanat@machvisuals.com / Sanat1234!
- Manager: rohit@machvisuals.com / Rohit1234!
- User: testcalc@machvisuals.com / Test1234!
