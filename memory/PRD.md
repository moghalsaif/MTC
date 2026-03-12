# Mach Traffic Controller — PRD

## Original Problem Statement
Equipment tracker dashboard for Mach Visuals, a virtual production company. The system manages physical equipment inventory for film/VFX production — tracking items in/out, project assignments, issues, maintenance, licences, and lost items.

## User Personas
- **Admin (sanat@machvisuals.com)**: Full system access, can delete anything
- **Manager (rohit@machvisuals.com)**: Can add/edit inventory, resolve issues, delete licences — cannot delete inventory items
- **Crew (User)**: Can mark in/out, report issues, view everything — restricted from add/edit/delete operations

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT tokens + RBAC (admin/manager/user)

## RBAC Matrix
| Permission | Admin (sanat@) | Manager (rohit@) | User (others) |
|---|---|---|---|
| View everything | Yes | Yes | Yes |
| Mark in/out | Yes | Yes | Yes |
| Report issues | Yes | Yes | Yes |
| Add/Edit inventory | Yes | Yes | No |
| Delete inventory | Yes | No | No |
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
  pages/CostingCalculator.js  — Production costing calculator
  pages/Dashboard.js, Documentation.js, Projects.js, etc.
```

## What's Been Implemented
- [x] Full equipment CRUD with 90+ items, 12 categories
- [x] Check-out/check-in workflow with partial returns & transfers
- [x] Inventory <> Issues cross-linking
- [x] Issue tracking with types, severity, resolution
- [x] Documentation module with custom categories
- [x] Licence & asset management
- [x] Dashboard, Projects, Lost Items, Maintenance
- [x] RBAC: admin/manager/user roles (backend + frontend)
- [x] Timecode Calculator (9 frame rates, drop-frame, copy-to-clipboard)
- [x] Production Costing Calculator (VP + External Party + Post Production, collapsible sections, grand total with breakdown)
- [x] Dropdown navigation, dark theme, 10% larger fonts

## Navigation Structure
1. **Mach Traffic Controller**: Dashboard, Inventory, Items Out, Projects, Issues, Lost Items, Maintenance
2. **Licences & Assets**: Licences & Assets page
3. **Documentation**: Documents page
4. **Tools at mach**: Timecode Calculator, Production Costing

## Test Credentials
- Admin: sanat@machvisuals.com / MachAdmin@2026
- Manager: rohit@machvisuals.com / MachManager@2026
- User: testcalc@machvisuals.com / Test1234!
