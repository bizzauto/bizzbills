export type AiSuggestion = {
  type: "hsn" | "tax" | "anomaly" | "reminder" | "draft";
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  action?: string;
};

export type HsnSuggestion = {
  hsnCode: string;
  description: string;
  taxRate: number;
  confidence: "high" | "medium" | "low";
};

export type AnomalyFlag = {
  severity: "critical" | "warning" | "info";
  field: string;
  message: string;
  suggestion: string;
};

export type AiAnalysisResult = {
  suggestions: AiSuggestion[];
  anomalies: AnomalyFlag[];
  hsnSuggestions: HsnSuggestion[];
};
