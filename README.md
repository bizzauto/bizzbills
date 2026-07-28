# BizzBills

AI-native invoicing and finance platform for modern businesses.

Built with Next.js 16, TypeScript, Tailwind CSS 4, Prisma 7 (PostgreSQL), and NextAuth v4.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Supabase) via Prisma 7 + pg adapter |
| Auth | NextAuth v4 with JWT credentials |
| AI | Rule-based engine (GST/HSN, anomaly detection) + optional LLM provider |
| Testing | Vitest |

## Getting started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env — set your DATABASE_URL (Supabase Postgres) and NEXTAUTH_SECRET
# NOTE: local SQLite dev is not used in production/Coolify.

# Create the database tables
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

Visit `http://localhost:3000/auth/register` to create your first account.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build (standalone) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run test suite |

## Deployment: Same Coolify + Same Supabase

If you already have another app running on Coolify with Supabase, here's how to deploy BizzBills alongside it:

### 1. Get your Supabase connection string

From your Supabase dashboard → **Project Settings** → **Database** → **Connection string** (URI).

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres?schema=public
```

> **Important:** Append `?schema=public` to the connection string. Keep the `postgres` database — tables from different apps coexist in separate schemas or with prefixed names.

### 2. Deploy on Coolify

1. Push this repo to your Git provider
2. In Coolify, create a new resource → select your repo
3. Coolify auto-detects the **Dockerfile**
4. Add these **Environment Variables**:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `postgresql://postgres:pass@db.your-project.supabase.co:5432/postgres?schema=public` |
   | `NEXTAUTH_SECRET` | *(generate a random 64-char string)* |
   | `NEXTAUTH_URL` | `https://your-billing-domain.com` |

5. Deploy
6. Health check: `https://your-domain.com/api/health`

### 3. Database tables

Tables are created automatically on first deploy. If auto-migration fails, run manually:

```bash
# In Coolify — exec into the running container
npx prisma db push
```

### 4. Can it coexist with my other app?

**Yes.** BizzBills creates these tables in your Supabase `public` schema:
`User`, `Account`, `Session`, `VerificationToken`, `Invoice`, `InvoiceLine`, `InvoiceVersion`

If your other app uses the same `public` schema, tables are shared by name. To keep them separate, either:
- **Option A (recommended):** Use the same database — table name prefixes (`BillingUser`, `BillingInvoice` etc.) — requires schema changes
- **Option B:** Create a separate Supabase project for BizzBills
- **Option C:** Use a separate schema (`billing` schema via `?schema=billing` in DATABASE_URL) — requires running `CREATE SCHEMA billing;` first

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                     # AI service endpoints
│   │   │   ├── analyze/            # Anomaly detection
│   │   │   ├── keys/               # API key management
│   │   │   ├── ocr/                # Document OCR
│   │   │   └── suggest/            # GST/HSN suggestions
│   │   ├── auth/[...nextauth]/     # NextAuth route
│   │   ├── auth/register/          # User registration
│   │   ├── health/                 # Health check
│   │   ├── invoices/               # Invoice CRUD
│   │   ├── invoices/[id]/          # Single invoice
│   │   ├── invoices/[id]/export/   # Export (JSON, CSV, Markdown)
│   │   └── invoices/[id]/versions/ # Versioning + diff
│   ├── auth/signin/                # Sign-in page
│   ├── auth/register/              # Register page
│   ├── billing/                    # Billing workspace (AI-enhanced)
│   ├── dashboard/                  # Executive dashboard
│   ├── invoices/[id]/              # Invoice detail + version history
│   ├── settings/                   # AI provider configuration
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # Landing page
├── components/
│   ├── AuthNav.tsx                 # Auth-aware navigation
│   ├── AuthProvider.tsx            # Session provider
│   ├── MobileNav.tsx               # Mobile hamburger menu
│   └── invoice/
│       ├── DiffViewer.tsx          # Invoice diff display
│       └── VersionTimeline.tsx     # Version history timeline
├── lib/
│   ├── ai/
│   │   ├── anomaly.ts              # Rule-based anomaly detection
│   │   ├── anomaly.test.ts
│   │   ├── gst.ts                  # GST/HSN suggestion engine
│   │   ├── gst.test.ts
│   │   ├── index.ts
│   │   └── types.ts                # AI type definitions
│   ├── auth.ts                     # NextAuth config
│   ├── db.ts                       # Prisma client (PostgreSQL)
│   ├── diff.ts                     # Invoice diff engine
│   ├── diff.test.ts
│   ├── invoicing.ts                # Invoice engine
│   ├── invoicing.test.ts
│   └── password.ts                 # Password hashing (PBKDF2)
├── middleware.ts                   # Route protection
└── types/
    └── next-auth.d.ts              # Auth type augmentation
```

## AI services

The platform includes a built-in AI service layer that works without external API keys:

| Service | How it works | API key required? |
|---------|-------------|-------------------|
| **GST / HSN suggestions** | Keyword-to-HSN mapping based on India GST rules | No |
| **Anomaly detection** | Rule-based checks (tax rates, prices, GSTIN format, duplicates) | No |
| **OCR document processing** | Text extraction with HSN recognition | No |
| **AI invoice drafting** | Requires an LLM provider (OpenAI / Anthropic) | Yes |

Configure an API key at `/settings` to unlock LLM-powered features.

## What's implemented

- ✅ Landing page with premium SaaS experience
- ✅ Executive dashboard with real invoice data from DB
- ✅ Billing workspace with live invoice calculations
- ✅ Invoice engine (subtotal, tax, validation) — tested
- ✅ User authentication (register, sign-in, JWT sessions)
- ✅ Database persistence (PostgreSQL via Supabase)
- ✅ Invoice CRUD API with versioning (diff, history)
- ✅ Export formats: JSON, CSV, Markdown
- ✅ GST/HSN suggestion engine — tested (20+ HSN categories)
- ✅ Anomaly detection engine — tested (tax rates, prices, GSTIN, duplicates)
- ✅ OCR document analysis API
- ✅ AI provider settings page
- ✅ Route protection (middleware)
- ✅ Mobile-responsive layout (hamburger nav, scrollable tables)
- ✅ Docker / Coolify deployment
- ✅ Health check endpoint
