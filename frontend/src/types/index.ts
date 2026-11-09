export type RiskLevel = 
  | 'LOW_RISK'
  | 'SUSPICIOUS'
  | 'HIGH_RISK'
  | 'CRITICAL_RISK'
  | 'CONFIRMED_MALICIOUS'
  | 'INCONCLUSIVE';

export type InvestigationType = 'URL' | 'MESSAGE' | 'DOMAIN' | 'TLS' | 'THREAT_FEED';

export interface ThreatEvidence {
  id: string;
  title: string;
  category: string;
  severity: 'low' | 'suspicious' | 'high_risk' | 'confirmed_malicious';
  evidence: string;
  source: string;
  confidence: string;
  recommendedAction?: string;
}

export interface InvestigationRecord {
  id: string;
  target: string;
  type: InvestigationType;
  riskLevel: RiskLevel;
  riskScore: number;
  category: string;
  timestamp: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FLAGGED';
  evidenceSummary: string;
  indicators: ThreatEvidence[];
  targetDomain?: string;
  modelScore?: number;
  threatIntelMatches?: string[];
}

export interface TlsAnalysisRecord {
  domain: string;
  validityStatus: 'ACTIVE' | 'EXPIRED' | 'HOSTNAME_MISMATCH' | 'UNTRUSTED_CA' | 'INCONCLUSIVE';
  issuer: string;
  issuerOrg: string;
  validationType: 'EV' | 'OV' | 'DV' | 'SELF_SIGNED';
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  totalDays: number;
  protocol: string;
  cipherSuite: string;
  signatureAlgorithm: string;
  publicKeyBits: number;
  keyStrength: 'STRONG' | 'ACCEPTABLE' | 'WEAK_DEPRECATED';
  hostnameMatch: boolean;
  sanList: string[];
  ocspStapled: boolean;
  sctCount: number;
  warnings: string[];
}

export interface DnsRecordItem {
  type: 'A' | 'AAAA' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'CNAME';
  value: string;
  ttl: number;
  flag?: string;
}

export interface DomainIntelligenceRecord {
  domain: string;
  registrar: string;
  creationDate: string;
  expiryDate: string;
  ageDays: number;
  asn: string;
  country: string;
  ipAddress: string;
  dnsRecords: DnsRecordItem[];
  reputationScore: number;
  riskLevel: RiskLevel;
  associatedThreats: string[];
}

export interface ThreatFeedSource {
  id: string;
  name: string;
  provider: string;
  category: string;
  status: 'OPERATIONAL' | 'STANDBY' | 'DEGRADED';
  indicatorsTracked: number;
  lastSync: string;
  reliability: string;
  description: string;
}

