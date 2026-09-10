import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrg } from "@/lib/org";
import { prisma } from "@/lib/db";
import { Prisma, PrismaClient } from "@prisma/client";
import { calculateInvoiceSummary, sanitizeInvoiceDraft, type InvoiceDraft, type InvoiceSummary } from "@/lib/invoicing";
import { autoPostInvoiceJournal } from "@/lib/journal";
import { snapshotFromInvoice } from "@/lib/diff";
import { getPlanLimit, invoiceCountWhere } from "@/lib/planLimits";

/**
 * Returns `base` unchanged when available; otherwise keeps incrementing the
 * trailing number (INV-0001 -> INV-0002) until a free number is found. Falls
 * back to a timestamp suffix only for numbers with no trailing digits.
 */
async function ensureUniqueInvoiceNumber(base: string | null | undefined, orgId: string | null | undefined): Promise<string> {
  const taken = (n: string) =>
    prisma.invoice.findFirst({ where: { orgId: orgId ?? undefined, invoiceNumber: n }, select: { id: true } });

  if (!base || !(await taken(base))) return base || `${Date.now().toString(36).toUpperCase()}`;

  const m = base.match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return `${base}-${Date.now().toString(36).toUpperCase()}`;

  const [, head, digits, tail] = m;
  let seq = parseInt(digits, 10);
  let candidate = base;
  do {
    seq += 1;
    candidate = `${head}${String(seq).padStart(digits.length, "0")}${tail}`;
  } while (await taken(candidate));
  return candidate;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await getSessionOrg() ?? {};

  const whereClause: { userId?: string; orgId?: string } = {
    userId: session.user.id,
  };
  if (orgId) {
    whereClause.orgId = orgId;
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: InvoiceDraft;
    try {
      body = (await request.json()) as InvoiceDraft;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const clean = sanitizeInvoiceDraft(body);
    const summary = calculateInvoiceSummary(clean);

    if (!summary.isValid) {
      return NextResponse.json(
        { error: summary.warnings.join(" • ") },
        { status: 400 },
      );
    }

    const { orgId } = (await getSessionOrg()) ?? {};

    // ── Plan limit enforcement (per plan pricing) ──
    // Only enforced for org-scoped invoices; plan limits are per-organization.
    if (orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { plan: true },
      });
      const plan = getPlanLimit(org?.plan);
      if (plan.invoiceLimit !== null) {
        const used = await prisma.invoice.count({ where: invoiceCountWhere(orgId) });
        if (used >= plan.invoiceLimit) {
          return NextResponse.json(
            {
              error: `Plan limit reached: ${plan.invoiceLimit} invoices/month on your current plan. Upgrade to continue.`,
              code: "INVOICE_LIMIT_REACHED",
              limit: plan.invoiceLimit,
              used,
            },
            { status: 403 },
          );
        }
      }
    }

    // Ensure a unique invoice number. When the client-supplied number already
    // exists, bump its trailing number instead of appending an ugly timestamp:
    // INV-0001 -> INV-0002.
    let invoiceNumber = await ensureUniqueInvoiceNumber(clean.invoiceNumber ?? "", orgId);

    // Create the invoice, its lines, the version-1 snapshot, and the
    // auto-posted journal entry in a single transaction. Two parallel
    // requests can both pass ensureUniqueInvoiceNumber for the same number;
    // the DB unique constraint then rejects the loser (P2002) — we re-check
    // and retry with a bumped number (up to 3 attempts) instead of failing.
    let invoice: Awaited<ReturnType<typeof createInvoiceTx>> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        invoice = await createInvoiceTx(prisma, invoiceNumber, clean, summary, session.user.id, orgId);
        break;
      } catch (err) {
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isUniqueViolation || attempt === 2) throw err;
        const next = await ensureUniqueInvoiceNumber(`${invoiceNumber}-1`, orgId);
        if (next === invoiceNumber) throw err; // cannot bump further — give up
        invoiceNumber = next;
      }
    }
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice number already exists. Please use a different number." },
        { status: 409 },
      );
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    // Two simultaneous requests can race past ensureUniqueInvoiceNumber and
    // both attempt the same number; the DB unique constraint
    // @@unique([orgId, invoiceNumber]) then rejects the loser (P2002). That
    // is data-safe — surface a clean, actionable message instead of a
    // raw Prisma error.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Invoice number already exists. Please use a different number." },
        { status: 409 },
      );
    }
    console.error("[invoices] POST failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create invoice" },
      { status: 500 },
    );
  }
}

