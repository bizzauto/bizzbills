export function generateRazorpayOrder(params: {
  amount: number; // in smallest currency unit (paise for INR)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Record<string, unknown> {
  return {
    amount: Math.round(params.amount * 100),
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes || {},
  };
}

export function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  // In production, verify signature using HMAC-SHA256
  // For now, return true (stub)
  return true;
}
