"""
TRACEHAWK — Domain Intelligence Orchestration Service.
Orchestrates strict domain validation, authentic DNS intelligence collection,
hardened TLS cryptographic auditing, deterministic investigation ID generation,
and responsible evidence synthesis.
"""

import datetime
import hashlib
import logging
from typing import Any

from backend.app.schemas.domain_investigation import (
    DnsIntelligenceData,
    DomainFindingItem,
    DomainInvestigationResponse,
    TlsIntelligenceData,
)
from backend.app.services.dns_service import query_domain_dns_records
from backend.app.services.tls_service import audit_tls_certificate
from backend.app.utils.domain_validator import (
    DomainValidationResult,
    validate_and_normalize_domain,
)

logger = logging.getLogger("tracehawk.services.domain_intelligence")


class DomainInputError(ValueError, TypeError):
    """Exception indicating the user-supplied domain input is invalid."""


def generate_domain_investigation_id(normalized_ascii: str) -> str:
    """
    Generate a deterministic, uppercase, 16-hex investigation ID from the normalized ASCII domain.

    Format: TH-DOM-<16_UPPERCASE_HEX>
    Idempotent across repeated queries for identical normalized domains.
    """
    digest = hashlib.sha256(normalized_ascii.encode("utf-8")).hexdigest()[:16].upper()
    return f"TH-DOM-{digest}"


def determine_investigation_status(dns_status: str, tls_validity_status: str) -> str:
    """
    Determine the overall investigation status strictly according to the canonical decision table.

    Canonical Mapping:
      - DNS SUCCESS + TLS Available      -> COMPLETE
      - DNS SUCCESS + TLS UNAVAILABLE    -> PARTIAL
      - DNS PARTIAL + Any TLS            -> PARTIAL
      - DNS NO_RECORDS + Any TLS         -> PARTIAL
      - DNS DOMAIN_NOT_FOUND + Any TLS   -> PARTIAL
      - DNS FAILED + TLS Available       -> PARTIAL
      - DNS FAILED + TLS UNAVAILABLE     -> FAILED
      - Any Unknown DNS Status           -> PARTIAL (Preserves intelligence; never produces FAILED)
    """
    tls_available = tls_validity_status != "UNAVAILABLE"

    if dns_status == "SUCCESS":
        return "COMPLETE" if tls_available else "PARTIAL"
    elif dns_status in ("PARTIAL", "NO_RECORDS", "DOMAIN_NOT_FOUND"):
        return "PARTIAL"
    elif dns_status == "FAILED":
        return "PARTIAL" if tls_available else "FAILED"
    else:
        # Defensive fallback: unknown or unclassified DNS status must preserve intelligence
        # and must NEVER incorrectly produce FAILED.
        return "PARTIAL"


