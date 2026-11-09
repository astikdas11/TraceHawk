"""
TRACEHAWK — Domain Investigation Schemas.
Pydantic v2 data contracts for domain intelligence orchestration.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DomainInvestigationRequest(BaseModel):
    """Request payload for domain intelligence investigation."""

    domain: str = Field(..., description="Target domain name or FQDN to investigate.")


class DnsRecordModel(BaseModel):
    """Individual DNS zone record."""

    type: str
    value: str
    ttl: int
    flag: str | None = None


class DnsIntelligenceData(BaseModel):
    """Aggregated DNS intelligence sub-payload (preserves 100% of frozen dns_service.py fields)."""

    model_config = ConfigDict(extra="forbid")

    domain: str
    asciiDomain: str
    isIdn: bool
    registrar: str
    creationDate: str
    ageDays: int
    asn: str
    ipAddress: str
    dnsRecords: list[DnsRecordModel] = Field(default_factory=list)
    collectionStatus: str
    uncollectedFields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    hasSpf: bool = False
    spfRecord: str | None = None
    spf: dict[str, Any] = Field(default_factory=dict)
    hasDmarc: bool = False
    dmarcRecord: str | None = None
    dmarcPolicy: str | None = None
    dmarc: dict[str, Any] = Field(default_factory=dict)
    soa: dict[str, Any] | None = None


class TlsIntelligenceData(BaseModel):
    """Aggregated TLS cryptographic audit sub-payload (preserves 100% of frozen tls_service.py fields)."""

    model_config = ConfigDict(extra="forbid")

    domain: str
    asciiDomain: str
    isIdn: bool
    validityStatus: str
    chainVerificationStatus: str
    hostnameVerificationStatus: str
    subject: str
    issuer: str
    validationType: str
    validFrom: str
    validTo: str
    daysRemaining: int
    totalDays: int
    protocol: str
    cipherSuite: str
    signatureAlgorithm: str
    publicKeyBits: int
    keyStrength: str
    sha256Fingerprint: str = Field(..., description="SHA-256 certificate fingerprint")
    sanList: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class DomainFindingItem(BaseModel):
    """Structured security indicator synthesized from DNS and TLS observations."""

    id: str = Field(..., description="Indicator ID (e.g. IND-DNS-01, IND-TLS-01)")
    title: str = Field(
        ..., description="Neutral finding title (e.g. Potential Risk: Missing SPF)"
    )
    category: str = Field(
        ..., description="Indicator category: DNS, TLS, or INFRASTRUCTURE"
    )
    severity: str = Field(
        ..., description="Calibrated severity: info, low, medium, high"
    )
    description: str = Field(..., description="Detailed technical finding description")
    source: str = Field(
        ..., description="Data source: DNS Intelligence or TLS Intelligence"
    )
    confidence: str = Field(..., description="Confidence level: HIGH, MEDIUM, LOW")


class DomainInvestigationResponse(BaseModel):
    """Unified response contract for domain intelligence investigation."""

    id: str = Field(..., description="Deterministic investigation ID: TH-DOM-<16_HEX>")
    domain: str = Field(..., description="Original input domain as submitted")
    normalizedDomain: str = Field(..., description="Canonical ASCII Punycode FQDN")
    unicodeDomain: str = Field(..., description="Unicode representation for IDNs")
    isIdn: bool = Field(..., description="Whether the domain is internationalized")
    status: str = Field(..., description="Overall status: COMPLETE, PARTIAL, or FAILED")
    dnsIntelligence: DnsIntelligenceData
    tlsIntelligence: TlsIntelligenceData
    evidenceList: list[DomainFindingItem] = Field(default_factory=list)
    findingsSummary: dict[str, int] = Field(
        default_factory=dict, description="Counts by severity: info, low, medium, high"
    )
    warnings: list[str] = Field(default_factory=list)
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")
