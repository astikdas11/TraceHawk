"""
TRACEHAWK — Enterprise Domain Validation & Normalization Utility (Phase 4.3).

Performs strict, RFC 1035 / RFC 1123 / RFC 5890 / RFC 5891-compliant domain and FQDN validation:
1. Rejects non-string, empty, whitespace-abusing inputs and control characters.
2. Strips leading and trailing whitespace; rejects unencoded whitespace inside domain.
3. Handles Unicode dot separators (U+3002, U+FF0E, U+FF61) consistently with standard dots (U+002E).
4. Handles trailing root dots consistently (single trailing dot stripped, multiple trailing dots rejected).
5. Explicitly detects and rejects IPv4 and IPv6 literals (bare, bracketed, or with zone identifiers)
   under the documented domain investigation policy.
6. Rejects malformed IPv6 brackets (unclosed, unopened, or misplaced).
7. Rejects embedded URL credentials, schemes, ports, paths, queries, and fragments.
8. Enforces domain length bounds (<= 253 characters) and label length bounds (1-63 characters).
9. Rejects invalid label formats (leading/trailing hyphens, consecutive dots, invalid characters).
10. Validates Internationalized Domain Names (IDN) and Punycode under strict IDNA2008
    (RFC 5890, RFC 5891, RFC 5892, RFC 5893) with full contextual (ContextJ/ContextO) and bidi rules.
11. Provides a strongly-typed, frozen dataclass result contract (DomainValidationResult).
"""

import ipaddress
import re
from dataclasses import dataclass
from typing import Any

import idna

# Unicode label separators per Unicode Standard UTS #46 section 4.1
UNICODE_DOT_PATTERN = re.compile(r"[\u3002\uff0e\uff61]")


@dataclass(frozen=True, slots=True)
class DomainValidationResult:
    """
    Explicit, strongly-typed domain validation result contract.
    Avoids ambiguous tuple booleans.
    """
    is_valid: bool
    normalized_domain: str        # Lowercase FQDN without trailing dot (e.g. "example.com" or "faß.de")
    ascii_domain: str             # Strict IDNA2008 ASCII/Punycode format for DNS wire queries and TLS SNI (e.g. "xn--fa-hia.de")
    unicode_domain: str           # Canonical Unicode display representation for analyst presentation (e.g. "faß.de")
    is_idn: bool                  # True if domain contains internationalized characters or punycode labels
    is_ip_literal: bool           # True if input was detected as an IPv4 or IPv6 literal
    error_message: str | None = None


def is_ip_literal(candidate: str) -> bool:
    """
    Detect whether candidate string represents a valid IPv4 or IPv6 literal.
    Handles bare IPv4, bare IPv6, bracketed IPv6 ([2001:db8::1]), and
    scoped IPv6 addresses with zone identifiers (fe80::1%eth0, [fe80::1%1]).
    Validates zone identifiers per RFC 4007 / RFC 6874.
    """
    clean = candidate.strip()
    if clean.startswith("[") and clean.endswith("]"):
        clean = clean[1:-1]
    # Remove and validate zone identifier if present (RFC 6874 / RFC 4007)
    if "%" in clean:
        parts = clean.split("%", 1)
        clean = parts[0]
        zone = parts[1]
        if not zone or not re.match(r"^[a-zA-Z0-9._-]+$", zone):
            return False
    try:
        ipaddress.ip_address(clean)
        return True
    except ValueError:
        return False


