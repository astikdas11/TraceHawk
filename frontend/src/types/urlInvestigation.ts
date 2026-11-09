/**
 * TRACEHAWK — URL Investigation TypeScript Contracts.
 * Exact mirror of backend Pydantic models in backend/app/api/v1/endpoints/url_investigation.py.
 * Preserves 100% of property names, casing, types, and nullabilities.
 */

export interface ThreatEvidenceItem {
  id: string;
  title: string;
  category: string;
  severity: string;
  evidence: string;
  source: string;
  confidence: string;
}

export interface UrlInvestigationRequest {
  url: string;
  threshold_mode?: 'standard' | 'security_hardened';
}

export interface UrlInvestigationResponse {
  id: string;
  url: string;
  original_url: string;
  normalized_url: string;
  normalisedUrl: string;
  domain: string;
  riskScore: number;
  risk_score: number;
  riskLevel: string;
  risk_level: string;
  risk_label: string;
  riskLabel: string;
  category: string;
  tier: string;
  model_version: string;
  prediction_label: string;
  prob_malicious: number;
  prob_benign: number;
  threshold: number;
  threshold_mode: string;
  shannonEntropy: number;
  subdomainDepth: number;
  isPunycode: boolean;
  isIpHosname: boolean;
  features: Record<string, unknown>;
  explanation: string;
  warnings: string[];
  evidenceList: ThreatEvidenceItem[];
  timestamp: string;
}

