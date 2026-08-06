import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionOrgId } from "@/lib/org";
import { prisma } from "@/lib/db";

/**
 * Enhanced Import API
 * Supports: products, parties, chart_of_accounts
 * Features: validation, error reporting, duplicate detection, batch upsert
 */

interface ImportRow {
  [key: string]: string | number;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  value: unknown;
}

interface ImportResult {
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
  totalRows: number;
}

const VALID_PRODUCT_FIELDS = [
  "name", "sku", "hsnCode", "category", "brand",
  "sellingPrice", "purchasePrice", "unit", "taxRate",
];
const VALID_PARTY_FIELDS = ["type", "name", "gstin", "email", "phone", "creditLimit"];
const VALID_ACCOUNT_FIELDS = ["code", "name", "type"];

const VALID_PARTY_TYPES = ["customer", "vendor", "other"];
const VALID_ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

function validateRow(
  row: ImportRow,
  requiredFields: string[],
  validFields: string[],
  entity: string,
  rowNumber: number
): ImportError[] {
  const errors: ImportError[] = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!row[field] || String(row[field]).trim() === "") {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} is required`,
        value: row[field],
      });
    }
  }

  // Validate numeric fields
  if (entity === "products") {
    const price = parseFloat(String(row.sellingPrice || "0"));
    if (row.sellingPrice && (isNaN(price) || price < 0)) {
      errors.push({
        row: rowNumber,
        field: "sellingPrice",
        message: "Must be a non-negative number",
        value: row.sellingPrice,
      });
    }
    const purchasePrice = parseFloat(String(row.purchasePrice || "0"));
    if (row.purchasePrice && (isNaN(purchasePrice) || purchasePrice < 0)) {
      errors.push({
        row: rowNumber,
        field: "purchasePrice",
        message: "Must be a non-negative number",
        value: row.purchasePrice,
      });
    }
    const taxRate = parseFloat(String(row.taxRate || "0"));
    if (row.taxRate && (isNaN(taxRate) || taxRate < 0 || taxRate > 100)) {
      errors.push({
        row: rowNumber,
        field: "taxRate",
        message: "Must be between 0 and 100",
        value: row.taxRate,
      });
    }
  }

  if (entity === "parties") {
    if (row.type && !VALID_PARTY_TYPES.includes(String(row.type))) {
      errors.push({
        row: rowNumber,
        field: "type",
        message: `Must be one of: ${VALID_PARTY_TYPES.join(", ")}`,
        value: row.type,
      });
    }
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
      errors.push({
        row: rowNumber,
        field: "email",
        message: "Invalid email format",
        value: row.email,
      });
    }
    if (row.gstin && String(row.gstin).length !== 15) {
      errors.push({
        row: rowNumber,
        field: "gstin",
        message: "GSTIN must be 15 characters",
        value: row.gstin,
      });
    }
  }

  if (entity === "chart_of_accounts") {
    if (row.type && !VALID_ACCOUNT_TYPES.includes(String(row.type))) {
      errors.push({
        row: rowNumber,
        field: "type",
        message: `Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
        value: row.type,
      });
    }
  }

  return errors;
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

  const { entity, rows } = (await request.json()) as {
    entity?: string;
    rows?: ImportRow[];
  };

  if (!entity || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: "Invalid payload: entity and rows[] required" },
      { status: 400 }
    );
  }
  if (rows.length > 5000) {
    return NextResponse.json(
      { error: "Maximum 5,000 rows per import" },
      { status: 400 }
    );
  }

  // Determine validation rules
  let requiredFields: string[];
  let validFields: string[];

  switch (entity) {
    case "products":
      requiredFields = ["name"];
      validFields = VALID_PRODUCT_FIELDS;
      break;
    case "parties":
      requiredFields = ["name"];
      validFields = VALID_PARTY_FIELDS;
      break;
    case "chart_of_accounts":
      requiredFields = ["code", "name"];
      validFields = VALID_ACCOUNT_FIELDS;
      break;
    default:
      return NextResponse.json(
        { error: `Unknown entity: ${entity}. Supported: products, parties, chart_of_accounts` },
        { status: 400 }
      );
  }

  // Validate all rows first
  const allErrors: ImportError[] = [];
  for (let i = 0; i < rows.length; i++) {
    const errors = validateRow(
      rows[i],
      requiredFields,
      validFields,
      entity,
      i + 1
    );
    allErrors.push(...errors);
  }

  // If there are validation errors, return them (don't import)
  if (allErrors.length > 0) {
    return NextResponse.json({
      entity,
      created: 0,
      updated: 0,
      skipped: rows.length,
      errors: allErrors,
      totalRows: rows.length,
      message: `Validation failed: ${allErrors.length} error(s) in ${rows.length} rows`,
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const importErrors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (entity === "products") {
        const existing = await prisma.product.findFirst({
          where: {
            orgId,
            OR: [
              { sku: String(row.sku || row.name) },
              { name: String(row.name) },
            ],
          },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: String(row.name),
              sku: String(row.sku || row.name),
              hsnCode: String(row.hsnCode || ""),
              category: String(row.category || ""),
              brand: String(row.brand || ""),
              sellingPrice: parseFloat(String(row.sellingPrice || "0")) || 0,
              purchasePrice: parseFloat(String(row.purchasePrice || "0")) || 0,
              unit: String(row.unit || "pcs"),
              taxRate: parseFloat(String(row.taxRate || "0")) || 0,
            },
          });
          updated++;
        } else {
          await prisma.product.create({
            data: {
              orgId,
              name: String(row.name),
              sku: String(row.sku || row.name),
              hsnCode: String(row.hsnCode || ""),
              category: String(row.category || ""),
              brand: String(row.brand || ""),
              sellingPrice: parseFloat(String(row.sellingPrice || "0")) || 0,
              purchasePrice: parseFloat(String(row.purchasePrice || "0")) || 0,
              unit: String(row.unit || "pcs"),
              taxRate: parseFloat(String(row.taxRate || "0")) || 0,
            },
          });
          created++;
        }
      } else if (entity === "parties") {
        const existing = await prisma.party.findFirst({
          where: { orgId, name: String(row.name) },
        });

        if (existing) {
          await prisma.party.update({
            where: { id: existing.id },
            data: {
              type: String(row.type || "customer"),
              gstin: String(row.gstin || ""),
              email: String(row.email || ""),
              phone: String(row.phone || ""),
              creditLimit: parseFloat(String(row.creditLimit || "0")) || 0,
            },
          });
          updated++;
        } else {
          await prisma.party.create({
            data: {
              orgId,
              type: String(row.type || "customer"),
              name: String(row.name),
              gstin: String(row.gstin || ""),
              email: String(row.email || ""),
              phone: String(row.phone || ""),
              creditLimit: parseFloat(String(row.creditLimit || "0")) || 0,
            },
          });
          created++;
        }
      } else if (entity === "chart_of_accounts") {
        // Check for existing by BOTH code AND name to match the unique constraint
        const existingByCode = await prisma.chartOfAccount.findFirst({
          where: { orgId, code: String(row.code) },
        });
        const existingByName = await prisma.chartOfAccount.findFirst({
          where: { orgId, name: String(row.name) },
        });

        if (existingByCode || existingByName) {
          skipped++;
          if (existingByCode) {
            importErrors.push({
              row: i + 1,
              field: "code",
              message: `Account with code "${row.code}" already exists in this organization`,
              value: row.code,
            });
          }
          if (existingByName) {
            importErrors.push({
              row: i + 1,
              field: "name",
              message: `Account with name "${row.name}" already exists in this organization`,
              value: row.name,
            });
          }
          continue;
        }

        await prisma.chartOfAccount.create({
          data: {
            orgId,
            code: String(row.code),
            name: String(row.name),
            type: (String(row.type || "EXPENSE") as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"),
          },
        });
        created++;
      }
    } catch (err) {
      skipped++;
      importErrors.push({
        row: i + 1,
        field: "general",
        message: err instanceof Error ? err.message : "Import failed",
        value: row.name,
      });
    }
  }

  const result: ImportResult = {
    entity,
    created,
    updated,
    skipped,
    errors: importErrors,
    totalRows: rows.length,
  };

  return NextResponse.json(result);
}
