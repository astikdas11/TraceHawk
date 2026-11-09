/**
 * TRACEHAWK — Domain Investigation TypeScript Contracts (Phase 4.3 Step 6).
 *
 * Exact mirror of backend Pydantic models in backend/app/schemas/domain_investigation.py.
 * Preserves 100% of property names, casing, types, and nullabilities.
 */

export interface DomainInvestigationRequest {
  domain: string;
}

export interface DnsRecordModel {
  type: string;
  value: string;
  ttl: number;
  flag?: string | null;
}

export interface SoaRecordData {
  mname: string;
  rname: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum: number;
  ttl: number;
}

export interface DnsIntelligenceData {
  domain: string;
  asciiDomain: string;
  isIdn: boolean;
  registrar: string;
  creationDate: string;
  ageDays: number;
  asn: string;
  ipAddress: string;
  dnsRecords: DnsRecordModel[];
  collectionStatus: 'SUCCESS' | 'PARTIAL' | 'DOMAIN_NOT_FOUND' | 'NO_RECORDS' | 'FAILED' | string;
  uncollectedFields: string[];
  warnings: string[];
  hasSpf: boolean;
  spfRecord?: string | null;
  spf: Record<string, unknown>;
  hasDmarc: boolean;
  dmarcRecord?: string | null;
  dmarcPolicy?: string | null;
  dmarc: Record<string, unknown>;
  soa?: SoaRecordData | Record<string, unknown> | null;
}

export interface TlsIntelligenceData {
  domain: string;
  asciiDomain: string;
  isIdn: boolean;
  validityStatus:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'HOSTNAME_MISMATCH'
    | 'SELF_SIGNED'
    | 'UNTRUSTED_CA'
    | 'UNAVAILABLE'
    | 'INVALID'
    | string;
  chainVerificationStatus: string;
  hostnameVerificationStatus: string;
  subject: string;
  issuer: string;
  validationType: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  totalDays: number;
  protocol: string;
  cipherSuite: string;
  signatureAlgorithm: string;
  publicKeyBits: number;
  keyStrength: string;
  sha256Fingerprint: string;
  sanList: string[];
  warnings: string[];
}

export interface DomainFindingItem {
  id: string; // e.g., "IND-DNS-01", "IND-TLS-01"
  title: string;
  category: 'DNS' | 'TLS' | 'INFRASTRUCTURE' | string;
  severity: 'info' | 'low' | 'medium' | 'high' | string;
  description: string;
  source: string; // e.g., "DNS Intelligence", "TLS Intelligence"
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface DomainInvestigationResponse {
  id: string; // "TH-DOM-<16_HEX>"
  domain: string;
  normalizedDomain: string;
  unicodeDomain: string;
  isIdn: boolean;
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED' | string;
  dnsIntelligence: DnsIntelligenceData;
  tlsIntelligence: TlsIntelligenceData;
  evidenceList: DomainFindingItem[];
  findingsSummary: Record<string, number>;
  warnings: string[];
  timestamp: string;
}
