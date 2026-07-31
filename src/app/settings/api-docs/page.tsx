"use client";

import { useState } from "react";

/* ── Types ── */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type ApiEndpoint = {
  method: HttpMethod;
  path: string;
  description: string;
  auth: boolean;
  requestBody?: string;
  responseBody: string;
};

type ApiCategory = {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
};

/* ── Endpoint catalogue ── */

const API_CATEGORIES: ApiCategory[] = [
  {
    name: "Invoices",
    description: "Create, retrieve, update, and manage invoices with line items and version history.",
    endpoints: [
      {
        method: "GET",
        path: "/api/invoices",
        description: "List all invoices for the authenticated organization.",
        auth: true,
        responseBody: `[
  {
    "id": "clx1abc...",
    "invoiceNumber": "INV-001",
    "customerName": "Acme Corp",
    "status": "sent",
    "subtotal": 10000,
    "taxTotal": 1800,
    "total": 11800,
    "currency": "INR",
    "createdAt": "2026-07-01T10:00:00Z",
    "lines": [...]
  }
]`,
      },
      {
        method: "POST",
        path: "/api/invoices",
        description: "Create a new invoice with line items.",
        auth: true,
        requestBody: `{
  "invoiceNumber": "INV-002",
  "customerName": "Acme Corp",
  "customerGstin": "27AABCU9603R1ZM",
  "currency": "INR",
  "dueDate": "2026-08-15",
  "lines": [
    {
      "description": "Consulting services",
      "quantity": 10,
      "unitPrice": 5000,
      "taxRate": 18,
      "hsnCode": "998314"
    }
  ]
}`,
        responseBody: `{
  "id": "clx2def...",
  "invoiceNumber": "INV-002",
  "customerName": "Acme Corp",
  "status": "draft",
  "subtotal": 50000,
  "taxTotal": 9000,
  "total": 59000,
  "lines": [...]
}`,
      },
      {
        method: "GET",
        path: "/api/invoices/[id]",
        description: "Retrieve a single invoice by its ID.",
        auth: true,
        responseBody: `{
  "id": "clx1abc...",
  "invoiceNumber": "INV-001",
  "customerName": "Acme Corp",
  "status": "sent",
  "subtotal": 10000,
  "taxTotal": 1800,
  "total": 11800,
  "lines": [...],
  "versions": [...]
}`,
      },
    ],
  },
  {
    name: "Payments",
    description: "Record and track payments against invoices, including UPI and bank transfers.",
    endpoints: [
      {
        method: "GET",
        path: "/api/payments",
        description: "List all payments for the organization.",
        auth: true,
        responseBody: `[
  {
    "id": "pay_abc...",
    "amount": 59000,
    "currency": "INR",
    "method": "upi",
    "status": "completed",
    "invoice": { "invoiceNumber": "INV-002" },
    "createdAt": "2026-07-05T14:30:00Z"
  }
]`,
      },
      {
        method: "POST",
        path: "/api/payments",
        description: "Record a new payment, optionally linked to an invoice.",
        auth: true,
        requestBody: `{
  "invoiceId": "clx1abc...",
  "amount": 59000,
  "currency": "INR",
  "method": "bank_transfer",
  "notes": "Partial payment via NEFT"
}`,
        responseBody: `{
  "id": "pay_def...",
  "amount": 59000,
  "method": "bank_transfer",
  "status": "pending",
  "upiLink": null
}`,
      },
      {
        method: "POST",
        path: "/api/payments/mark-paid",
        description: "Mark an invoice as fully paid.",
        auth: true,
        requestBody: `{
  "invoiceId": "clx1abc..."
}`,
        responseBody: `{
  "ok": true,
  "invoiceStatus": "paid"
}`,
      },
    ],
  },
  {
    name: "Parties",
    description: "Manage customers, vendors, and other business contacts.",
    endpoints: [
      {
        method: "GET",
        path: "/api/parties",
        description: "List all parties (customers, vendors, others).",
        auth: true,
        responseBody: `[
  {
    "id": "pty_abc...",
    "name": "Acme Corp",
    "type": "customer",
    "gstin": "27AABCU9603R1ZM",
    "email": "billing@acme.com",
    "phone": "+919876543210",
    "creditLimit": 500000,
    "outstandingBalance": 11800
  }
]`,
      },
      {
        method: "POST",
        path: "/api/parties",
        description: "Create a new party (customer or vendor).",
        auth: true,
        requestBody: `{
  "name": "Widget Ltd",
  "type": "vendor",
  "gstin": "29AAACW1234F1Z5",
  "email": "accounts@widget.com",
  "phone": "+911234567890"
}`,
        responseBody: `{
  "id": "pty_def...",
  "name": "Widget Ltd",
  "type": "vendor",
  "createdAt": "2026-07-01T10:00:00Z"
}`,
      },
    ],
  },
  {
    name: "Products",
    description: "Manage product catalog with pricing, HSN codes, and inventory tracking.",
    endpoints: [
      {
        method: "GET",
        path: "/api/products",
        description: "List all products in the catalog.",
        auth: true,
        responseBody: `[
  {
    "id": "prod_abc...",
    "name": "Widget Pro",
    "sku": "WP-001",
    "hsnCode": "8471",
    "sellingPrice": 25000,
    "purchasePrice": 18000,
    "taxRate": 18,
    "unit": "pcs",
    "category": "Electronics"
  }
]`,
      },
      {
        method: "POST",
        path: "/api/products",
        description: "Add a new product to the catalog.",
        auth: true,
        requestBody: `{
  "name": "Widget Pro",
  "sku": "WP-001",
  "hsnCode": "8471",
  "sellingPrice": 25000,
  "purchasePrice": 18000,
  "taxRate": 18,
  "unit": "pcs",
  "category": "Electronics"
}`,
        responseBody: `{
  "id": "prod_def...",
  "name": "Widget Pro",
  "sku": "WP-001",
  "isActive": true
}`,
      },
    ],
  },
  {
    name: "Orders",
    description: "Manage sales orders, purchase orders, quotations, and delivery challans.",
    endpoints: [
      {
        method: "GET",
        path: "/api/orders",
        description: "List all orders filtered by type (sales_order, purchase_order, quotation, delivery_challan).",
        auth: true,
        responseBody: `[
  {
    "id": "ord_abc...",
    "orderNumber": "SO-001",
    "orderType": "sales_order",
    "status": "approved",
    "partyName": "Acme Corp",
    "total": 118000,
    "orderDate": "2026-07-01T00:00:00Z"
  }
]`,
      },
      {
        method: "POST",
        path: "/api/orders",
        description: "Create a new order.",
        auth: true,
        requestBody: `{
  "orderNumber": "SO-002",
  "orderType": "sales_order",
  "partyName": "Acme Corp",
  "orderDate": "2026-07-15",
  "lines": [
    {
      "description": "Widget Pro x 10",
      "quantity": 10,
      "unitPrice": 25000,
      "taxRate": 18
    }
  ]
}`,
        responseBody: `{
  "id": "ord_def...",
  "orderNumber": "SO-002",
  "status": "draft",
  "total": 295000
}`,
      },
    ],
  },
  {
    name: "Reports",
    description: "Generate sales reports, aging analysis, daybook, and cash flow statements.",
    endpoints: [
      {
        method: "GET",
        path: "/api/reports/sales",
        description: "Get sales report with date range filtering.",
        auth: true,
        responseBody: `{
  "totalSales": 590000,
  "totalInvoices": 12,
  "period": { "from": "2026-07-01", "to": "2026-07-31" }
}`,
      },
      {
        method: "GET",
        path: "/api/reports/aging",
        description: "Get accounts receivable aging report.",
        auth: true,
        responseBody: `{
  "current": 250000,
  "days30": 120000,
  "days60": 50000,
  "days90plus": 30000,
  "totalOutstanding": 450000
}`,
      },
      {
        method: "GET",
        path: "/api/reports/daybook",
        description: "Get daybook (daily transaction summary).",
        auth: true,
        responseBody: `{
  "date": "2026-07-15",
  "entries": [...],
  "totalDebit": 59000,
  "totalCredit": 59000
}`,
      },
    ],
  },
  {
    name: "Organization",
    description: "Manage organization settings, users, and subscription.",
    endpoints: [
      {
        method: "GET",
        path: "/api/organization/settings",
        description: "Get current organization settings and plan details.",
        auth: true,
        responseBody: `{
  "id": "org_abc...",
  "name": "My Company",
  "slug": "my-company",
  "currency": "INR",
  "plan": "professional",
  "gstin": "27AABCU9603R1ZM"
}`,
      },
      {
        method: "PUT",
        path: "/api/organization/settings",
        description: "Update organization settings.",
        auth: true,
        requestBody: `{
  "name": "My Company Pvt Ltd",
  "currency": "INR",
  "upiId": "mycompany@upi"
}`,
        responseBody: `{
  "ok": true
}`,
      },
    ],
  },
];