def validate_domain(raw_domain: Any) -> DomainValidationResult:
    """
    Safely validate and normalize a domain name or FQDN under strict IDNA2008 rules.
    Returns a typed DomainValidationResult without raising exceptions.
    """
    # 1. Type validation
    if not isinstance(raw_domain, str):
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"Expected string for domain input, got {type(raw_domain).__name__}.",
        )

    # 2. Leading/trailing whitespace policy: stripped
    domain = raw_domain.strip()
    if not domain:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input cannot be empty or whitespace only.",
        )

    # 3. Reject null bytes and control characters (ASCII 0-31 and 127)
    if any(ord(c) < 32 or ord(c) == 127 for c in domain) or "\x00" in domain:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input contains invalid control characters or null bytes.",
        )

    # 4. Reject unencoded whitespace anywhere inside domain
    if any(c.isspace() for c in domain):
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input contains unencoded whitespace characters.",
        )

    # 5. Handle bracketed IPv6 and malformed IPv6 brackets
    if "[" in domain or "]" in domain:
        if domain.startswith("[") and domain.endswith("]") and domain.count("[") == 1 and domain.count("]") == 1:
            inner = domain[1:-1]
            if "%" in inner:
                ip_part, zone_part = inner.split("%", 1)
                if not zone_part or not re.match(r"^[a-zA-Z0-9._-]+$", zone_part):
                    return DomainValidationResult(
                        is_valid=False,
                        normalized_domain="",
                        ascii_domain="",
                        unicode_domain="",
                        is_idn=False,
                        is_ip_literal=False,
                        error_message=f"Domain input contains malformed bracketed address: '{domain}'.",
                    )
                inner = ip_part
            try:
                ipaddress.ip_address(inner)
                return DomainValidationResult(
                    is_valid=False,
                    normalized_domain="",
                    ascii_domain="",
                    unicode_domain="",
                    is_idn=False,
                    is_ip_literal=True,
                    error_message=(
                        f"Input '{domain}' is an IP literal address. The domain investigation engine requires a fully qualified "
                        "domain name (FQDN). For IP-based infrastructure analysis, use the dedicated IP or URL investigation endpoint."
                    ),
                )
            except ValueError:
                return DomainValidationResult(
                    is_valid=False,
                    normalized_domain="",
                    ascii_domain="",
                    unicode_domain="",
                    is_idn=False,
                    is_ip_literal=False,
                    error_message=f"Domain input contains malformed bracketed address: '{domain}'.",
                )
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"Domain input contains malformed or misplaced IPv6 bracket delimiters: '{domain}'.",
        )

    # 6. Explicit bare IP Literal (and zone identifier) Policy Rejection
    if is_ip_literal(domain):
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=True,
            error_message=(
                f"Input '{domain}' is an IP literal address. The domain investigation engine requires a fully qualified "
                "domain name (FQDN). For IP-based infrastructure analysis, use the dedicated IP or URL investigation endpoint."
            ),
        )

    # 7. Reject embedded credentials ('@')
    if "@" in domain:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input contains embedded credentials or '@' delimiter. Embedded credentials are not permitted in domain names.",
        )

    # 8. Reject URL scheme prefixes (e.g. 'http://', 'https://', 'ftp://')
    if "://" in domain:
        scheme_prefix = domain.split("://", 1)[0]
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"Domain input contains URL scheme '{scheme_prefix}://'. Domain investigation requires a domain name or FQDN, not a full URL.",
        )

    # 9. Reject URL paths, query parameters, and fragments
    for delim in ("/", "?", "#"):
        if delim in domain:
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message=f"Domain input contains URL delimiter '{delim}'. Please provide only a domain name or FQDN.",
            )

    # 10. Reject port specifications (e.g. 'example.com:443')
    if ":" in domain:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input contains a port specification. Domain investigation operates on hostnames; port specifications are not permitted.",
        )

    # 11. Normalize Unicode dot separators (U+3002, U+FF0E, U+FF61) to standard dot (U+002E)
    # Ensures label boundaries are identical in Unicode and ASCII representations
    domain = UNICODE_DOT_PATTERN.sub(".", domain)

    # 12. Trailing root dot handling and consecutive dots
    raw_trailing = domain.endswith(".")
    stripped = domain.rstrip(".")
    if not stripped:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input cannot consist solely of root dot delimiters.",
        )

    if raw_trailing and domain.endswith(".."):
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input contains multiple consecutive trailing dots.",
        )

    if ".." in stripped:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain input contains consecutive dots or empty labels.",
        )

    # 13. Case normalization & total length bound (RFC 1035 / RFC 1123: maximum 253 characters)
    norm_candidate = stripped.lower()
    if len(norm_candidate) > 253:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"Domain length ({len(norm_candidate)}) exceeds the maximum permitted length of 253 characters.",
        )

    # 14. Label parsing & preliminary checks
    raw_labels = norm_candidate.split(".")
    if len(raw_labels) < 2:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Domain must be a fully qualified domain name (FQDN) containing at least a domain name and a valid TLD.",
        )

    for label in raw_labels:
        if not label:
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message="Domain label cannot be empty.",
            )
        if len(label) > 63:
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message=f"Domain label '{label[:16]}...' ({len(label)} chars) exceeds the maximum length of 63 characters.",
            )
        # RFC 1035 / 1123: labels cannot begin or end with a hyphen
        if label.startswith("-") or label.endswith("-"):
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message=f"Domain label '{label}' cannot begin or end with a hyphen.",
            )

    # 15. Strict IDNA2008 contextual and bidirectional validation via `idna` package
    try:
        # uts46=True, transitional=False enforces strict IDNA2008 mapping
        # E.g. 'faß.de' -> 'xn--fa-hia.de' (NOT 'fass.de')
        ascii_bytes = idna.encode(norm_candidate, uts46=True, transitional=False)
        ascii_domain = ascii_bytes.decode("ascii")
        # Validate that ASCII representation can be decoded back to Unicode cleanly
        unicode_domain = idna.decode(ascii_domain)
    except (idna.IDNAError, UnicodeError, ValueError) as err:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"IDNA2008 validation error for domain '{norm_candidate}': {err}",
        )

    # Ensure label boundaries are identical in Unicode and ASCII representations
    if len(ascii_domain.split(".")) != len(unicode_domain.split(".")):
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message="Label boundary mismatch between ASCII and Unicode representations.",
        )

    # 16. Verify individual ASCII labels after IDNA2008 encoding
    ascii_labels = ascii_domain.split(".")
    for a_label in ascii_labels:
        if len(a_label) > 63:
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message=f"Encoded domain label '{a_label[:16]}...' exceeds 63 characters.",
            )
        if a_label.startswith("-") or a_label.endswith("-"):
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message=f"Encoded domain label '{a_label}' cannot begin or end with a hyphen.",
            )
        if not re.match(r"^[a-z0-9-]+$", a_label):
            return DomainValidationResult(
                is_valid=False,
                normalized_domain="",
                ascii_domain="",
                unicode_domain="",
                is_idn=False,
                is_ip_literal=False,
                error_message=f"Encoded domain label '{a_label}' contains invalid characters.",
            )

    # 17. Total ASCII wire length limit (RFC 1035: <= 253 characters)
    if len(ascii_domain) > 253:
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"Domain length ({len(ascii_domain)}) exceeds the maximum permitted length of 253 characters.",
        )

    # 18. TLD cannot be all-numeric (RFC 1123 / ICANN TLD rules)
    tld_label = ascii_labels[-1]
    if tld_label.isdigit():
        return DomainValidationResult(
            is_valid=False,
            normalized_domain="",
            ascii_domain="",
            unicode_domain="",
            is_idn=False,
            is_ip_literal=False,
            error_message=f"Top-level domain '{tld_label}' cannot be all-numeric.",
        )

    is_idn_detected = any(l.startswith("xn--") for l in ascii_labels) or norm_candidate != ascii_domain

    return DomainValidationResult(
        is_valid=True,
        normalized_domain=norm_candidate,
        ascii_domain=ascii_domain,
        unicode_domain=unicode_domain,
        is_idn=is_idn_detected,
        is_ip_literal=False,
        error_message=None,
    )


def validate_and_normalize_domain(raw_domain: Any) -> DomainValidationResult:
    """
    Validate and normalize a domain name or FQDN under strict IDNA2008 rules.
    Raises ValueError (or TypeError) with sanitized message if invalid.
    Returns typed DomainValidationResult upon successful validation.
    """
    result = validate_domain(raw_domain)
    if not result.is_valid:
        if not isinstance(raw_domain, str):
            raise TypeError(result.error_message)
        raise ValueError(result.error_message)
    return result
