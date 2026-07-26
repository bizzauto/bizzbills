# BizzBills SaaS Product Blueprint

Turn BizzBills from a basic invoicing app into a complete professional SaaS billing/accounting platform comparable to mybillbook and vyapar.

## Phase 0: Architecture Foundation

- **Context**: Current Next.js + Prisma + PostgreSQL project needs structural expansion for multi-tenant, role-based, and accounting features.
- **Goal**: Establish the architecture that all future features depend on.
- **Steps**:
  - 0.1: Add multi-tenant schema (Organization, Branch, TenantUser tables)
  - 0.2: Add role-based access control (Role enum: admin, accountant, viewer, sales_manager)
  - 0.3: Refactor AuthProvider to support org-scoped sessions
  - 0.4: Add middleware org-scoped route protection
  - 0.5: Add Plan model for subscription management
  - **Verification**: `npx prisma db push` succeeds, existing tests pass, `/api/health` returns 200

## Phase 1: Double-Entry Accounting Engine

- **Context**: Need full accounting (not just invoices) before invoices can be part of a complete ledger.
- **Goal**: Double-entry bookkeeping with ledger, trial balance, and auto journal entries.
- **Steps**:
  - 1.1: Add ChartOfAccount model (Account model in Prisma with type: ASSET/LIABILITY/EQUITY/INCOME/EXPENSE)
  - 1.2: Add JournalEntry + JournalEntryLine models
  - 1.3: Add Ledger model (account-level running balance)
  - 1.4: Build journal entry engine that auto-creates entries from invoice/sale/purchase transactions
  - 1.5: Build trial balance report API endpoint
  - 1.6: Build profit & loss statement API endpoint
  - 1.7: Build balance sheet API endpoint
  - 1.8: Build cash flow statement API endpoint
  - **Verification**: All ledger reports return correct totals, journal entries balance (debits = credits), existing invoice tests pass

## Phase 2: Chart of Accounts & Bookkeeping UI

- **Context**: Users need to see and manage their accounts.
- **Goal**: Account management page with chart of accounts, journal entry entry UI.
- **Steps**:
  - 2.1: Create `/accounting/chart-of-accounts` page with tree view
  - 2.2: Create journal entry form page
  - 2.3: Create ledger report page with filters (date range, account)
  - 2.4: Create trial balance page
  - 2.5: Create P&L and balance sheet pages
  - **Verification**: All accounting pages render, data flows correctly from APIs

## Phase 3: GST Compliance Suite

- **Context**: Indian businesses need GST reporting. Current project has basic GST on invoices only.
- **Goal**: Full GST compliance — GSTR-1, GSTR-2, GSTR-3B, GSTR-4, e-Way bills, ITC tracking.
- **Steps**:
  - 3.1: Enhance Invoice model with GST fields (gstin, placeOfSupply, reverseCharge, elctronicPosition)
  - 3.2: Build GSTR-1 report generator (outward supplies, B2B/B2C/ISO breakdown)
  - 3.3: Build GSTR-2 report generator (inward supplies with ITC)
  - 3.4: Build GSTR-3B summary generator
  - 3.5: Build GSTR-4 report for composition scheme
  - 3.6: Build e-Way bill generation form (distance, transport, vehicle number)
  - 3.7: Add HSN/SAC code management page with search
  - 3.8: Build ITC reconciliation page
  - **Verification**: GST reports calculate correctly against invoice data, e-Way bill fields validated

## Phase 4: Inventory & Stock Management

- **Context**: Current project has no inventory model. Need full stock management.
- **Goal**: Real-time stock tracking, batch/expiry management, low-stock alerts, multi-warehouse.
- **Steps**:
  - 4.1: Add Product, InventoryItem, Warehouse, Batch models to Prisma schema
  - 4.2: Build inventory CRUD API routes
  - 4.3: Add auto stock adjustment on invoice creation/sales order
  - 4.4: Build stock movement log (in/out/transfer)
  - 4.5: Build low-stock alert engine
  - 4.6: Build expiry tracking for batch items
  - 4.7: Create inventory dashboard page with stock levels, movements, alerts
  - 4.8: Add barcode generation and scanning support
  - **Verification**: Stock quantities update correctly on invoice/sales order creation, alerts fire at threshold

## Phase 5: CRM — Customer & Vendor Management

