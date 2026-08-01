/**
 * GSTIN Lookup utility
 * Extracts information from GSTIN number and provides auto-fill capabilities
 *
 * GSTIN Format: 22AAAAA0000A1Z5 (15 characters)
 * - First 2 digits: State code
 * - Next 10 characters: PAN number
 * - 13th character: Entity number
 * - 14th character: Z (default)
 * - 15th character: Check digit
 */

const STATE_CODES: Record<string, { name: string; code: string }> = {
  "01": { name: "Jammu & Kashmir", code: "01" },
  "02": { name: "Himachal Pradesh", code: "02" },
  "03": { name: "Punjab", code: "03" },
  "04": { name: "Chandigarh", code: "04" },
  "05": { name: "Uttarakhand", code: "05" },
  "06": { name: "Haryana", code: "06" },
  "07": { name: "Delhi", code: "07" },
  "08": { name: "Rajasthan", code: "08" },
  "09": { name: "Uttar Pradesh", code: "09" },
  "10": { name: "Bihar", code: "10" },
  "11": { name: "Sikkim", code: "11" },
  "12": { name: "Arunachal Pradesh", code: "12" },
  "13": { name: "Nagaland", code: "13" },
  "14": { name: "Manipur", code: "14" },
  "15": { name: "Mizoram", code: "15" },
  "16": { name: "Tripura", code: "16" },
  "17": { name: "Meghalaya", code: "17" },
  "18": { name: "Assam", code: "18" },
  "19": { name: "West Bengal", code: "19" },
  "20": { name: "Jharkhand", code: "20" },
  "21": { name: "Odisha", code: "21" },
  "22": { name: "Chhattisgarh", code: "22" },
  "23": { name: "Madhya Pradesh", code: "23" },
  "24": { name: "Gujarat", code: "24" },
  "25": { name: "Daman & Diu", code: "25" },
  "26": { name: "Dadra & Nagar Haveli", code: "26" },
  "27": { name: "Maharashtra", code: "27" },
  "28": { name: "Andhra Pradesh (Old)", code: "28" },
  "29": { name: "Karnataka", code: "29" },
  "30": { name: "Goa", code: "30" },
  "31": { name: "Lakshadweep", code: "31" },
  "32": { name: "Kerala", code: "32" },
  "33": { name: "Tamil Nadu", code: "33" },
  "34": { name: "Puducherry", code: "34" },
  "35": { name: "Andaman & Nicobar", code: "35" },
  "36": { name: "Telangana", code: "36" },
  "37": { name: "Andhra Pradesh", code: "37" },
  "38": { name: "Ladakh", code: "38" },
  "97": { name: "Other Territory", code: "97" },
};

export type GstinInfo = {
  isValid: boolean;
  gstin: string;
  stateCode: string;
  stateName: string;
  panNumber: string;
  entityType: string;
  errors: string[];
};

export function parseGstin(gstin: string): GstinInfo {
  const clean = gstin.toUpperCase().trim();
  const errors: string[] = [];

  if (clean.length !== 15) {
    errors.push("GSTIN must be 15 characters");
  }

  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean)) {
    errors.push("Invalid GSTIN format");
  }

  const stateCode = clean.substring(0, 2);
  const panNumber = clean.substring(2, 12);
  const entityType = clean.substring(12, 13);

  const stateInfo = STATE_CODES[stateCode];
  const stateName = stateInfo?.name || "Unknown State";

  let entityDesc = "Regular Taxpayer";
  if (entityType === "C") entityDesc = "Compounding Taxpayer";
  if (entityType === "P") entityDesc = "Person (Government)";
  if (entityType === "H") entityDesc = "HUF";
  if (entityType === "F") entityDesc = "Partnership/LLP";
  if (entityType === "A") entityDesc = "Association of Persons";
  if (entityType === "T") entityDesc = "Trust";
  if (entityType === "B") entityDesc = "Body of Individuals";
  if (entityType === "L") entityDesc = "Local Authority";
  if (entityType === "J") entityDesc = "Artificial Juridical Person";

  return {
    isValid: errors.length === 0,
    gstin: clean,
    stateCode,
    stateName,
    panNumber,
    entityType: entityDesc,
    errors,
  };
}

export function extractStateFromGstin(gstin: string): string | null {
  const info = parseGstin(gstin);
  return info.isValid ? info.stateName : null;
}

export function validateGstin(gstin: string): { valid: boolean; error?: string } {
  const info = parseGstin(gstin);
  if (info.isValid) {
    return { valid: true };
  }
  return { valid: false, error: info.errors[0] };
}
