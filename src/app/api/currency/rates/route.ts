import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";
import { fetchLatestRates } from "@/lib/forex";
import { getExchangeRates } from "@/lib/currency-rates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseCurrency = searchParams.get("base") || "INR";

  try {
    const rates = await getExchangeRates(baseCurrency);
    return NextResponse.json({
      base: baseCurrency,
      rates,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { fromCurrency, toCurrency, rate } = body as {
      fromCurrency?: string;
      toCurrency?: string;
      rate?: number;
    };

    if (!fromCurrency || !toCurrency || rate === undefined) {
      return NextResponse.json({ error: "fromCurrency, toCurrency, and rate are required" }, { status: 400 });
    }

    const result = await prisma.currencyExchangeRate.upsert({
      where: {
        orgId_fromCurrency_toCurrency: { orgId, fromCurrency, toCurrency },
      },
      update: { rate, source: "manual", date: new Date() },
      create: { orgId, fromCurrency, toCurrency, rate, source: "manual" },
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to save rate" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { currency: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const base = org.currency;
    const apiRates = await fetchLatestRates(base);

    if (!apiRates) {
      return NextResponse.json({ error: "Failed to fetch live rates" }, { status: 502 });
    }

    const upserted = [];
    for (const [toCurrency, rate] of Object.entries(apiRates)) {
      const result = await prisma.currencyExchangeRate.upsert({
        where: {
          orgId_fromCurrency_toCurrency: { orgId, fromCurrency: base, toCurrency },
        },
        update: { rate, source: "api", date: new Date() },
        create: { orgId, fromCurrency: base, toCurrency, rate, source: "api" },
      });
      upserted.push(result);
    }

    return NextResponse.json({ count: upserted.length, base, source: "api" });
  } catch {
    return NextResponse.json({ error: "Failed to sync rates" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSessionOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Rate ID required" }, { status: 400 });
  }

  await prisma.currencyExchangeRate.deleteMany({ where: { id, orgId } });
  return NextResponse.json({ deleted: true });
}

