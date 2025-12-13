# Test Results for Equipment Tracker

## Features to Test
1. F1 Font (Rajdhani) on equipment names - In Inventory and Items Out pages
2. PDF Comparison Table - Shows Qty Out vs Qty Returned vs Qty Remaining
3. Partial Quantity Mark-In - User can specify exact quantity to return
4. Transfer Equipment Feature - Header button and item-level transfer

## Test Credentials
- Email: testuser@test.com
- Password: testpassword

## Test Data Created
- Project "Test Shoot A" - has 3 items checked out
- Project "Test Shoot B" - target for transfer testing

## API Endpoints to Test
- POST /api/checkouts/quick-mark-in (with quantity_returned param)
- POST /api/checkouts/transfer
- GET /api/projects/{id}/packing-list-pdf (comparison table)

## Previous Issues
- ThemeContext.js file deleted (housekeeping)
- F1 font class added to Inventory.js item names

## Incorporate User Feedback
- None yet