/* ── Utility ── */

function methodColor(method: HttpMethod): string {
  switch (method) {
    case "GET":
      return "badge-paid";
    case "POST":
      return "badge-sent";
    case "PUT":
      return "badge-pending";
    case "DELETE":
      return "badge-overdue";
  }
}

/* ── Code block component ── */

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-[var(--card-border)] bg-[var(--badge-bg)] px-3 py-1.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-accent hover:text-accent transition"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-4 text-xs leading-5 text-default">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Endpoint card ── */

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="list-item">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className={`badge ${methodColor(endpoint.method)} mt-0.5 shrink-0 font-mono`}>
          {endpoint.method}
        </span>
        <div className="flex-1">
          <p className="font-mono text-sm font-medium text-default">
            {endpoint.path}
          </p>
          <p className="mt-0.5 text-sm text-muted">{endpoint.description}</p>
          {endpoint.auth && (
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-warning">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Auth required
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-[var(--card-border)] pt-4">
          {endpoint.requestBody && (
            <CodeBlock label="Request Body" code={endpoint.requestBody} />
          )}
          <CodeBlock label="Response" code={endpoint.responseBody} />
        </div>
      )}
    </div>
  );
}

/* ── Page component ── */

export default function ApiDocsPage() {
  const [activeCategory, setActiveCategory] = useState(API_CATEGORIES[0].name);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = API_CATEGORIES.map((cat) => ({
    ...cat,
    endpoints: cat.endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter(
    (cat) =>
      searchQuery === "" ||
      cat.endpoints.length > 0 ||
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentCategory =
    filteredCategories.find((c) => c.name === activeCategory) ??
    filteredCategories[0];

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      {/* Page Header */}
      <section className="section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-accent">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-default">
              API Documentation
            </h1>
            <p className="mt-1 text-sm text-muted">
              Complete reference for integrating with the BizzAuto API via REST
              endpoints.
            </p>
          </div>
        </div>
      </section>

      {/* Authentication Guide */}
      <section className="section-card">
        <h2 className="section-label">Authentication</h2>
        <p className="mt-2 text-sm text-muted">
          All API requests require a valid session token. Obtain one by signing
          in through the authentication endpoint, then include it as a Bearer
          token in the <code className="rounded bg-[var(--badge-bg)] px-1.5 py-0.5 text-xs text-accent">Authorization</code> header.
        </p>

        <CodeBlock
          label="cURL Example"
          code={`curl -X GET https://your-domain.com/api/invoices \\
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \\
  -H "Content-Type: application/json"`}
        />

        <CodeBlock
          label="JavaScript / fetch"
          code={`const response = await fetch("/api/invoices", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_SESSION_TOKEN",
    "Content-Type": "application/json",
  },
});

const invoices = await response.json();`}
        />

        <CodeBlock
          label="Python / requests"
          code={`import requests

response = requests.get(
    "https://your-domain.com/api/invoices",
    headers={
        "Authorization": "Bearer YOUR_SESSION_TOKEN",
        "Content-Type": "application/json",
    },
)

invoices = response.json()`}
        />
      </section>

      {/* API Key Management */}
      <section className="section-card">
        <h2 className="section-label">API Key Management</h2>
        <p className="mt-2 text-sm text-muted">
          For programmatic access, you can generate API keys from the{" "}
          <a
            href="/settings"
            className="text-accent hover:text-accent transition"
          >
            Settings
          </a>{" "}
          page. API keys provide persistent authentication without session
          expiry.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-4">
            <h3 className="text-sm font-semibold text-default">
              Generating an API Key
            </h3>
            <ol className="mt-2 space-y-1.5 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">1.</span>
                Navigate to Settings &gt; AI Provider (or API Keys section)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">2.</span>
                Click &quot;Generate API Key&quot;
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">3.</span>
                Copy the key immediately (shown only once)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">4.</span>
                Use it as <code className="text-xs text-accent">Bearer YOUR_API_KEY</code> in
                the Authorization header
              </li>
            </ol>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-4">
            <h3 className="text-sm font-semibold text-default">
              Revoking an API Key
            </h3>
            <ol className="mt-2 space-y-1.5 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-danger">1.</span>
                Go to Settings and locate the API key entry
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-danger">2.</span>
                Click the revoke / delete action next to the key
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-danger">3.</span>
                All requests using that key will immediately fail with 401
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="section-card">
        <h2 className="section-label">Rate Limits</h2>
        <p className="mt-2 text-sm text-muted">
          API requests are rate-limited per organization to ensure fair usage.
          Exceeding the limit returns HTTP <code className="rounded bg-[var(--badge-bg)] px-1.5 py-0.5 text-xs text-danger">429 Too Many Requests</code>.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3 text-center">
            <p className="text-2xl font-bold text-default">100</p>
            <p className="text-xs text-muted">requests / minute</p>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3 text-center">
            <p className="text-2xl font-bold text-default">1,000</p>
            <p className="text-xs text-muted">requests / hour</p>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--badge-bg)] p-3 text-center">
            <p className="text-2xl font-bold text-default">50 KB</p>
            <p className="text-xs text-muted">max request body</p>
          </div>
        </div>
      </section>

      {/* Endpoint Explorer */}
      <section className="section-card">
        <h2 className="section-label">Endpoints</h2>

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search endpoints..."
            className="input"
          />
        </div>

        {/* Category tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {filteredCategories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(cat.name)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === cat.name
                  ? "bg-accent text-[#020617]"
                  : "border border-[var(--card-border)] text-muted hover:bg-[var(--badge-bg)]"
              }`}
            >
              {cat.name}
              <span className="ml-1 opacity-60">({cat.endpoints.length})</span>
            </button>
          ))}
        </div>

        {/* Category description */}
        {currentCategory && (
          <>
            <p className="mt-4 text-sm text-muted">
              {currentCategory.description}
            </p>

            {/* Endpoints */}
            <div className="mt-4 space-y-3">
              {currentCategory.endpoints.map((ep) => (
                <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
              ))}
              {currentCategory.endpoints.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">
                  No endpoints match your search.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Error Codes */}
      <section className="section-card">
        <h2 className="section-label">Error Codes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--table-border)]">
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Code
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Meaning
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  code: "400",
                  meaning: "Bad Request",
                  action: "Check request body and parameters",
                },
                {
                  code: "401",
                  meaning: "Unauthorized",
                  action: "Verify your session token or API key",
                },
                {
                  code: "403",
                  meaning: "Forbidden",
                  action: "User lacks permission for this operation",
                },
                {
                  code: "404",
                  meaning: "Not Found",
                  action: "The requested resource does not exist",
                },
                {
                  code: "429",
                  meaning: "Too Many Requests",
                  action: "Wait and retry after the cooldown period",
                },
                {
                  code: "500",
                  meaning: "Server Error",
                  action: "Retry later; contact support if persistent",
                },
              ].map((row) => (
                <tr
                  key={row.code}
                  className="border-b border-[var(--table-border)]"
                >
                  <td className="py-2.5 font-mono font-semibold text-default">
                    {row.code}
                  </td>
                  <td className="py-2.5 text-default">{row.meaning}</td>
                  <td className="py-2.5 text-muted">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
