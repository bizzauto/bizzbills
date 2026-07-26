import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSessionOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { orgId: true },
  });
  return user?.orgId;
}

export async function GET(request: Request) {
  const orgId = await getSessionOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const reportType = url.searchParams.get("type") || "trial-balance";
  const fromDate = url.searchParams.get("fromDate") ?? "2024-01-01";
  const toDate = url.searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  const from = new Date(fromDate);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  switch (reportType) {
    case "trial-balance":
      return NextResponse.json(await getTrialBalance(orgId, from, to));
    case "profit-loss":
      return NextResponse.json(await getProfitLoss(orgId, from, to));
    case "balance-sheet":
      return NextResponse.json(await getBalanceSheet(orgId, from, to));
    case "cash-flow":
      return NextResponse.json(await getCashFlow(orgId, from, to));
    default:
      return NextResponse.json(await getTrialBalance(orgId, from, to));
  }
}

async function getTrialBalance(orgId: string, from: Date, to: Date) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { orgId, isActive: true },
    include: {
      ledgerEntries: {
        where: { entryDate: { gte: from, lte: to } },
      },
    },
    orderBy: { code: "asc" },
  });

  return accounts.map((acct) => {
    const debitTotal = acct.ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const creditTotal = acct.ledgerEntries.reduce((s, e) => s + e.credit, 0);
    const balance = acct.type === "ASSET" || acct.type === "EXPENSE"
      ? debitTotal - creditTotal
      : creditTotal - debitTotal;

    return {
      id: acct.id,
      code: acct.code,
      name: acct.name,
      type: acct.type,
      debitTotal,
      creditTotal,
      balance,
      isBalanceSheet: acct.type === "ASSET" || acct.type === "LIABILITY" || acct.type === "EQUITY",
    };
  });
}

async function getProfitLoss(orgId: string, from: Date, to: Date) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { orgId, type: { in: ["INCOME", "EXPENSE"] }, isActive: true },
    include: {
      ledgerEntries: {
        where: { entryDate: { gte: from, lte: to } },
      },
    },
    orderBy: { code: "asc" },
  });

  const incomeAccounts = accounts.filter((a) => a.type === "INCOME");
  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");

  const totalIncome = incomeAccounts.reduce(
    (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0),
    0,
  );
  const totalExpenses = expenseAccounts.reduce(
    (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.debit - e.credit, 0),
    0,
  );

  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    accounts: accounts.map((acct) => ({
      id: acct.id,
      code: acct.code,
      name: acct.name,
      type: acct.type,
      amount: acct.type === "INCOME"
        ? acct.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0)
        : acct.ledgerEntries.reduce((s, e) => s + e.debit - e.credit, 0),
    })),
  };
}

async function getBalanceSheet(orgId: string, from: Date, to: Date) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { orgId, type: { in: ["ASSET", "LIABILITY", "EQUITY"] }, isActive: true },
    include: {
      ledgerEntries: {
        where: { entryDate: { lte: to } },
      },
    },
    orderBy: { code: "asc" },
  });

  const assets = accounts.filter((a) => a.type === "ASSET");
  const liabilities = accounts.filter((a) => a.type === "LIABILITY");
  const equity = accounts.filter((a) => a.type === "EQUITY");

  const totalAssets = assets.reduce(
    (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.debit - e.credit, 0),
    0,
  );
  const totalLiabilities = liabilities.reduce(
    (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0),
    0,
  );
  const totalEquity = equity.reduce(
    (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0),
    0,
  );

  return {
    asOfDate: to.toISOString(),
    totalAssets,
    totalLiabilities,
    totalEquity,
    assets: assets.map((acct) => ({
      id: acct.id,
      code: acct.code,
      name: acct.name,
      balance: acct.ledgerEntries.reduce((s, e) => s + e.debit - e.credit, 0),
    })),
    liabilities: liabilities.map((acct) => ({
      id: acct.id,
      code: acct.code,
      name: acct.name,
      balance: acct.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0),
    })),
    equity: equity.map((acct) => ({
      id: acct.id,
      code: acct.code,
      name: acct.name,
      balance: acct.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0),
    })),
  };
}

async function getCashFlow(orgId: string, from: Date, to: Date) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { orgId, type: { in: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] }, isActive: true },
    include: {
      ledgerEntries: {
        where: { entryDate: { gte: from, lte: to } },
      },
    },
    orderBy: { code: "asc" },
  });

  const operating = accounts.filter((a) => a.type === "EXPENSE");
  const investing = accounts.filter((a) => a.type === "ASSET");
  const financing = accounts.filter((a) => a.type === "LIABILITY" || a.type === "EQUITY");

  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
    operatingCashFlow: operating.reduce(
      (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.debit - e.credit, 0),
      0,
    ),
    investingCashFlow: investing.reduce(
      (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s - e.debit + e.credit, 0),
      0,
    ),
    financingCashFlow: financing.reduce(
      (sum, a) => sum + a.ledgerEntries.reduce((s, e) => s + e.credit - e.debit, 0),
      0,
    ),
  };
}