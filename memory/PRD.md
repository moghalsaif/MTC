# Mach Traffic Controller — PRD

## Original Problem Statement
Equipment tracker + production management dashboard for Mach Visuals (India's first portable virtual production studio). Manages inventory, projects, issues, freelancer expenses, client relationships (CRM), and production tools.

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor async)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT + RBAC (admin/manager/user)

## RBAC
| Permission | Admin (sanat@) | Manager (rohit@) | User (others) |
|---|---|---|---|
| View everything | Yes | Yes | Yes |
| Mark in/out | Yes | Yes | Yes |
| Add/Edit inventory | Yes | Yes | No |
| Delete inventory | Yes | No | No |
| Resolve issues | Yes | Yes | No |
| Delete licences/assets | Yes | Yes | No |
| Freelancer module | Yes | No | No |
| CRM (leads/clients) | Yes | Yes | Yes |

## Modules Implemented
- [x] **Inventory**: 90+ items, 12 categories, sub-categories in orange, add/edit/filter
- [x] **Items Out**: Check-out/check-in, partial returns, transfers
- [x] **Projects**: CRUD, status tracking
- [x] **Issues**: Cross-linked with inventory, resolve restores item
- [x] **Lost Items, Maintenance, Licences & Assets**
- [x] **Documentation**: Upload/organize with custom categories
- [x] **Timecode Calculator**: 9 frame rates, drop-frame, copy-to-clipboard
- [x] **Production Costing**: VP + External + Post Production with grand total
- [x] **Requests**: Submit asset/tool/licence requests with photo + URL, admin approval with vendor details
- [x] **Freelancer Expenses**: Profiles with 22 service types (incl Motion Capture), payment tracking per project, expense dashboard with project-wise spending
- [x] **CRM**: Lead management (7 statuses, scoring, activity log, at-risk flagging), client database (6 types, onboarding checklist), dashboard with pipeline value and leakage alerts

## Navigation
1. Mach Traffic Controller (Dashboard, Inventory, Items Out, Projects, Issues, Lost Items, Maintenance)
2. Licences & Assets
3. Documentation
4. CRM (Dashboard, Leads, Clients)
5. Tools at mach (Timecode Calculator, Production Costing, Requests, Freelancer Database)

## CRM Details
- Lead sources: Website, LinkedIn, Referral, Event, Cold Outreach, Other
- Lead statuses: New → Contacted → Qualified → Proposal Sent → Negotiation → Won/Lost
- Lead scoring: budget (10-30 pts) + urgency (0-30 pts)
- At-risk: no activity 5+ days | Needs attention: 48h+ inactive | Escalated: 72h+
- Client types: Brand, Production House, Agency, Education Institute, Architecture Firm, Other
- Onboarding: 5-step checklist with completion %

## Test Credentials
- Admin: sanat@machvisuals.com / MachAdmin@2026
- Manager: rohit@machvisuals.com / MachManager@2026
- User: testcalc@machvisuals.com / Test1234!
