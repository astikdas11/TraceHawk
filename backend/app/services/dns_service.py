"""
TRACEHAWK — DNS & Network Intelligence Service.

Performs authentic DNS zone collection (A, AAAA, MX, NS, TXT, CNAME, SOA) with strict
domain validation (IDNA2008), bounded execution, SPF/DMARC detection, complete SOA parsing,
and resilient error handling.

Guarantees:
- Integrates backend.app.utils.domain_validator for strict RFC 1035 / RFC 1123 / RFC 5890 validation.
- Queries wire Punycode for IDN domains while preserving canonical Unicode domain representation.
- Rejects full URLs, schemes, paths, credentials, ports, IP literals, and malformed inputs.
- Validates timeout arguments: rejects booleans, non-numerics, non-positives, NaN/Inf, and bounds excessive values.
- Encapsulates resolver initialization in controlled exception handling without leaking internal details.
- Handles unexpected per-query exceptions while preserving previously collected records.
- Inspects TXT records for SPF policy (v=spf1) without malicious bias for absence.
- Performs targeted query for DMARC policy (_dmarc.<domain>) extracting policy tags (none, quarantine, reject).
- Parses complete SOA records (mname, rname, serial, refresh, retry, expire, minimum, ttl).
- Deduplicates DNS records and IP addresses while maintaining stable insertion ordering.
- Clearly distinguishes DOMAIN_NOT_FOUND, SUCCESS, NO_RECORDS, PARTIAL, and FAILED statuses.
- Sanitizes all log and warning messages to prevent leaking internal socket, resolver, or exception traces.
- Enforces bounded execution time with per-query and total collection limits.
- Never fabricates registrar, creation date, or ASN metadata.
"""

import logging
import math
import re
import time
from dataclasses import asdict, dataclass
from typing import Any

import dns.exception
import dns.resolver

from backend.app.utils.domain_validator import validate_and_normalize_domain

logger = logging.getLogger("tracehawk.services.dns")

DEFAULT_DNS_TIMEOUT: float = 3.0
DEFAULT_TOTAL_TIMEOUT: float = 10.0
MAX_DNS_TIMEOUT: float = 30.0
MAX_TOTAL_TIMEOUT: float = 60.0

SUPPORTED_RECORD_TYPES: tuple[str, ...] = ("A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA")