def synthesize_domain_findings(
    dns_data: dict[str, Any], tls_data: dict[str, Any]
) -> list[DomainFindingItem]:
    """
    Synthesize neutral, structured evidence indicators from observed DNS and TLS metadata.

    Strict Governance Policies:
      - Neutral, non-defamatory phrasing ("Potential Risk", "Anomaly Detected", "Requires Verification").
      - Absence of DNS or TLS is never labeled as proof of malice.
      - Confidence strictly reflects observational reliability (HIGH, MEDIUM, LOW).
    """
    findings: list[DomainFindingItem] = []

    # --- DNS Indicators ---
    has_spf = dns_data.get("hasSpf", False)
    spf_record = dns_data.get("spfRecord") or ""
    dns_collection_status = dns_data.get("collectionStatus", "FAILED")

    if has_spf and spf_record:
        tokens = [t.strip().lower() for t in spf_record.split()]
        all_terms = [t for t in tokens if t in ("-all", "~all", "?all", "+all", "all")]
        all_mechanism = all_terms[-1] if all_terms else None

        if all_mechanism == "-all":
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-01",
                    title="Hardened Email Authentication: SPF Enforced",
                    category="DNS",
                    severity="info",
                    description="The domain publishes a valid SPF record enforcing a hard-fail policy (-all).",
                    source="DNS Intelligence",
                    confidence="HIGH",
                )
            )
        elif all_mechanism == "~all":
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-01",
                    title="Standard Email Authentication: SPF SoftFail",
                    category="DNS",
                    severity="info",
                    description="The domain publishes a standard SPF record with SoftFail policy (~all).",
                    source="DNS Intelligence",
                    confidence="HIGH",
                )
            )
        elif all_mechanism in ("+all", "all"):
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-01",
                    title="Potential Risk: Permissive SPF Record",
                    category="DNS",
                    severity="medium",
                    description="The domain publishes an SPF record with permissive qualification (+all), allowing arbitrary senders.",
                    source="DNS Intelligence",
                    confidence="MEDIUM",
                )
            )
        elif all_mechanism == "?all":
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-01",
                    title="Requires Verification: Neutral SPF Record",
                    category="DNS",
                    severity="low",
                    description="The domain publishes an SPF record with neutral qualification (?all), neither authorizing nor rejecting unlisted senders.",
                    source="DNS Intelligence",
                    confidence="MEDIUM",
                )
            )
        else:
            # Domain publishes an SPF record without an explicit 'all' mechanism
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-01",
                    title="Requires Verification: Missing SPF All Mechanism",
                    category="DNS",
                    severity="low",
                    description="The domain publishes an SPF record without an explicit 'all' mechanism, defaulting to neutral evaluation under RFC 7208.",
                    source="DNS Intelligence",
                    confidence="MEDIUM",
                )
            )
    elif dns_collection_status in ("SUCCESS", "PARTIAL"):
        findings.append(
            DomainFindingItem(
                id="IND-DNS-01",
                title="Potential Risk: Missing SPF Record",
                category="DNS",
                severity="low",
                description="No SPF record was observed in DNS. Note that missing SPF is common on non-email hostnames.",
                source="DNS Intelligence",
                confidence="MEDIUM",
            )
        )

    has_dmarc = dns_data.get("hasDmarc", False)
    dmarc_policy = (dns_data.get("dmarcPolicy") or "").lower().strip()

    if has_dmarc:
        if dmarc_policy in ("reject", "quarantine"):
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-02",
                    title=f"Enforcing DMARC Policy: {dmarc_policy.capitalize()}",
                    category="DNS",
                    severity="info",
                    description=f"The domain enforces a protective DMARC policy of p={dmarc_policy} against domain spoofing.",
                    source="DNS Intelligence",
                    confidence="HIGH",
                )
            )
        elif dmarc_policy == "none":
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-02",
                    title="Requires Verification: Monitoring-Only DMARC Policy",
                    category="DNS",
                    severity="low",
                    description="The domain publishes DMARC in monitoring mode (p=none) without active rejection policy.",
                    source="DNS Intelligence",
                    confidence="MEDIUM",
                )
            )
        else:
            findings.append(
                DomainFindingItem(
                    id="IND-DNS-02",
                    title=f"Requires Verification: Non-Standard DMARC Policy ({dmarc_policy or 'UNKNOWN'})",
                    category="DNS",
                    severity="low",
                    description=f"The domain publishes a DMARC record with an unclassified policy tag (p={dmarc_policy or 'UNKNOWN'}), requiring administrator verification.",
                    source="DNS Intelligence",
                    confidence="LOW",
                )
            )
    elif dns_collection_status in ("SUCCESS", "PARTIAL"):
        findings.append(
            DomainFindingItem(
                id="IND-DNS-02",
                title="Requires Verification: Missing DMARC Policy",
                category="DNS",
                severity="low",
                description="No DMARC policy record (_dmarc) was observed for this domain.",
                source="DNS Intelligence",
                confidence="MEDIUM",
            )
        )

    if dns_collection_status == "DOMAIN_NOT_FOUND":
        findings.append(
            DomainFindingItem(
                id="IND-DNS-03",
                title="Anomaly Detected: Non-Existent Domain (NXDOMAIN)",
                category="DNS",
                severity="medium",
                description="The configured DNS resolver reported that the domain name does not exist (NXDOMAIN).",
                source="DNS Intelligence",
                confidence="HIGH",
            )
        )
    elif dns_collection_status == "NO_RECORDS":
        findings.append(
            DomainFindingItem(
                id="IND-DNS-03",
                title="Observation: No DNS Zone Records Observed",
                category="DNS",
                severity="info",
                description="DNS queries completed with NOERROR, but no resource records of queried types were observed (NODATA).",
                source="DNS Intelligence",
                confidence="HIGH",
            )
        )

    # --- TLS Indicators ---
    tls_validity = tls_data.get("validityStatus", "UNAVAILABLE")
    chain_status = tls_data.get("chainVerificationStatus", "UNAVAILABLE")
    hostname_status = tls_data.get("hostnameVerificationStatus", "UNAVAILABLE")

    if tls_validity == "UNAVAILABLE":
        findings.append(
            DomainFindingItem(
                id="IND-TLS-01",
                title="Observation: Port 443 TLS Unavailable",
                category="TLS",
                severity="low",
                description="TLS certificate could not be retrieved from port 443 (connection refused, timed out, or unresolvable). Missing TLS is common for non-web endpoints and is not evidence of malice.",
                source="TLS Intelligence",
                confidence="LOW",
            )
        )
    else:
        # 1. Primary Lifecycle Expiration Check (Highest precedence among certificate status checks)
        if tls_validity == "EXPIRED":
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-01",
                    title="Anomaly Detected: Expired Certificate",
                    category="TLS",
                    severity="medium",
                    description=f"The TLS certificate expired on {tls_data.get('validTo', 'UNKNOWN')}.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )
        elif (
            chain_status == "SELF_SIGNED"
            or tls_data.get("validationType") == "SELF_SIGNED"
        ):
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-01",
                    title="Anomaly Detected: Self-Signed Certificate",
                    category="TLS",
                    severity="medium",
                    description="The TLS certificate is cryptographically self-signed and does not chain to a trusted Certificate Authority.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )
        elif chain_status in ("UNTRUSTED_ROOT", "UNTRUSTED_CA"):
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-01",
                    title="Requires Verification: Untrusted Certificate Authority",
                    category="TLS",
                    severity="medium",
                    description="The TLS certificate authority chain could not be verified against the trusted root store.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )
        elif chain_status == "VERIFIED":
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-01",
                    title="Cryptographic Assurance: Valid Certificate Chain",
                    category="TLS",
                    severity="info",
                    description=f"The certificate is issued by '{tls_data.get('issuer', 'Trusted CA')}' and verifies to a trusted root.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )

        if hostname_status == "MISMATCH":
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-02",
                    title="Anomaly Detected: Certificate Hostname Mismatch",
                    category="TLS",
                    severity="medium",
                    description="The TLS certificate Subject Alternative Names do not match the investigated domain.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )
        elif hostname_status == "MATCHED":
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-02",
                    title="Hostname Verified: Certificate Matches Target",
                    category="TLS",
                    severity="info",
                    description="The target domain matches the certificate SAN or Common Name per RFC 6125.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )

        days_remaining = tls_data.get("daysRemaining", 0)
        if tls_validity == "ACTIVE" and 0 < days_remaining <= 14:
            findings.append(
                DomainFindingItem(
                    id="IND-TLS-03",
                    title="Investigation Recommended: Certificate Expiring Soon",
                    category="TLS",
                    severity="low",
                    description=f"The TLS certificate has {days_remaining} days of remaining validity.",
                    source="TLS Intelligence",
                    confidence="HIGH",
                )
            )

    return findings