/**
 * The full invoice-creation transaction: invoice + line items + version-1
 * snapshot + auto-posted journal entry + org bank-detail persistence.
 * Extracted so the POST handler can retry it with a bumped invoice number
 * when two parallel requests race on the same number (P2002).
 */
async function createInvoiceTx(
  db: PrismaClient,
  invoiceNumber: string,
  clean: InvoiceDraft,
  summary: InvoiceSummary,
  userId: string,
  orgId: string | null | undefined,
) {
  return db.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerName: clean.customerName,
        customerGstin: clean.customerGstin,
        currency: clean.currency,
        date: clean.date ?? new Date().toISOString().split("T")[0],
        dueDate: clean.dueDate,
        status: clean.status ?? "draft",
        subtotal: summary.subtotal,
        taxTotal: summary.taxTotal,
        total: summary.total,
        version: 1,
        userId,
        orgId: orgId ?? undefined,
        discountPercent: clean.discountPercent ?? 0,
        discountAmount: summary.discountAmount,
        shippingCharges: clean.shippingCharges ?? 0,
        adjustment: clean.adjustment ?? 0,
        roundOff: summary.roundOff,
        amountInWords: clean.amountInWords ?? "",        amountPaid: clean.amountPaid ?? 0,
        isTaxInclusive: clean.isTaxInclusive ?? false,
        customerAddress: clean.customerAddress ?? "",
        customerEmail: clean.customerEmail ?? "",
        customerPhone: clean.customerPhone ?? "",
        customerState: clean.customerState ?? "",
        shippingSameAsBilling: clean.shippingSameAsBilling ?? true,
        shippingName: clean.shippingName ?? "",
        shippingAddress: clean.shippingAddress ?? "",
        shippingPhone: clean.shippingPhone ?? "",
        placeOfSupply: clean.placeOfSupply ?? "",
        reverseCharge: clean.reverseCharge ?? false,
        poNumber: clean.poNumber ?? "",
        referenceNumber: clean.referenceNumber ?? "",
        notes: clean.notes ?? "",
        terms: clean.terms ?? "",
        bankName: clean.bankName ?? "",
        bankAccountName: clean.bankAccountName ?? "",
        bankAccountNumber: clean.bankAccountNumber ?? "",
        bankIfsc: clean.bankIfsc ?? "",
        bankBranch: clean.bankBranch ?? "",
        upiId: clean.upiId ?? "",
        signatureName: clean.signatureName ?? "",
        signatureDesignation: clean.signatureDesignation ?? "",
        lines: {
          create: clean.lines.map((line) => ({
            description: line.description,
            hsnCode: line.hsnCode,
            quantity: line.quantity,
            unit: line.unit ?? "PCS",
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            discount: line.discount,
            discountType: line.discountType ?? "percent",
          })),
        },
      },
      include: { lines: true },
    });

    const snapshot = snapshotFromInvoice(created);
    await tx.invoiceVersion.create({
      data: {
        invoiceId: created.id,
        version: 1,
        snapshot: JSON.stringify(snapshot),
        changeComment: "Invoice created",
      },
    });

    if (orgId) {
      await autoPostInvoiceJournal(orgId, created, clean, summary, tx);

      // Persist entered bank details into the org so they pre-fill every
      // future invoice (saved once, reused everywhere). Only overwrite a
      // field when the invoice actually carries a value, so a blank invoice
      // can never wipe previously saved details.
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { settings: true, upiId: true },
      });

      let orgSettings: Record<string, unknown> = {};
      try {
        orgSettings = org?.settings ? JSON.parse(org.settings) : {};
      } catch {
        orgSettings = {};
      }

      const orgUpdates: Record<string, unknown> = {};
      if (clean.bankName) orgSettings.bankName = clean.bankName;
      if (clean.bankAccountName) orgSettings.accountName = clean.bankAccountName;
      if (clean.bankAccountNumber) orgSettings.accountNumber = clean.bankAccountNumber;
      if (clean.bankIfsc) orgSettings.ifscCode = clean.bankIfsc;
      if (clean.upiId) {
        orgSettings.upiId = clean.upiId;
        orgUpdates.upiId = clean.upiId;
      }
      orgUpdates.settings = JSON.stringify(orgSettings);

      await tx.organization.update({
        where: { id: orgId },
        data: orgUpdates,
      });
    }

    return created;
  });
}