SPF_PATTERN = re.compile(r"^v=spf1(?:\s|$)", re.IGNORECASE)
DMARC_POLICY_PATTERN = re.compile(r"(?:^|;\s*)p=([a-zA-Z]+)", re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class SoaRecordInfo:
    """Complete SOA record attributes."""
    mname: str
    rname: str
    serial: int
    refresh: int
    retry: int
    expire: int
    minimum: int
    ttl: int


def _validate_timeout(val: Any, param_name: str, max_val: float) -> float:
    """
    Validate timeout parameters:
    1. Rejects boolean values explicitly (guarding against Python's isinstance(True, int)).
    2. Rejects non-numeric types.
    3. Rejects NaN and Infinity for floats (safe since val is already verified as float).
    4. Rejects non-positive values (<= 0).
    5. Enforces hard upper bound without float conversion to safely prevent OverflowError on huge integers.
    """
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        raise ValueError(f"{param_name} must be a positive finite number, got {val!r}.")  # noqa: TRY004
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        raise ValueError(f"{param_name} must be a positive finite number, got {val!r}.")
    if val <= 0:
        raise ValueError(f"{param_name} must be a positive finite number, got {val!r}.")
    if val > max_val:
        raise ValueError(f"{param_name} ({val}s) exceeds maximum permitted limit of {max_val}s.")
    return float(val)


def _sanitize_dns_error(rtype: str, exc: Exception) -> str:
    """
    Produce clean, sanitized warning messages without exposing internal socket details,
    local resolver IPs, or raw python stack traces.
    """
    if isinstance(exc, dns.resolver.Timeout):
        return f"DNS query for '{rtype}' records timed out."
    if isinstance(exc, dns.resolver.NoNameservers):
        err_str = str(exc).lower()
        if "servfail" in err_str:
            return f"DNS query for '{rtype}' records failed: name server failure (SERVFAIL)."
        if "refused" in err_str:
            return f"DNS query for '{rtype}' records failed: query refused by server (REFUSED)."
        return f"DNS query for '{rtype}' records failed: no responding name servers."
    if isinstance(exc, dns.exception.DNSException):
        return f"DNS query for '{rtype}' records encountered a resolution error."
    return f"DNS query for '{rtype}' records encountered an unexpected internal error."


def query_domain_dns_records(
    domain: str,
    timeout: float = DEFAULT_DNS_TIMEOUT,
    max_total_timeout: float = DEFAULT_TOTAL_TIMEOUT,
) -> dict[str, Any]:
    """
    Perform authentic DNS record resolution for a target domain.

    Args:
        domain: Hostname or FQDN to query (strict domain validation applied).
        timeout: Per-query timeout in seconds (bounded by MAX_DNS_TIMEOUT).
        max_total_timeout: Maximum overall collection timeout in seconds (bounded by MAX_TOTAL_TIMEOUT).

    Returns:
        dict[str, Any]: Structured domain intelligence with real DNS records,
                        SPF / DMARC analysis, SOA fields, explicit collectionStatus,
                        and disclosure of uncollected fields.

    Raises:
        TypeError: If domain is not a string.
        ValueError: If domain is empty, a full URL, contains paths/ports/credentials/IP literals,
                    or timeout parameters are invalid (e.g. booleans, non-positives, NaN, excessively large).
    """
    # 1. Timeout parameter validation (strict numeric, non-boolean, bounded, safe from integer overflow)
    valid_timeout = _validate_timeout(timeout, "DNS timeout", MAX_DNS_TIMEOUT)
    valid_max_total_timeout = _validate_timeout(max_total_timeout, "Total DNS timeout", MAX_TOTAL_TIMEOUT)

    # 2. Strict IDNA2008 domain validation via central domain validator
    val_result = validate_and_normalize_domain(domain)
    clean_display_domain = val_result.normalized_domain
    clean_ascii_domain = val_result.ascii_domain

    uncollected_fields = ["registrar", "creationDate", "ageDays", "asn"]
    warnings: list[str] = []
    records: list[dict[str, Any]] = []
    seen_record_keys: set[tuple[str, str]] = set()
    ip_addresses: list[str] = []
    soa_record_info: SoaRecordInfo | None = None

    # 3. Controlled resolver initialization
    try:
        resolver = dns.resolver.Resolver(configure=True)
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to initialize DNS resolver: %s", type(exc).__name__)
        return {
            "domain": clean_display_domain,
            "asciiDomain": clean_ascii_domain,
            "isIdn": val_result.is_idn,
            "registrar": "UNAVAILABLE (WHOIS collection disabled)",
            "creationDate": "UNAVAILABLE",
            "ageDays": -1,
            "asn": "UNAVAILABLE (ASN lookup not performed)",
            "ipAddress": "UNAVAILABLE",
            "dnsRecords": [],
            "collectionStatus": "FAILED",
            "uncollectedFields": uncollected_fields + ["ipAddress"] + [f"dns_{r}" for r in SUPPORTED_RECORD_TYPES] + ["dns_DMARC"],
            "warnings": ["DNS resolver initialization failed: system resolver configuration error."],
            "hasSpf": False,
            "spfRecord": None,
            "spf": {
                "present": False,
                "raw": None,
                "records": [],
            },
            "hasDmarc": False,
            "dmarcRecord": None,
            "dmarcPolicy": None,
            "dmarc": {
                "present": False,
                "raw": None,
                "policy": None,
                "status": "NOT_CONFIGURED",
                "records": [],
            },
            "soa": None,
        }

    start_time = time.monotonic()
    deadline = start_time + valid_max_total_timeout

    is_nxdomain = False
    has_query_error = False

    # 4. Query standard record types with per-query exception isolation
    for idx, rtype in enumerate(SUPPORTED_RECORD_TYPES):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            logger.warning("DNS collection deadline exceeded for domain %s.", clean_ascii_domain)
            warnings.append("DNS collection deadline exceeded; remaining record queries were skipped.")
            has_query_error = True
            for uncompleted in SUPPORTED_RECORD_TYPES[idx:]:
                uncollected_fields.append(f"dns_{uncompleted}")
            break

        current_timeout = max(0.1, min(valid_timeout, remaining))
        resolver.timeout = current_timeout
        resolver.lifetime = current_timeout

        try:
            answers = resolver.resolve(clean_ascii_domain, rtype)
            for rdata in answers:
                ttl = getattr(answers.rrset, "ttl", 300)
                val: str | None = None

                if rtype in {"A", "AAAA"}:
                    val = rdata.address
                    ip_addresses.append(val)
                elif rtype == "MX":
                    exchange = rdata.exchange.to_text().rstrip(".")
                    val = f"{rdata.preference} {exchange}"
                elif rtype in {"NS", "CNAME"}:
                    val = rdata.target.to_text().rstrip(".")
                elif rtype == "TXT":
                    val = b"".join(rdata.strings).decode("utf-8", errors="replace")
                elif rtype == "SOA":
                    mname = rdata.mname.to_text().rstrip(".")
                    rname = rdata.rname.to_text().rstrip(".")
                    val = f"{mname} {rname}"
                    if soa_record_info is None:
                        soa_record_info = SoaRecordInfo(
                            mname=mname,
                            rname=rname,
                            serial=int(getattr(rdata, "serial", 0)),
                            refresh=int(getattr(rdata, "refresh", 0)),
                            retry=int(getattr(rdata, "retry", 0)),
                            expire=int(getattr(rdata, "expire", 0)),
                            minimum=int(getattr(rdata, "minimum", 0)),
                            ttl=ttl,
                        )

                if val is not None:
                    record_key = (rtype, val)
                    if record_key not in seen_record_keys:
                        seen_record_keys.add(record_key)
                        records.append({"type": rtype, "value": val, "ttl": ttl})

        except dns.resolver.NXDOMAIN:
            logger.warning("DNS lookup failed: domain %s does not exist (NXDOMAIN).", clean_ascii_domain)
            is_nxdomain = True
            warnings.append(f"Domain '{clean_display_domain}' does not exist in DNS (NXDOMAIN).")
            for r in SUPPORTED_RECORD_TYPES:
                if f"dns_{r}" not in uncollected_fields:
                    uncollected_fields.append(f"dns_{r}")
            break
        except dns.resolver.NoAnswer:
            # Normal: domain exists but has no records for this specific rtype
            continue
        except dns.resolver.Timeout as err:
            has_query_error = True
            logger.warning("DNS query timed out for domain %s type %s after %ss.", clean_ascii_domain, rtype, current_timeout)
            warnings.append(_sanitize_dns_error(rtype, err))
            uncollected_fields.append(f"dns_{rtype}")
        except (dns.resolver.NoNameservers, dns.exception.DNSException) as err:
            has_query_error = True
            logger.warning("DNS resolution error for domain %s type %s: %s", clean_ascii_domain, rtype, type(err).__name__)
            warnings.append(_sanitize_dns_error(rtype, err))
            uncollected_fields.append(f"dns_{rtype}")
        except Exception as exc:  # noqa: BLE001
            # Handle unexpected per-query exception while preserving previously collected records
            has_query_error = True
            logger.warning("Unexpected per-query error for domain %s type %s: %s", clean_ascii_domain, rtype, type(exc).__name__)
            warnings.append(_sanitize_dns_error(rtype, exc))
            uncollected_fields.append(f"dns_{rtype}")

    # 5. SPF detection from discovered TXT records
    spf_records: list[str] = []
    for rec in records:
        if rec["type"] == "TXT":
            val = rec["value"].strip()
            if SPF_PATTERN.match(val) and val not in spf_records:
                spf_records.append(val)

    has_spf = len(spf_records) > 0
    spf_record = spf_records[0] if has_spf else None

    # 6. DMARC detection (_dmarc.<domain>)
    dmarc_records: list[str] = []
    dmarc_policy: str | None = None
    has_dmarc = False
    dmarc_record: str | None = None
    dmarc_status = "NOT_CONFIGURED"

    if not is_nxdomain:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            warnings.append("DNS collection deadline exceeded; DMARC policy query skipped.")
            has_query_error = True
            uncollected_fields.append("dns_DMARC")
        else:
            dmarc_timeout = max(0.1, min(valid_timeout, remaining))
            resolver.timeout = dmarc_timeout
            resolver.lifetime = dmarc_timeout
            dmarc_query_name = f"_dmarc.{clean_ascii_domain}"

            try:
                dmarc_answers = resolver.resolve(dmarc_query_name, "TXT")
                for rdata in dmarc_answers:
                    txt_val = b"".join(rdata.strings).decode("utf-8", errors="replace").strip()
                    if txt_val.lower().startswith("v=dmarc1"):
                        if txt_val not in dmarc_records:
                            dmarc_records.append(txt_val)
                        match = DMARC_POLICY_PATTERN.search(txt_val)
                        if match and dmarc_policy is None:
                            dmarc_policy = match.group(1).lower()

                if dmarc_records:
                    has_dmarc = True
                    dmarc_record = dmarc_records[0]
                    dmarc_status = "CONFIGURED"

            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
                # Missing DMARC record is a standard domain configuration state, not an error
                dmarc_status = "NOT_CONFIGURED"
            except dns.resolver.Timeout as err:
                dmarc_status = "QUERY_TIMEOUT"
                has_query_error = True
                logger.warning("DMARC query timed out for domain %s: %s", clean_ascii_domain, type(err).__name__)
                warnings.append(_sanitize_dns_error("DMARC", err))
                uncollected_fields.append("dns_DMARC")
            except (dns.resolver.NoNameservers, dns.exception.DNSException) as err:
                dmarc_status = "QUERY_FAILED"
                has_query_error = True
                logger.warning("DMARC query failed for domain %s: %s", clean_ascii_domain, type(err).__name__)
                warnings.append(_sanitize_dns_error("DMARC", err))
                uncollected_fields.append("dns_DMARC")
            except Exception as exc:  # noqa: BLE001
                dmarc_status = "QUERY_FAILED"
                has_query_error = True
                logger.warning("Unexpected error during DMARC query for domain %s: %s", clean_ascii_domain, type(exc).__name__)
                warnings.append(_sanitize_dns_error("DMARC", exc))
                uncollected_fields.append("dns_DMARC")

    # 7. Status determination reflecting all successfully collected DNS intelligence
    has_collected_records = bool(records or dmarc_records)
    if is_nxdomain:
        collection_status = "DOMAIN_NOT_FOUND"
    elif has_collected_records:
        if has_query_error:
            collection_status = "PARTIAL"
        else:
            collection_status = "SUCCESS"
    else:
        if has_query_error:
            collection_status = "FAILED"
        else:
            collection_status = "NO_RECORDS"

    # 8. IP Address aggregation & deduplication
    if ip_addresses:
        deduped_ips = list(dict.fromkeys(ip_addresses))
        ip_address_str = " / ".join(deduped_ips)
    else:
        ip_address_str = "UNAVAILABLE"
        if collection_status != "DOMAIN_NOT_FOUND":
            uncollected_fields.append("ipAddress")

    return {
        "domain": clean_display_domain,
        "asciiDomain": clean_ascii_domain,
        "isIdn": val_result.is_idn,
        "registrar": "UNAVAILABLE (WHOIS collection disabled)",
        "creationDate": "UNAVAILABLE",
        "ageDays": -1,
        "asn": "UNAVAILABLE (ASN lookup not performed)",
        "ipAddress": ip_address_str,
        "dnsRecords": records,
        "collectionStatus": collection_status,
        "uncollectedFields": uncollected_fields,
        "warnings": warnings,
        "hasSpf": has_spf,
        "spfRecord": spf_record,
        "spf": {
            "present": has_spf,
            "raw": spf_record,
            "records": spf_records,
        },
        "hasDmarc": has_dmarc,
        "dmarcRecord": dmarc_record,
        "dmarcPolicy": dmarc_policy,
        "dmarc": {
            "present": has_dmarc,
            "raw": dmarc_record,
            "policy": dmarc_policy,
            "status": dmarc_status,
            "records": dmarc_records,
        },
        "soa": asdict(soa_record_info) if soa_record_info else None,
    }