- **Context**: Need party management beyond simple customerName string on invoices.
- **Goal**: Full customer and vendor database with contact info, credit limits, party-wise rates.
- **Steps**:
  - 5.1: Add Party model (type: CUSTOMER/VENDOR/OTHER), PartyAddress, PartyContact
  - 5.2: Add PartyRate model (party-specific pricing per product)
  - 5.3: Add creditLimit and outstandingBalance to Party
  - 5.4: Build customer/vendor list page with search and filters
  - 5.5: Build party detail page with transaction history, outstanding balance
  - 5.6: Add party-wise ledger page
  - **Verification**: Party data persists, party-wise rates apply to invoices, outstanding balance calculates correctly

## Phase 6: Purchase & Sales Orders

- **Context**: Current project only has invoices. Need formal order management.
- **Goal**: Sales orders, purchase orders, delivery challans, quotation/estimate.
- **Steps**:
  - 6.1: Add OrderType enum (SALES_ORDER, PURCHASE_ORDER, QUOTATION, DELIVERY_CHALLAN)
  - 6.2: Build Order model with status tracking (draft/pending/approved/delivered/completed/cancelled)
  - 6.3: Build Order API routes (CRUD, list, status change)
  - 6.4: Build Sales Order page with order creation form
  - 6.5: Build Purchase Order page with vendor selection
  - 6.6: Build Quotation/Estimate page with conversion-to-invoice flow
  - 6.7: Build Delivery Challan page
  - 6.8: Add order-to-invoice conversion logic
  - **Verification**: Orders can be created/updated/status-changed, conversion to invoice works correctly

## Phase 7: Credit Notes & Debit Notes

- **Context**: Need return/correction documents.
- **Goal**: Credit notes (sales returns), debit notes (purchase returns/adjustments) linked to original invoices.
- **Steps**:
  - 7.1: Add CreditNote and DebitNote models (linked to original invoice)
  - 7.2: Build credit/debit note API routes
  - 7.3: Build credit/debit note creation UI (pre-filled from original invoice)
  - 7.4: Update inventory on credit/debit note creation
  - 7.5: Update ledger/journal entries for returns
  - **Verification**: Credit/debit notes link to original invoice, inventory adjusts correctly, GST recalculates

## Phase 8: Recurring Invoices & Scheduled Billing

- **Context**: Need automated billing for subscribers/regular customers.
- **Goal**: Recurring invoice schedules with automated creation and reminders.
- **Steps**:
  - 8.1: Add RecurringInvoice model (customer, items, frequency, startDate, endDate, nextRunDate)
  - 8.2: Build recurring invoice CRUD API
  - 8.3: Build recurring invoice creation page
  - 8.4: Add scheduled job (cron-like) for auto-generating recurring invoices
  - 8.5: Build payment reminder automation for overdue invoices
  - **Verification**: Recurring invoices generate on schedule, reminders fire for overdue invoices

## Phase 9: Payment Tracking & Bank Reconciliation

- **Context**: Need payment collection tracking and reconciliation.
- **Goal**: Payment capture, multi-mode payments, outstanding tracking, bank reconciliation.
- **Steps**:
  - 9.1: Add Payment model (invoice linkage, amount, mode: UPI/CASH/BANK/CARD/CHEQUE, date, reference)
  - 9.2: Add PaymentReceipt model (receipt number, PDF)
  - 9.3: Build payment capture UI (linked to invoice)
  - 9.4: Build outstanding dues dashboard
  - 9.5: Build payment reminder automation (WhatsApp/SMS/email simulation)
  - 9.6: Add BankAccount model and bank reconciliation page
  - 9.7: Build AI-powered transaction matching for bank reconciliation
  - **Verification**: Payments link to invoices, outstanding balance updates, reconciliation matches transactions

## Phase 10: Reporting & Analytics Dashboard

- **Context**: Need comprehensive reporting beyond the current dashboard.
- **Goal**: 37+ business reports with PDF/Excel export and graphical charts.
- **Steps**:
  - 10.1: Build sales report page (by period, by customer, by item, by GST rate)
  - 10.2: Build purchase report page
  - 10.3: Build inventory/stock report page
  - 10.4: Build party aging report (0-15, 16-30, 31-45, >45 days)
  - 10.5: Build product profitability report
  - 10.6: Build daybook/all transactions page
  - 10.7: Build GSTR reports page (GSTR-1, GSTR-2, GSTR-3B)
  - 10.8: Build top 5 reports (customers, suppliers, products)
  - 10.9: Add PDF/Excel export for all reports
  - 10.10: Add chart.js-based graphical dashboard with drill-downs
  - **Verification**: All reports calculate correctly against data, exports generate properly, charts render

