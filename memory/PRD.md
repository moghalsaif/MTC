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
- Timecode and Costing calculators (VP + Regular production)

## Tech Stack
- **Backend:** FastAPI (Python) on port 8001
- **Frontend:** React with TailwindCSS + Shadcn UI on port 3000
- **Database:** MongoDB (test_database)
- **Auth:** JWT tokens with bcrypt password hashing

## What's Been Implemented

### Completed Features
1. Inventory Management - Full CRUD with checkout/return, partial returns, damage/missing tracking
2. Project Management - CRUD with equipment association, packing lists, PDF generation
3. Issue Tracking - Auto-creation from condition changes
4. Maintenance Tracking - Schedule and complete, auto-update item status
5. Lost Items Tracking - Auto-created from missing returns, recovery marking
6. Licence Management - CRUD with renewal tracking
7. Purchased Assets - CRUD with project association
8. Reservation System - Equipment reservations
9. Equipment Transfer - Between projects (full/partial)
10. Packing List PDF - Professional PDF generation
11. RBAC - admin/manager/user roles
12. Timecode Calculator - Client-side timecode math
13. **Costing Calculator (Two-Column):**
    - Virtual Production: VP Studio (day rate, environments, travel, MIS), External Party (12 cost fields), Post Production (sound, color, editing)
    - Regular Production: Pre-production, Production, Post-production, Marketing & Distribution, Legal & Misc - each with expandable line items (name, qty, rate, per-day), shoot days control
    - Combined Grand Total with CSV export
14. Request System - Asset procurement with admin approval
15. Freelancer Module - Profiles, project payments, expense dashboard
16. CRM Phase 1 - Dashboard, lead/client management, scoring, activity logs
17. CRM CSV Import - Bulk lead import with duplicate detection
18. CRM Filters - Status/source for leads, search/type for clients
19. **Data Integrity Audit System** - Detect & clean orphaned records (admin-only)
20. **Cascade Deletes** - Item/project deletion cascades to related records
21. **Dashboard Integrity Widget** - Visual data health indicator

### Data Cleanup Performed (Latest Session)
- Cleaned 97 orphaned records (90 checkouts, 5 lost items, 2 maintenance)
- Added cascade delete prevention on item/project removal
- Added audit endpoint for ongoing monitoring

## Pending/Future Tasks

### P1 - CRM Phase 2
- Escalation alerts, daily digests, "At Risk" widgets
- Email/call logging and sync
- Onboarding workflow automation
- Proposals and invoices
- Detailed reporting
- Automation rules

### P2 - Email Verification
- Blocked pending user decision on email provider

### P3 - Minor Issues
- Dialog component accessibility warning

### Backlog
- README.md
- Backend refactoring: split server.py into routes/ and models/
- Data import from email inboxes, contacts sync

## Test Credentials
- Admin: sanat@machvisuals.com / sanat@123
- Manager: rohit@machvisuals.com / rohit@123
