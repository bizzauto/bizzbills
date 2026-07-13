import type { HsnSuggestion } from "./types";

/**
 * Rule-based GST/HSN suggestion engine.
 *
 * Maps product description keywords to HSN codes and GST rates
 * based on India's GST classification. Works without an external API.
 */
const HSN_RULES: Array<{
  keywords: string[];
  hsnCode: string;
  description: string;
  taxRate: number;
}> = [
  { keywords: ["consulting", "consultancy", "professional", "service fee"], hsnCode: "9983", description: "Other professional, technical and business services", taxRate: 18 },
  { keywords: ["software", "saas", "cloud", "license", "subscription"], hsnCode: "9973", description: "Software publishing, consultancy and supply", taxRate: 18 },
  { keywords: ["accounting", "bookkeeping", "audit", "tax"], hsnCode: "9982", description: "Accounting and related services", taxRate: 18 },
  { keywords: ["legal", "advocacy", "notary"], hsnCode: "9981", description: "Legal services", taxRate: 18 },
  { keywords: ["advertising", "marketing", "promotion"], hsnCode: "9984", description: "Advertising and market research services", taxRate: 18 },
  { keywords: ["transport", "logistics", "freight", "courier", "shipping"], hsnCode: "9965", description: "Cargo and freight transportation", taxRate: 5 },
  { keywords: ["food", "restaurant", "catering", "meal"], hsnCode: "9963", description: "Food and beverage serving services", taxRate: 5 },
  { keywords: ["healthcare", "medical", "clinic", "doctor", "hospital"], hsnCode: "9991", description: "Health services", taxRate: 12 },
  { keywords: ["education", "training", "coaching", "tutorial"], hsnCode: "9992", description: "Education services", taxRate: 0 },
  { keywords: ["hardware", "computer", "laptop", "printer", "electronics"], hsnCode: "8471", description: "Automatic data processing machines", taxRate: 18 },
  { keywords: ["furniture", "chair", "table", "desk"], hsnCode: "9403", description: "Other furniture and parts thereof", taxRate: 18 },
  { keywords: ["printing", "stationery", "paper"], hsnCode: "4901", description: "Printed books, brochures and similar printed matter", taxRate: 12 },
  { keywords: ["textile", "fabric", "cloth", "garment"], hsnCode: "6001", description: "Knitted or crocheted fabrics", taxRate: 5 },
  { keywords: ["software development", "web development", "app development", "coding", "programming"], hsnCode: "9983", description: "Software development services", taxRate: 18 },
  { keywords: ["repair", "maintenance", "servicing"], hsnCode: "9987", description: "Repair and maintenance services", taxRate: 18 },
  { keywords: ["security", "surveillance", "guard"], hsnCode: "9985", description: "Security and investigation services", taxRate: 18 },
  { keywords: ["rental", "leasing", "hire"], hsnCode: "9972", description: "Leasing or rental services", taxRate: 18 },
  { keywords: ["telecommunication", "telecom", "internet", "broadband"], hsnCode: "9986", description: "Telecommunications and broadcasting services", taxRate: 18 },
  { keywords: ["insurance", "insure"], hsnCode: "9971", description: "Insurance services", taxRate: 18 },
  { keywords: ["real estate", "property", "brokerage", "commission"], hsnCode: "9979", description: "Real estate services", taxRate: 18 },
];

export function suggestHsn(description: string): HsnSuggestion[] {
  const lower = description.toLowerCase();
  const matched: HsnSuggestion[] = [];

  for (const rule of HSN_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      matched.push({
        hsnCode: rule.hsnCode,
        description: rule.description,
        taxRate: rule.taxRate,
        confidence: "high",
      });

      // Return top 3 matches max
      if (matched.length >= 3) break;
    }
  }

  return matched;
}

export function suggestHsnForInvoice(lines: Array<{ description: string }>): HsnSuggestion[] {
  const all: HsnSuggestion[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const suggestions = suggestHsn(line.description);
    for (const s of suggestions) {
      if (!seen.has(s.hsnCode)) {
        seen.add(s.hsnCode);
        all.push(s);
      }
    }
  }

  return all;
}
