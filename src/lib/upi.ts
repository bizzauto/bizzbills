export function generateUpiLink(params: {
  pa: string; // UPI ID (e.g. merchant@upi)
  pn?: string; // Payee name
  am?: string; // Amount
  tn?: string; // Transaction note
  tr?: string; // Transaction reference
  mc?: string; // Merchant code
}): string {
  const upi = new URL("upi://pay");
  upi.searchParams.set("pa", params.pa);
  if (params.pn) upi.searchParams.set("pn", params.pn);
  if (params.am) upi.searchParams.set("am", params.am);
  if (params.tn) upi.searchParams.set("tn", params.tn);
  if (params.tr) upi.searchParams.set("tr", params.tr);
  if (params.mc) upi.searchParams.set("mc", params.mc);
  upi.searchParams.set("cu", "INR");
  return upi.toString();
}

export function generateQrCodeUrl(upiLink: string, size: number = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiLink)}`;
}

export function isValidUpiId(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(upiId);
}
