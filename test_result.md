# Test Results for Equipment Tracker - New Features

## Features to Test
1. Inventory Filters - "Checked Out" and "Not Checked Out" filter
2. Mark Out button color - Green for items already out, Orange for items not out
3. Edit Project functionality - Pencil icon and edit dialog
4. Licences Dashboard - Total annual spend, category breakdown, expiring soon section

## Test Credentials
- Email: testuser@test.com
- Password: testpassword

## Test Data Created
- Project "Test Project for Edit" - for testing edit functionality
- 3 Licences: Adobe Creative Cloud ($599/year), DaVinci Resolve Studio ($295/year), Frame.io ($15/month)

## API Endpoints to Test
- PUT /api/projects/{project_id} - Update project
- GET /api/licences - List all licences
- POST /api/licences - Create licence  
- PUT /api/licences/{licence_id} - Update licence
- DELETE /api/licences/{licence_id} - Delete licence
- GET /api/licences/stats/summary - Get annual spend and category breakdown

## Incorporate User Feedback
- Checkout filter should filter items by quantity_out > 0 or = 0
- Button color should change to green after item is marked out
