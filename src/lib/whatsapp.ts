export function generateWhatsAppShareUrl(params: {
  phone?: string;
  message: string;
}): string {
  const phone = params.phone?.replace(/[\s\-+]/g, '') || '';
  const encoded = encodeURIComponent(params.message);
  return phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export function generateInvoiceWhatsAppMessage(invoice: {
  invoiceNumber: string;
  customerName: string;
  total: number;
  currency: string;
  dueDate?: string;
  orgName: string;
}, paymentLink?: string): string {
  return `📋 Invoice from ${invoice.orgName}\n\nInvoice: ${invoice.invoiceNumber}\nCustomer: ${invoice.customerName}\nAmount: ${invoice.currency} ${invoice.total.toLocaleString('en-IN')}${invoice.dueDate ? `\nDue: ${invoice.dueDate}` : ''}${paymentLink ? `\n\nPay now: ${paymentLink}` : ''}\n\nThank you for your business!`;
}