class DomainIntelligenceService:
    """
    Orchestration service coordinating strict domain validation, authentic DNS intelligence,
    hardened TLS cryptographic auditing, deterministic identification, and evidence synthesis.
    """

    def investigate_domain(self, domain: str) -> DomainInvestigationResponse:
        """
        Execute comprehensive domain intelligence investigation.

        Args:
            domain: Target domain string or FQDN submitted by caller.

        Returns:
            DomainInvestigationResponse with complete aggregated intelligence.

        Raises:
            DomainInputError (ValueError, TypeError): If domain fails strict RFC 1035 / 1123 / IDNA2008
                validation, contains URL components (schemes, paths, credentials, ports),
                or represents an IP literal.
        """
        # 1. Strict Domain Validation (Step 2 - Frozen)
        try:
            val_result: DomainValidationResult = validate_and_normalize_domain(domain)
        except (ValueError, TypeError) as val_err:
            raise DomainInputError(str(val_err)) from val_err

        normalized_ascii = val_result.ascii_domain
        canonical_unicode = val_result.unicode_domain

        # 2. Deterministic Investigation ID
        investigation_id = generate_domain_investigation_id(normalized_ascii)

        # 3. DNS Intelligence Collection (Step 3 - Frozen)
        try:
            raw_dns = query_domain_dns_records(normalized_ascii)
        except Exception as dns_exc:  # noqa: BLE001
            logger.error(
                "Unexpected failure during DNS collection for %s: %s",
                normalized_ascii,
                type(dns_exc).__name__,
            )
            raw_dns = {
                "domain": val_result.normalized_domain,
                "asciiDomain": normalized_ascii,
                "isIdn": val_result.is_idn,
                "registrar": "UNAVAILABLE",
                "creationDate": "UNAVAILABLE",
                "ageDays": -1,
                "asn": "UNAVAILABLE",
                "ipAddress": "UNAVAILABLE",
                "dnsRecords": [],
                "collectionStatus": "FAILED",
                "uncollectedFields": ["dnsRecords"],
                "warnings": [
                    "DNS collection encountered an unhandled service failure."
                ],
                "hasSpf": False,
                "spfRecord": None,
                "spf": {},
                "hasDmarc": False,
                "dmarcRecord": None,
                "dmarcPolicy": None,
                "dmarc": {},
                "soa": None,
            }

        # 4. TLS Cryptographic Audit (Step 4 - Frozen)
        try:
            raw_tls = audit_tls_certificate(normalized_ascii)
        except Exception as tls_exc:  # noqa: BLE001
            logger.error(
                "Unexpected failure during TLS audit for %s: %s",
                normalized_ascii,
                type(tls_exc).__name__,
            )
            raw_tls = {
                "domain": val_result.normalized_domain,
                "asciiDomain": normalized_ascii,
                "isIdn": val_result.is_idn,
                "validityStatus": "UNAVAILABLE",
                "chainVerificationStatus": "UNAVAILABLE",
                "hostnameVerificationStatus": "UNAVAILABLE",
                "subject": "UNAVAILABLE",
                "issuer": "UNAVAILABLE",
                "validationType": "UNAVAILABLE",
                "validFrom": "UNAVAILABLE",
                "validTo": "UNAVAILABLE",
                "daysRemaining": 0,
                "totalDays": 0,
                "protocol": "NONE",
                "cipherSuite": "NONE",
                "signatureAlgorithm": "UNKNOWN",
                "publicKeyBits": 0,
                "keyStrength": "UNAVAILABLE",
                "sha256Fingerprint": "UNAVAILABLE",
                "sanList": [],
                "warnings": ["TLS audit encountered an unhandled connection failure."],
            }

        # 5. Schema Validation & Intelligence Preservation
        dns_model = DnsIntelligenceData(**raw_dns)
        tls_model = TlsIntelligenceData(**raw_tls)

        # 6. Overall Status Determination (Canonical Decision Table)
        status = determine_investigation_status(
            dns_status=dns_model.collectionStatus,
            tls_validity_status=tls_model.validityStatus,
        )

        # 7. Evidence Synthesis (Calibrated Neutral Indicators)
        evidence_list = synthesize_domain_findings(dns_data=raw_dns, tls_data=raw_tls)

        # 8. Findings Summary by Severity
        findings_summary: dict[str, int] = {
            "info": 0,
            "low": 0,
            "medium": 0,
            "high": 0,
        }
        for finding in evidence_list:
            if finding.severity in findings_summary:
                findings_summary[finding.severity] += 1

        # 9. Sanitized Warnings Aggregation
        combined_warnings: list[str] = []
        for w in dns_model.warnings + tls_model.warnings:
            if w not in combined_warnings:
                combined_warnings.append(w)

        timestamp_str = (
            datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z")
        )

        return DomainInvestigationResponse(
            id=investigation_id,
            domain=domain,
            normalizedDomain=normalized_ascii,
            unicodeDomain=canonical_unicode,
            isIdn=val_result.is_idn,
            status=status,
            dnsIntelligence=dns_model,
            tlsIntelligence=tls_model,
            evidenceList=evidence_list,
            findingsSummary=findings_summary,
            warnings=combined_warnings,
            timestamp=timestamp_str,
        )


_service_instance: DomainIntelligenceService | None = None


def get_domain_intelligence_service() -> DomainIntelligenceService:
    """Return singleton instance of DomainIntelligenceService."""
    global _service_instance
    if _service_instance is None:
        _service_instance = DomainIntelligenceService()
    return _service_instance