## Phase 11: Multi-Entity & Branch Management

- **Context**: Current project has single-entity data model. Need multi-org support.
- **Goal**: Multiple organizations/businesses per user, multi-branch with separate inventory.
- **Steps**:
  - 11.1: Add Organization model (name, logo, address, GSTIN, FSSAI, etc.)
  - 11.2: Add Branch model linked to Organization
  - 11.3: Add TenantUser model (user-org-role mapping)
  - 11.4: Refactor all existing models to be org-scoped
  - 11.5: Build organization switcher in header nav
  - 11.6: Build organization settings page (manage users, branches)
  - 11.7: Ensure all API routes filter by current org/branch
  - **Verification**: Users can switch between organizations, data is properly isolated per org

## Phase 12: User Roles & Permissions

- **Context**: Current project has no role-based access control.
- **Goal**: Role-based permissions with activity logging.
- **Steps**:
  - 12.1: Add Role enum (admin, accountant, viewer, sales_manager)
  - 12.2: Add permission matrix (what each role can view/edit/delete)
  - 12.3: Build user management page within organizations
  - 12.4: Add ActivityLog model for audit trail
  - 12.5: Update middleware to enforce org-scoped + role-scoped access
  - **Verification**: Role-based access enforced correctly, activity log captures all actions

## Phase 13: Subscription & Plan Management

- **Context**: SaaS product needs subscription tiers.
- **Goal**: Plan-based feature gating and pricing.
- **Steps**:
  - 13.1: Add Plan model (name, price, features JSON, maxOrgs, maxUsers)
  - 13.2: Add Subscription model (orgId, planId, status, startDate, endDate)
  - 13.3: Build pricing page for public signup
  - 13.4: Build subscription management page in settings
  - 13.5: Add plan-gating to features (check subscription before allowing)
  - 13.6: Add Stripe payment integration (subscription checkout)
  - **Verification**: Plans control feature access, subscription status enforced**

## Phase 14: Payroll (Basic)

- **Context**: Vyapar offers payroll on Platinum plans.
- **Goal**: Basic payroll processing for staff.
- **Steps**:
  - 14.1: Add Employee model (linked to Party, staff-specific fields)
  - 14.2: Add SalaryComponent model (basic, HRA, DA, etc.)
  - 14.3: Add PaySlip model and PaySlipLine model
  - 14.4: Build salary setup page per employee
  - 14.5: Build monthly payroll processing job
  - 14.6: Build payslip generation (PDF)
  - 14.7: Build payroll report page
  - **Verification**: Payroll calculates correctly, payslips generate, reports display properly**

## Phase 15: AI Enhancement Layer

- **Context**: Current project has basic rule-based AI (GST suggestions, anomaly detection). Need enhancement.
- **Goal**: Advanced AI features for automation and intelligence.
- **Steps**:
  - 15.1: Enhance OCR to support purchase bill scanning with HSN auto-detection
  - 15.2: Add AI-powered bank transaction categorization
  - 15.3: Add AI invoice draft generation from voice/toast notifications
  - 15.4: Add AI cash flow prediction from historical data
  - 15.5: Add intelligent payment reminder scheduling based on customer behavior
  - 15.6: Build AI settings page with provider selection (OpenAI/Anthropic/local)
  - 15.7: Add AI insight cards on dashboard (top customers, cash flow, anomalies)
  - **Verification**: AI features work with API keys configured, fall back to rule-based when no key, insights are meaningful

## Phase 16: Import/Export & Integration

- **Context**: Users migrating from Tally/Vyapar need data import capability.
- **Goal**: Universal import/export and integrations.
- **Steps**:
  - 16.1: Build Excel import for chart of accounts
  - 16.2: Build Excel/CSV import for customers and vendors
  - 16.3: Build Excel/CSV import for products and inventory
  - 16.4: Build Tally-compatible JSON export (GSTR, ledgers, invoices)
  - 16.5: Build Tally-compatible JSON import
  - 16.6: Build PDF export for all reports
  - 16.7: Add WhatsApp share integration for invoices/reminders
  - 16.8: Add SMS reminder integration (via API)
  - **Verification**: Data imports correctly, Tally export matches expected format, shares work**

