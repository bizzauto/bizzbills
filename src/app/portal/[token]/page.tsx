"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import styles from "./portal.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrgInfo {
  id: string;
  name: string;
  logo: string | null;
  currency: string;
  gstin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsnCode: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin: string | null;
  currency: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  dueDate: string | null;
  createdAt: string;
  lines: InvoiceLine[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  gatewayRef: string | null;
  upiTransactionId: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  invoice: { id: string; invoiceNumber: string } | null;
}

interface PortalData {
  org: OrgInfo;
  customer: { name: string };
  invoices: Invoice[];
  payments: Payment[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function badgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "paid":
      return "badge badge-paid";
    case "sent":
      return "badge badge-sent";
    case "overdue":
      return "badge badge-overdue";
    case "draft":
      return "badge badge-draft";
    case "pending":
      return "badge badge-pending";
    case "completed":
      return "badge badge-completed";
    case "cancelled":
      return "badge badge-cancelled";
    default:
      return "badge badge-draft";
  }
}

function isOverdue(invoice: Invoice): boolean {
  if (invoice.status === "paid" || invoice.status === "cancelled") return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
}

function effectiveStatus(invoice: Invoice): string {
  if (isOverdue(invoice)) return "overdue";
  return invoice.status;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"invoices" | "payments">(
    "invoices"
  );
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/portal?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const json: PortalData = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load portal data"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Derived values ---------- */

  const unpaidInvoices =
    data?.invoices.filter(
      (inv) => inv.status !== "paid" && inv.status !== "cancelled"
    ) ?? [];
  const totalOutstanding = unpaidInvoices.reduce(
    (sum, inv) => sum + inv.total,
    0
  );
  const totalPaid =
    data?.payments
      .filter((p) => p.status === "completed" || p.status === "success")
      .reduce((sum, p) => sum + p.amount, 0) ?? 0;

  /* ---------- Loading / Error states ---------- */

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>
          <div className="animate-pulse-dot" />
          <p className="text-muted">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.error}>
          <h2>Unable to Access Portal</h2>
          <p className="text-muted">{error || "Invalid portal link."}</p>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            Please check your portal link or contact the organization for a new
            one.
          </p>
        </div>
      </div>
    );
  }

  const { org, customer, invoices, payments } = data;

  /* ---------- Render ---------- */

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {org.logo ? (
            <img
              src={org.logo}
              alt={`${org.name} logo`}
              className={styles.logo}
            />
          ) : (
            <div className={styles.logoPlaceholder}>
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className={styles.orgName}>{org.name}</h1>
            <p className={`text-muted ${styles.customerLabel}`}>
              Customer Portal &mdash; {customer.name}
            </p>
          </div>
        </div>
      </header>

      {/* KPI cards */}
      <section className={styles.kpiRow}>
        <div className={`kpi-card kpi-accent-cyan ${styles.kpiCard}`}>
          <span className="section-label">Outstanding</span>
          <span className={styles.kpiValue}>
            {formatCurrency(totalOutstanding, org.currency)}
          </span>
          <span className="text-muted">
            {unpaidInvoices.length} unpaid invoice
            {unpaidInvoices.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={`kpi-card kpi-accent-green ${styles.kpiCard}`}>
          <span className="section-label">Total Paid</span>
          <span className={styles.kpiValue}>
            {formatCurrency(totalPaid, org.currency)}
          </span>
          <span className="text-muted">
            {payments.filter((p) => p.status === "completed").length} payment
            {payments.filter((p) => p.status === "completed").length !== 1
              ? "s"
              : ""}
          </span>
        </div>
        <div className={`kpi-card kpi-accent-purple ${styles.kpiCard}`}>
          <span className="section-label">Total Invoices</span>
          <span className={styles.kpiValue}>{invoices.length}</span>
          <span className="text-muted">all time</span>
        </div>
      </section>

      {/* Tabs */}
      <div className={`${styles.tabs} no-print`}>
        <button
          className={`${styles.tab} ${activeTab === "invoices" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          Invoices
        </button>
        <button
          className={`${styles.tab} ${activeTab === "payments" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          Payment History
        </button>
      </div>

      {/* Invoices tab */}
      {activeTab === "invoices" && (
        <section className={`section-card animate-slide-up`}>
          {invoices.length === 0 ? (
            <p
              className="text-muted"
              style={{ textAlign: "center", padding: "2rem 0" }}
            >
              No invoices found.
            </p>
          ) : (
            <div className={styles.invoiceList}>
              {/* Table header */}
              <div
                className={`${styles.invoiceRow} ${styles.invoiceHeader}`}
              >
                <span>Invoice</span>
                <span>Date</span>
                <span>Due Date</span>
                <span>Amount</span>
                <span>Status</span>
                <span className="no-print" />
              </div>

              {invoices.map((inv) => {
                const status = effectiveStatus(inv);
                const isExpanded = expandedInvoice === inv.id;
                return (
                  <div key={inv.id} className={styles.invoiceGroup}>
                    <div
                      className={`${styles.invoiceRow} ${isExpanded ? styles.invoiceRowExpanded : ""}`}
                    >
                      <span className={styles.invoiceNumber}>
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-muted">
                        {formatDate(inv.createdAt)}
                      </span>
                      <span className="text-muted">
                        {formatDate(inv.dueDate)}
                      </span>
                      <span className={styles.amount}>
                        {formatCurrency(inv.total, inv.currency)}
                      </span>
                      <span>
                        <span className={badgeClass(status)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </span>
                      <span className={`${styles.actions} no-print`}>
                        {status !== "paid" && status !== "cancelled" && (
                          <button
                            className={`btn-primary ${styles.payBtn}`}
                            onClick={() =>
                              alert(
                                `Payment flow for ${inv.invoiceNumber} would open here. Integrate with your payment gateway.`
                              )
                            }
                          >
                            Pay Now
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            setExpandedInvoice(isExpanded ? null : inv.id)
                          }
                          title="View details"
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => window.print()}
                          title="Print / Download"
                        >
                          Print
                        </button>
                      </span>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className={`${styles.invoiceDetail} animate-fade-in`}>
                        <div className={styles.detailGrid}>
                          <div>
                            <span className="section-label">
                              Invoice Details
                            </span>
                            <p className="text-default">
                              <strong>Number:</strong> {inv.invoiceNumber}
                            </p>
                            <p className="text-default">
                              <strong>Customer:</strong> {inv.customerName}
                            </p>
                            {inv.customerGstin && (
                              <p className="text-default">
                                <strong>GSTIN:</strong> {inv.customerGstin}
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="section-label">Amounts</span>
                            <p className="text-default">
                              <strong>Subtotal:</strong>{" "}
                              {formatCurrency(inv.subtotal, inv.currency)}
                            </p>
                            <p className="text-default">
                              <strong>Tax:</strong>{" "}
                              {formatCurrency(inv.taxTotal, inv.currency)}
                            </p>
                            <p className="text-default">
                              <strong>Total:</strong>{" "}
                              {formatCurrency(inv.total, inv.currency)}
                            </p>
                          </div>
                        </div>

                        {inv.lines.length > 0 && (
                          <div style={{ marginTop: "1rem" }}>
                            <span className="section-label">Line Items</span>
                            <div className={styles.linesTable}>
                              <div className={styles.linesHeader}>
                                <span>Description</span>
                                <span>Qty</span>
                                <span>Rate</span>
                                <span>Tax</span>
                                <span>Amount</span>
                              </div>
                              {inv.lines.map((line) => (
                                <div
                                  key={line.id}
                                  className={styles.linesRow}
                                >
                                  <span>{line.description}</span>
                                  <span>{line.quantity}</span>
                                  <span>
                                    {formatCurrency(
                                      line.unitPrice,
                                      inv.currency
                                    )}
                                  </span>
                                  <span>{line.taxRate}%</span>
                                  <span>
                                    {formatCurrency(
                                      line.quantity *
                                        line.unitPrice *
                                        (1 + line.taxRate / 100),
                                      inv.currency
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <section className="section-card animate-slide-up">
          {payments.length === 0 ? (
            <p
              className="text-muted"
              style={{ textAlign: "center", padding: "2rem 0" }}
            >
              No payments recorded yet.
            </p>
          ) : (
            <div className={styles.paymentList}>
              <div
                className={`${styles.paymentRow} ${styles.paymentHeader}`}
              >
                <span>Date</span>
                <span>Invoice</span>
                <span>Method</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Reference</span>
              </div>
              {payments.map((pay) => (
                <div key={pay.id} className={styles.paymentRow}>
                  <span className="text-muted">
                    {formatDate(pay.paidAt || pay.createdAt)}
                  </span>
                  <span>{pay.invoice?.invoiceNumber || "--"}</span>
                  <span style={{ textTransform: "capitalize" }}>
                    {pay.method}
                  </span>
                  <span className={styles.amount}>
                    {formatCurrency(pay.amount, pay.currency)}
                  </span>
                  <span>
                    <span className={badgeClass(pay.status)}>
                      {pay.status.charAt(0).toUpperCase() +
                        pay.status.slice(1)}
                    </span>
                  </span>
                  <span className="text-muted">
                    {pay.upiTransactionId || pay.gatewayRef || "--"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <p className="text-muted">
          {org.name}
          {org.gstin && <span> &middot; GSTIN: {org.gstin}</span>}
          {org.phone && <span> &middot; {org.phone}</span>}
          {org.email && <span> &middot; {org.email}</span>}
        </p>
      </footer>
    </div>
  );
}
