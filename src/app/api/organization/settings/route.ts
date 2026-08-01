import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, slug, businessType, gstin, address, phone, email, currency, website, pan, upiId, bankName, accountName, accountNumber, ifscCode, onboardingCompleted,
    defaultTemplate, defaultAccentColor, invoiceTitle, footerNotes, showBankDetails, showGstin, showSignature, showQrCode,
    primaryColor, fontFamily, poweredByBizzBills, customFields,
  } = body as {
    name?: string; slug?: string; businessType?: string; gstin?: string; address?: string;
    phone?: string; email?: string; currency?: string; website?: string; pan?: string;
    upiId?: string; bankName?: string; accountName?: string; accountNumber?: string; ifscCode?: string; onboardingCompleted?: boolean;
    defaultTemplate?: string; defaultAccentColor?: string; invoiceTitle?: string; footerNotes?: string;
    showBankDetails?: boolean; showGstin?: boolean; showSignature?: boolean; showQrCode?: boolean;
    primaryColor?: string; fontFamily?: string; poweredByBizzBills?: boolean; customFields?: string;
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { org: true },
  });

  if (!user?.orgId) {
    return NextResponse.json(
      { error: "No organization found. Create one first." },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (gstin !== undefined) updates.gstin = gstin;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (currency !== undefined) updates.currency = currency;
  if (website !== undefined) updates.website = website;
  if (upiId !== undefined) updates.upiId = upiId;
  if (primaryColor !== undefined) updates.primaryColor = primaryColor;
  if (fontFamily !== undefined) updates.fontFamily = fontFamily;
  if (poweredByBizzBills !== undefined) updates.poweredByBizzBills = poweredByBizzBills;
  if (customFields !== undefined) updates.customFields = customFields;
  // Merge into existing settings blob to avoid losing unrelated keys
  if (onboardingCompleted !== undefined || defaultTemplate !== undefined || defaultAccentColor !== undefined || invoiceTitle !== undefined || footerNotes !== undefined || showBankDetails !== undefined || showGstin !== undefined || showSignature !== undefined || showQrCode !== undefined) {
    let existing: Record<string, unknown> = {};
    try { existing = JSON.parse((user.org as any).settings || "{}"); } catch {}
    const merged = { ...existing };
    if (onboardingCompleted !== undefined) merged.onboardingCompleted = onboardingCompleted;
    if (businessType !== undefined) merged.businessType = businessType;
    if (pan !== undefined) merged.pan = pan;
    if (bankName !== undefined) merged.bankName = bankName;
    if (accountName !== undefined) merged.accountName = accountName;
    if (accountNumber !== undefined) merged.accountNumber = accountNumber;
    if (ifscCode !== undefined) merged.ifscCode = ifscCode;
    if (defaultTemplate !== undefined) merged.defaultTemplate = defaultTemplate;
    if (defaultAccentColor !== undefined) merged.defaultAccentColor = defaultAccentColor;
    if (invoiceTitle !== undefined) merged.invoiceTitle = invoiceTitle;
    if (footerNotes !== undefined) merged.footerNotes = footerNotes;
    if (showBankDetails !== undefined) merged.showBankDetails = showBankDetails;
    if (showGstin !== undefined) merged.showGstin = showGstin;
    if (showSignature !== undefined) merged.showSignature = showSignature;
    if (showQrCode !== undefined) merged.showQrCode = showQrCode;
    updates.settings = JSON.stringify(merged);
  }

  try {
    await prisma.organization.update({
      where: { id: user.orgId },
      data: updates,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update organization settings" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { org: true },
  });

  if (!user?.org) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  let settings = {};
  try { settings = JSON.parse(user.org.settings || "{}"); } catch {}

  const s = settings as Record<string, any>;

  return NextResponse.json({
    id: user.org.id,
    name: user.org.name,
    slug: user.org.slug,
    gstin: user.org.gstin,
    address: user.org.address,
    phone: user.org.phone,
    email: user.org.email,
    currency: user.org.currency,
    website: user.org.website,
    upiId: user.org.upiId,
    plan: user.org.plan,
    onboardingCompleted: s.onboardingCompleted,
    businessType: s.businessType,
    pan: s.pan,
    bankName: s.bankName,
    accountName: s.accountName,
    accountNumber: s.accountNumber,
    ifscCode: s.ifscCode,
    // Template settings
    defaultTemplate: s.defaultTemplate || "classic",
    defaultAccentColor: s.defaultAccentColor || "#06b6d4",
    invoiceTitle: s.invoiceTitle || "Tax Invoice",
    footerNotes: s.footerNotes || "Payment due within 7 days. Thank you for your business.",
    showBankDetails: s.showBankDetails !== false,
    showGstin: s.showGstin !== false,
    showSignature: s.showSignature !== false,
    showQrCode: s.showQrCode !== false,
    // Branding settings (Phase 17)
    primaryColor: (user.org as any).primaryColor || "#06b6d4",
    fontFamily: (user.org as any).fontFamily || "Inter",
    poweredByBizzBills: (user.org as any).poweredByBizzBills !== false,
    customFields: (user.org as any).customFields || "[]",
  });
}