## Phase 17: Branding & White-Label

- **Context**: SaaS product needs custom branding per customer.
- **Goal**: White-label capabilities for customers on paid tiers.
- **Steps**:
  - 17.1: Add Organization branding settings (logo, primaryColor, font, companyName, address, phone, email, website)
  - 17.2: Build invoice template editor (logo upload, colors, header/footer customization)
  - 17.3: Apply branding to all invoice/order/report PDFs
  - 17.4: Add "Powered by BizzBills" toggle (remove on paid plans)
  - 17.5: Build custom field support on invoices (up to 5 custom fields)
  - **Verification**: Branded PDFs render correctly, branding persists across organizations**

## Phase 18: Offline & PWA Support

- **Context**: mybillbook/vyapar offer offline billing.
- **Goal**: Progressive Web App with offline-first capability.
- **Steps**:
  - 18.1: Add service worker for offline caching
  - 18.2: Implement IndexedDB for offline invoice creation
  - 18.3: Add sync queue for offline operations
  - 18.4: Build sync status indicator in UI
  - 18.5: Add offline invoice creation form (works without network)
  - **Verification**: Invoices can be created offline, sync completes when network returns, no data loss

## Phase 19: Mobile-Enhanced Design

- **Context**: Current project is responsive but not optimized for mobile billing workflows.
- **Goal**: Mobile-first billing experience with gestures, camera scanning.
- **Steps**:
  - 19.1: Optimize billing workspace for mobile (larger touch targets, bottom sheet forms)
  - 19.2: Add camera-based barcode scanning (WebRTC)
  - 19.3: Add camera-based OCR for bill capture
  - 19.4: Build mobile dashboard with swipeable cards
  - 19.5: Add push notification support for reminders (via service worker)
  - **Verification**: Mobile billing flow is smooth, scanning works, notifications fire

## Phase 20: Deployment & Production Hardening

- **Context**: Need production-grade deployment with monitoring.
- **Goal**: Production-ready deployment with monitoring, backups, and security.
- **Steps**:
  - 20.1: Add automated database backup schedule
  - 20.2: Add monitoring and alerting (health check, error tracking)
  - 20.3: Add rate limiting to API routes
  - 20.4: Add input validation with Zod on all routes
  - 20.5: Add CORS configuration for custom domains
  - 20.6: Build admin panel for platform management (users, orgs, subscription management)
  - 20.7: Add audit log export
  - **Verification**: All security checks pass, deployment is reproducible, monitoring shows healthy metrics**

## Parallel Workstream Summary

| Workstream | Phases | Dependency |
|-----------|--------|------------|
| Accounting Foundation | 0, 1, 2 | — |
| GST Compliance | 0, 3 | Phase 0 |
| Inventory | 0, 4 | Phase 0 |
| CRM | 0, 5 | Phase 0 |
| Orders (Sales/Purchase/Quotation) | 0, 6 | Phase 0, CRM |
| Credit/Debit Notes | 0, 7 | Phase 6 |
| Recurring Billing | 0, 8 | CRM |
| Payment & Reconciliation | 0, 9 | CRM |
| Reporting | 0, 10 | Phase 1, 3, 4, 5, 9 |
| Multi-Entity | 0, 11 | Phase 0 |
| Roles & Permissions | 0, 12 | Phase 0, 11 |
| Subscription/Pricing | 13 | Phase 11, 12 |
| Payroll | 14 | Phase 0, 5 (CRM) |
| AI Enhancement | 15 | Phase 0 |
| Import/Export | 16 | Phase 1, 5 |
| Branding/White-Label | 17 | Phase 11 |
| Offline/PWA | 18 | — |
| Mobile Enhancement | 19 | — |
| Deployment Hardening | 20 | All |

## Key Principles

1. Every feature is gated by subscription plan (Free → Silver → Gold → Platinum → Enterprise)
2. All data is org-scoped for multi-tenant isolation
3. Every mutation is logged in ActivityLog for audit trail
4. All financial calculations are tested with precision (avoid floating-point for money — use integer cents)
5. PDF generation for all invoices, reports, and payslips
6. WhatsApp + SMS + Email multi-channel communication
7. AI features work offline (rule-based) or online (LLM-powered)
8. Tally interoperability is a core integration goal (import/export)
