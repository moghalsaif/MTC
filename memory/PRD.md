# Mach Traffic Controller - Product Requirements Document

## Original Problem Statement
Build a film production equipment management system ("Mach Traffic Controller") with:
- Inventory management with checkout/return workflow
- Project management with equipment tracking
- Issue tracking and maintenance scheduling
- Role-Based Access Control (admin, manager, user)
- CRM for lead/client management
- Freelancer database with expense tracking
- Asset request system with approval workflow
- Timecode and Costing calculators
- Licence and asset management

## Core Requirements
- **Auth:** JWT-based with RBAC (admin: sanat@machvisuals.com, manager: rohit@machvisuals.com)
- **Email Domain:** Only @machvisuals.com addresses
- **CRM:** Zero lead leakage system, bulk CSV import, client filtering, onboarding workflows
- **Data Integrity:** Audit system to detect and clean orphaned records, cascade deletes

## Tech Stack
- **Backend:** FastAPI (Python) on port 8001
- **Frontend:** React with TailwindCSS + Shadcn UI on port 3000
- **Database:** MongoDB (test_database)
- **Auth:** JWT tokens with bcrypt password hashing

## What's Been Implemented

### Completed Features
1. **Inventory Management** - Full CRUD with checkout/return workflow, partial returns, damage/missing tracking
2. **Project Management** - CRUD with equipment association, packing lists, PDF generation
3. **Issue Tracking** - Auto-creation from condition changes, cross-linking with items
4. **Maintenance Tracking** - Schedule and complete maintenance, auto-update item status
5. **Lost Items Tracking** - Auto-created from missing returns, recovery marking
6. **Licence Management** - CRUD with renewal tracking, annual spend calculation
7. **Purchased Assets** - CRUD with project association
8. **Reservation System** - Equipment reservations with date ranges
9. **Equipment Transfer** - Transfer equipment between projects (full/partial)
10. **Packing List PDF** - Professional PDF generation with equipment comparison
11. **RBAC** - admin/manager/user roles with endpoint protection
12. **Timecode Calculator** - Client-side timecode math tool
13. **Costing Calculator** - Production quotation generator
14. **Request System** - Asset procurement with admin-only approval
15. **Freelancer Module** - Profiles, project payments, expense dashboard
16. **CRM Phase 1** - Dashboard, lead/client management, scoring, activity logs
17. **CRM CSV Import** - Bulk lead import with duplicate detection
18. **CRM Filters** - Status/source filters for leads, search/type filters for clients
19. **Data Integrity Audit** - Detect orphaned records across all collections
20. **Data Integrity Cleanup** - Remove orphaned records (admin-only)
21. **Cascade Deletes** - Item/project deletion cascades to related records
22. **Dashboard Integrity Widget** - Visual data health indicator for admin

### Data Cleanup Performed
- Cleaned 97 orphaned records (90 checkouts, 5 lost items, 2 maintenance)
- Added prevention: cascade deletes on item/project removal
- Added detection: audit endpoint for ongoing monitoring

## Pending/Future Tasks

### P1 - CRM Phase 2
- Escalation alerts, daily digests
- "At Risk" widgets with automated notifications
- Email/call logging and sync
- Onboarding workflow automation
- Proposals and invoices
- Detailed reporting (leads by source, revenue, team performance)
- Automation rules ("if-then" logic)

### P2 - Email Verification
- Blocked pending user decision on email provider (SendGrid/Resend)

### P3 - Minor Issues
- Dialog component accessibility warning in dialog.jsx

### Backlog
- README.md for the project
- Backend refactoring: split server.py into routes/ and models/ directories
- Data import from email inboxes, Google/Outlook contacts sync

## Key API Endpoints
- `/api/auth/{register,login,me}` - Authentication
- `/api/items/` - Inventory CRUD
- `/api/projects/` - Projects CRUD
- `/api/checkouts/{mark-out,quick-mark-in,mark-in,transfer}` - Equipment flow
- `/api/issues/` - Issue tracking
- `/api/crm/{leads,clients,dashboard}` - CRM
- `/api/crm/leads/import-csv` - CSV bulk import
- `/api/audit/{integrity,cleanup}` - Data integrity
- `/api/requests/` - Asset requests
- `/api/freelancers/` - Freelancer management

## Test Credentials
- Admin: sanat@machvisuals.com / sanat@123
- Manager: rohit@machvisuals.com / rohit@123
