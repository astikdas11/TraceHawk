import { DnsRecordItem, TlsAnalysisRecord } from '../types';

export const MOCK_DNS_RECORDS: Record<string, DnsRecordItem[]> = {
  'sbi-kyc-verify-portal.in': [
    { type: 'A', value: '104.21.72.193', ttl: 300, flag: 'Cloudflare Proxy (Origin Masked)' },
    { type: 'A', value: '172.67.182.204', ttl: 300, flag: 'Cloudflare Proxy (Origin Masked)' },
    { type: 'AAAA', value: '2606:4700:3037::6815:48c1', ttl: 300 },
    { type: 'NS', value: 'ns1.digitalocean.com', ttl: 86400 },
    { type: 'NS', value: 'ns2.digitalocean.com', ttl: 86400 },
    { type: 'MX', value: 'mail.sbi-kyc-verify-portal.in (Priority: 10)', ttl: 3600 },
    { type: 'TXT', value: 'v=spf1 -all (Strict Sender Reject)', ttl: 3600 },
  ],
  'onlinesbi.sbi': [
    { type: 'A', value: '121.240.66.195', ttl: 3600, flag: 'AS4758 (Sovereign Banking Subnet)' },
    { type: 'NS', value: 'ns1.sbi.co.in', ttl: 86400 },
    { type: 'NS', value: 'ns2.sbi.co.in', ttl: 86400 },
    { type: 'MX', value: 'relay.onlinesbi.sbi (Priority: 10)', ttl: 3600 },
    { type: 'TXT', value: 'v=spf1 include:_spf.sbi.co.in ~all', ttl: 3600 },
  ],
};

export const MOCK_TLS_RECORDS: Record<string, TlsAnalysisRecord> = {
  'sbi-kyc-verify-portal.in': {
    domain: 'sbi-kyc-verify-portal.in',
    validityStatus: 'ACTIVE',
    issuer: "Let's Encrypt Authority E6",
    issuerOrg: 'Let’s Encrypt',
    validationType: 'DV',
    validFrom: '2026-08-25',
    validTo: '2026-11-23',
    daysRemaining: 14,
    totalDays: 90,
    protocol: 'TLSv1.3',
    cipherSuite: 'TLS_AES_128_GCM_SHA256 (ECDHE-RSA)',
    signatureAlgorithm: 'sha256WithRSAEncryption',
    publicKeyBits: 2048,
    keyStrength: 'ACCEPTABLE',
    hostnameMatch: true,
    sanList: ['sbi-kyc-verify-portal.in'],
    ocspStapled: false,
    sctCount: 2,
    warnings: [
      'Ephemeral validity window: Remaining certificate validity < 30 days (14 days left).',
      'Domain Validation (DV) only: Zero organizational legal identity validation.',
    ],
  },
  'onlinesbi.sbi': {
    domain: 'onlinesbi.sbi',
    validityStatus: 'ACTIVE',
    issuer: 'DigiCert Global Root G2 / NIC Sovereign CA',
    issuerOrg: 'DigiCert Inc & National Informatics Centre',
    validationType: 'EV',
    validFrom: '2026-01-10',
    validTo: '2027-01-10',
    daysRemaining: 312,
    totalDays: 365,
    protocol: 'TLSv1.3',
    cipherSuite: 'TLS_AES_256_GCM_SHA384 (ECDHE-ECDSA)',
    signatureAlgorithm: 'ecdsa-with-SHA384',
    publicKeyBits: 384,
    keyStrength: 'STRONG',
    hostnameMatch: true,
    sanList: ['onlinesbi.sbi', 'www.onlinesbi.sbi', 'm.onlinesbi.sbi'],
    ocspStapled: true,
    sctCount: 3,
    warnings: [],
  },
};

