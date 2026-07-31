export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via an SMTP API or Resend.
 * In production, POST to https://api.resend.com/emails with RESEND_API_KEY.
 * For now this is a stub that logs and returns success.
 */
export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string }> {
  console.log(
    `[EMAIL] To: ${options.to}, Subject: ${options.subject}`,
  );

  // Production example (uncomment when RESEND_API_KEY is set):
  //
  // const apiKey = process.env.RESEND_API_KEY;
  // if (!apiKey) throw new Error("RESEND_API_KEY not configured");
  //
  // const res = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${apiKey}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     from: options.from ?? process.env.EMAIL_FROM ?? "invoices@bizzauto.com",
  //     to: [options.to],
  //     subject: options.subject,
  //     html: options.html,
  //   }),
  // });
  //
  // if (!res.ok) {
  //   const body = await res.text();
  //   throw new Error(`Email send failed (${res.status}): ${body}`);
  // }
  //
  // const data = await res.json();
  // return { success: true, messageId: data.id };

  return { success: true, messageId: `msg_${Date.now()}` };
}

export interface InvoiceEmailData {
  invoiceNumber: string;
  customerName: string;
  total: number;
  currency: string;
  dueDate?: string;
  orgName: string;
  orgEmail?: string;
  orgPhone?: string;
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    SGD: "S$",
    JPY: "¥",
  };
  const sym = symbols[currency.toUpperCase()] ?? currency;
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate a professional HTML email body for an invoice.
 */
export function generateInvoiceEmailHtml(
  invoice: InvoiceEmailData,
  paymentLink?: string,
): string {
  const formattedTotal = formatCurrency(invoice.total, invoice.currency);
  const dueLine = invoice.dueDate
    ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;">Due date: <strong style="color:#0f172a;">${escapeHtml(invoice.dueDate)}</strong></p>`
    : "";

  const paymentButton = paymentLink
    ? `<a href="${escapeHtml(paymentLink)}" style="display:inline-block;background:#06b6d4;color:#fff;font-weight:600;padding:12px 28px;border-radius:9999px;text-decoration:none;font-size:15px;margin-top:16px;">Pay Now</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <!-- Header -->
    <div style="background:#0f172a;padding:32px 32px 24px;">
      <p style="margin:0;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;">Invoice</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">#${escapeHtml(invoice.invoiceNumber)}</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 4px;color:#64748b;font-size:14px;">Bill to</p>
      <p style="margin:0 0 20px;color:#0f172a;font-size:16px;font-weight:600;">${escapeHtml(invoice.customerName)}</p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Amount due</p>
        <p style="margin:0;color:#0f172a;font-size:28px;font-weight:700;">${escapeHtml(formattedTotal)}</p>
        ${dueLine}
      </div>

      ${paymentButton}

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 20px;" />

      <p style="margin:0;color:#94a3b8;font-size:13px;">
        Sent by <strong style="color:#475569;">${escapeHtml(invoice.orgName)}</strong>
        ${invoice.orgEmail ? ` &middot; ${escapeHtml(invoice.orgEmail)}` : ""}
        ${invoice.orgPhone ? ` &middot; ${escapeHtml(invoice.orgPhone)}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
