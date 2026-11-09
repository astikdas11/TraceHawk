"""
TRACEHAWK — Canonical Production URL Feature Extractor for Tier 1 Inference.
Extracts exactly the 19 production features in exact metadata order from a submitted URL.
Zero external network calls required (uses bundled Public Suffix List snapshot).
Performs hardened RFC-compliant URL, authority, hostname, and port validation.
"""

import hashlib
import ipaddress
import math
import re
from typing import Any
from urllib.parse import urlparse

import tldextract

# Initialize offline extractor with bundled PSL snapshot (zero network egress)
_extractor = tldextract.TLDExtract(cache_dir=False, suffix_list_urls=None)

ALLOWED_SCHEMES = frozenset({"http", "https", "ftp", "ftps"})
KNOWN_UNSUPPORTED_SCHEMES = frozenset({
    "javascript",
    "data",
    "file",
    "mailto",
    "blob",
    "vbscript",
    "about",
    "tel",
    "view-source",
    "ws",
    "wss",
    "ssh",
    "sftp",
    "ldap",
    "gopher",
    "tftp",
})

# Authoritative feature list matching models/production/model_metadata.json
CANONICAL_TIER1_FEATURE_NAMES = (
    "URLLength",
    "DomainLength",
    "IsDomainIP",
    "TLD",
    "TLDLength",
    "NoOfSubDomain",
    "HasObfuscation",
    "NoOfObfuscatedChar",
    "ObfuscationRatio",
    "NoOfLettersInURL",
    "LetterRatioInURL",
    "NoOfDegitsInURL",
    "DegitRatioInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
    "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL",
    "SpacialCharRatioInURL",
    "IsHTTPS",
)


def generate_investigation_id(raw_url: str) -> str:
    """
    Generate deterministic, collision-resistant 64-bit uppercase hex investigation identifier.
    Format: TH-INV-<16 uppercase hexadecimal characters>
    Does not mutate or expose the input URL.
    """
    if not isinstance(raw_url, str):
        raise TypeError(f"Expected str for raw_url, got {type(raw_url).__name__}")
    digest = hashlib.sha256(raw_url.encode("utf-8")).hexdigest()[:16].upper()
    return f"TH-INV-{digest}"


def redact_url_credentials(url_str: str) -> str:
    """
    Remove embedded credentials (userinfo) from a URL string to prevent leaking
    sensitive authentication tokens in API responses, presentation views, or logs.
    Preserves scheme, host, port, path, query, and fragment.

    Examples:
      'http://user:pass@example.com/path' -> 'http://example.com/path'
      'https://token@api.bank.com:8443/auth' -> 'https://api.bank.com:8443/auth'
      'user:pass@example.com/path' -> 'example.com/path'
    """
    if not isinstance(url_str, str) or not url_str or "@" not in url_str:
        return url_str

    if "://" in url_str:
        scheme_prefix, remainder = url_str.split("://", 1)
        if "@" in remainder:
            auth_end = len(remainder)
            for delim in ("/", "?", "#"):
                pos = remainder.find(delim)
                if pos != -1 and pos < auth_end:
                    auth_end = pos
            auth_part = remainder[:auth_end]
            path_part = remainder[auth_end:]
            if "@" in auth_part:
                _, host_port = auth_part.rsplit("@", 1)
                return f"{scheme_prefix}://{host_port}{path_part}"
        return url_str
    else:
        auth_end = len(url_str)
        for delim in ("/", "?", "#"):
            pos = url_str.find(delim)
            if pos != -1 and pos < auth_end:
                auth_end = pos
        auth_part = url_str[:auth_end]
        path_part = url_str[auth_end:]
        if "@" in auth_part:
            _, host_port = auth_part.rsplit("@", 1)
            return f"{host_port}{path_part}"
        return url_str


def compute_shannon_entropy(s: str) -> float:
    """Compute Shannon entropy of a string (presentation metric)."""
    if not s:
        return 0.0
    prob = [float(s.count(c)) / len(s) for c in set(s)]
    return round(-sum(p * math.log2(p) for p in prob), 3)


def is_ip_host(host: str) -> int:
    """Return 1 if host is a valid IPv4 or IPv6 address, else 0."""
    clean_host = host.strip("[]").split("%")[0]
    try:
        ipaddress.ip_address(clean_host)
        return 1
    except ValueError:
        return 0


def validate_and_parse_url(raw_url: str) -> tuple[str, str, int]:
    """
    Perform hardened offline validation and parsing of target URL string.
    Validates:
    - Non-string, empty, whitespace-abusing inputs.
    - Control characters and null bytes.
    - Unsupported schemes (permits http, https, ftp, ftps, or schemeless).
    - Authority credentials, malformed ports (1-65535 range, non-numeric, empty).
    - IPv4 addresses, bracketed IPv6 addresses, and unbracketed IPv6 rejection.
    - Hostname length (<= 253), label length (<= 63), hyphen abuse, consecutive dots.
    - IDN and Punycode validity.

    Returns:
        tuple[str, str, int]: (normalized_url, clean_hostname, is_ip_flag)
    """
    if not isinstance(raw_url, str):
        raise TypeError(f"Expected str for raw_url, got {type(raw_url).__name__}")

    url = raw_url.strip()
    if not url:
        raise ValueError("Target URL string cannot be empty or whitespace.")

    # Reject null bytes and control characters (ASCII 0-31 and 127)
    if any(ord(c) < 32 or ord(c) == 127 for c in url) or "\x00" in url:
        raise ValueError("Target URL contains invalid control characters or null bytes.")

    # Reject unencoded whitespace characters anywhere in URL
    if re.search(r"\s", url):
        raise ValueError("Target URL contains unencoded whitespace characters.")

    # Scheme detection and URL normalization
    # Check for unbracketed IPv6 address without scheme (e.g. 2001:db8::1 or 2001:db8::1/path)
    if not url.startswith("[") and "://" not in url and url.count(":") > 1:
        host_candidate = url.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
        try:
            ipaddress.IPv6Address(host_candidate)
            raise ValueError(f"IPv6 address '{host_candidate}' must be bracketed in URL as '[{host_candidate}]'.")
        except ValueError as err:
            if "must be bracketed" in str(err):
                raise

    if ":" in url and not url.startswith("["):
        candidate, rest = url.split(":", 1)
        candidate_lower = candidate.lower()

        if candidate_lower in ALLOWED_SCHEMES:
            if not url.startswith(f"{candidate}://"):
                raise ValueError(f"Malformed URL scheme syntax for '{candidate}://'.")
            parsed_target = url
        elif candidate_lower in KNOWN_UNSUPPORTED_SCHEMES:
            raise ValueError(
                f"Unsupported URL scheme '{candidate_lower}'. Supported schemes: {sorted(ALLOWED_SCHEMES)}."
            )
        elif rest.startswith("//") and re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*$", candidate):
            # Scheme followed by '//' (e.g. ws:// or custom://)
            raise ValueError(
                f"Unsupported URL scheme '{candidate_lower}'. Supported schemes: {sorted(ALLOWED_SCHEMES)}."
            )
        elif (
            re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*$", candidate)
            and "." not in candidate
            and not re.match(r"^\d+(?:[/?#]|$)", rest)
        ):
            # Non-hierarchical scheme (e.g. customscheme:payload)
            raise ValueError(
                f"Unsupported URL scheme '{candidate_lower}'. Supported schemes: {sorted(ALLOWED_SCHEMES)}."
            )
        else:
            # Schemeless URL with host:port (e.g. example.com:8080/login, localhost:8080, example.com:abc)
            parsed_target = "http://" + url
    else:
        # Schemeless URL (e.g. example.com, example.com/login, [2001:db8::1]:8080/login)
        parsed_target = "http://" + url

    parsed = urlparse(parsed_target)
    authority = parsed.netloc
    if not authority:
        raise ValueError(f"Malformed URL: unable to extract valid authority from '{raw_url}'.")

    # Safe credential handling: strip userinfo before host/port parsing
    if "@" in authority:
        _userinfo, host_port = authority.split("@", 1)
        if "@" in host_port:
            raise ValueError("Malformed URL: multiple '@' delimiters in authority section.")
    else:
        host_port = authority

    # Host & Port extraction with strict bounds checking
    if host_port.startswith("["):
        # Bracketed IPv6 format
        if "]" not in host_port:
            raise ValueError(f"Malformed IPv6 URL: unclosed bracket in '{host_port}'.")
        bracket_end = host_port.index("]")
        raw_ip = host_port[1:bracket_end]
        port_part = host_port[bracket_end + 1:]

        try:
            ipaddress.IPv6Address(raw_ip.split("%")[0])
        except ValueError as err:
            raise ValueError(f"Malformed IPv6 address '[{raw_ip}]': {err}") from err

        clean_host = raw_ip.lower()
        is_ip = 1

        if port_part:
            if not port_part.startswith(":"):
                raise ValueError(f"Malformed URL: invalid character after IPv6 bracket: '{port_part}'.")
            raw_port = port_part[1:]
            if not raw_port.isdigit():
                raise ValueError(f"Malformed port in URL: '{raw_port}'. Port must be an integer between 1 and 65535.")
            port_val = int(raw_port)
            if not (1 <= port_val <= 65535):
                raise ValueError(f"Malformed port '{port_val}': out of range [1, 65535].")
    else:
        colons = host_port.count(":")
        if colons == 1:
            raw_host, raw_port = host_port.split(":")
            if not raw_port.isdigit():
                raise ValueError(f"Malformed port in URL: '{raw_port}'. Port must be an integer between 1 and 65535.")
            port_val = int(raw_port)
            if not (1 <= port_val <= 65535):
                raise ValueError(f"Malformed port '{port_val}': out of range [1, 65535].")
            clean_host = raw_host
        elif colons > 1:
            # Unbracketed IPv6 or invalid colon structure
            is_unbracketed_ipv6 = False
            try:
                ipaddress.IPv6Address(host_port)
                is_unbracketed_ipv6 = True
            except ValueError:
                is_unbracketed_ipv6 = False

            if is_unbracketed_ipv6:
                raise ValueError(f"IPv6 address '{host_port}' must be bracketed in URL as '[{host_port}]'.")
            raise ValueError(f"Malformed host authority: invalid colons in '{host_port}'.")
        else:
            clean_host = host_port

        # Validate IPv4 or FQDN hostname
        if re.match(r"^\d+\.\d+\.\d+\.\d+$", clean_host):
            try:
                ipaddress.IPv4Address(clean_host)
                is_ip = 1
            except ValueError as err:
                raise ValueError(f"Malformed IPv4 address '{clean_host}': {err}") from err
        elif any(c.isdigit() for c in clean_host) and clean_host.replace(".", "").isdigit():
            raise ValueError(f"Malformed IP address format in hostname: '{clean_host}'.")
        else:
            is_ip = 0
            host_lower = clean_host.lower().strip(".")
            if not host_lower:
                raise ValueError(f"Malformed URL: empty hostname extracted from '{raw_url}'.")
            if len(host_lower) > 253:
                raise ValueError(f"Hostname exceeds maximum length of 253 characters: {len(host_lower)} chars.")

            labels = host_lower.split(".")
            for label in labels:
                if not label:
                    raise ValueError(f"Malformed hostname '{host_lower}': contains consecutive dots or empty labels.")
                if len(label) > 63:
                    raise ValueError(f"Hostname label exceeds 63 characters: '{label}'.")
                if label.startswith("-") or label.endswith("-"):
                    raise ValueError(f"Hostname label cannot begin or end with a hyphen: '{label}'.")
                try:
                    if label.startswith("xn--"):
                        label.encode("ascii").decode("idna")
                        ascii_label = label
                    else:
                        ascii_label = label.encode("idna").decode("ascii")
                except Exception as err:
                    raise ValueError(f"Invalid domain label or punycode '{label}': {err}") from err
                if not re.match(r"^[a-z0-9-]+$", ascii_label):
                    raise ValueError(f"Hostname label contains invalid characters: '{label}'.")

            clean_host = host_lower

    return url, clean_host, is_ip


def parse_url_safely(raw_url: str) -> dict[str, Any]:
    """
    Safely decompose a target URL into structured components without network egress.
    Performs RFC-compliant validation of scheme, authority, credentials, host, port, path, query, and fragment.

    Returns:
        dict[str, Any]: Dictionary containing decomposed URL components.
    """
    url, clean_host, is_ip = validate_and_parse_url(raw_url)

    raw_stripped = raw_url.strip()
    has_scheme = False
    scheme = ""

    if ":" in raw_stripped and not raw_stripped.startswith("["):
        cand, _ = raw_stripped.split(":", 1)
        if cand.lower() in ALLOWED_SCHEMES and raw_stripped.startswith(f"{cand}://"):
            has_scheme = True
            scheme = cand.lower()
            target_to_parse = raw_stripped
        else:
            target_to_parse = "http://" + raw_stripped
    else:
        target_to_parse = "http://" + raw_stripped

    parsed = urlparse(target_to_parse)
    authority = parsed.netloc

    userinfo = None
    has_credentials = False
    if "@" in authority:
        userinfo, host_port = authority.split("@", 1)
        has_credentials = True
    else:
        host_port = authority

    port = None
    if host_port.startswith("["):
        bracket_end = host_port.index("]")
        port_part = host_port[bracket_end + 1:]
        if port_part.startswith(":"):
            port = int(port_part[1:])
    elif ":" in host_port:
        _, p = host_port.split(":", 1)
        if p.isdigit():
            port = int(p)

    return {
        "raw_url": raw_url,
        "clean_url": url,
        "has_scheme": has_scheme,
        "scheme": scheme,
        "netloc": authority,
        "hostname": clean_host,
        "port": port,
        "path": parsed.path,
        "query": parsed.query,
        "fragment": parsed.fragment,
        "is_ip": is_ip,
        "has_credentials": has_credentials,
        "userinfo": userinfo,
    }


def normalize_url(raw_url: str) -> tuple[str, str, dict[str, Any]]:
    """
    Normalize target URL according to RFC 3986 standards while strictly preserving
    query parameter ordering, key-value casing, and original target semantics.

    Normalization rules:
    1. Strip leading and trailing whitespace.
    2. Lowercase scheme (http, https, ftp, ftps). If schemeless, preserve schemeless structure.
    3. Lowercase hostname and remove trailing dot if present.
    4. Strip default ports (:80 for http, :443 for https, :21 for ftp, :80 for schemeless).
    5. Preserve non-default ports (:8080, :8443, etc.).
    6. Format IPv6 in bracketed lowercase.
    7. Preserve path structure, or set to '/' if authority present with empty path on hierarchical scheme.
    8. Preserve query parameters in exact original order, delimiter count, and casing.
    9. Preserve URL fragment exactly as submitted.

    Returns:
        tuple[str, str, dict[str, Any]]: (original_url, normalized_url, parsed_components)
    """
    comps = parse_url_safely(raw_url)

    scheme = comps["scheme"]
    host = comps["hostname"].lower().rstrip(".")
    port = comps["port"]
    path = comps["path"]
    query = comps["query"]
    fragment = comps["fragment"]
    has_scheme = comps["has_scheme"]

    # Determine if port is default and should be stripped
    is_default_port = False
    if port is not None and (
        (scheme == "http" and port == 80)
        or (scheme == "https" and port == 443)
        or (scheme == "ftp" and port == 21)
        or (scheme == "ftps" and port == 990)
        or (not has_scheme and port == 80)
    ):
        is_default_port = True

    # Reconstruct authority (credentials/userinfo strictly excluded to prevent exposure)
    host_repr = f"[{host}]" if ":" in host and not host.startswith("[") else host
    port_repr = "" if (port is None or is_default_port) else f":{port}"
    authority_repr = f"{host_repr}{port_repr}"

    # Path representation
    path_repr = path
    if (has_scheme and not path_repr) or (not path_repr and "/" in comps["clean_url"]):
        path_repr = "/"

    # Query and fragment
    query_repr = f"?{query}" if query else ""
    frag_repr = f"#{fragment}" if fragment else ""

    if has_scheme:
        normalized = f"{scheme}://{authority_repr}{path_repr}{query_repr}{frag_repr}"
    else:
        normalized = f"{authority_repr}{path_repr}{query_repr}{frag_repr}"

    return redact_url_credentials(raw_url), normalized, comps


def extract_url_only_features(raw_url: str) -> dict[str, Any]:
    """
    Extract the canonical 19 features required for Tier 1 (URL-Only) production inference.
    Zero external network calls required.
    Validates scheme, authority, credentials, ports, IPv4/IPv6, Punycode, and FQDN rules.
    """
    url, hostname, is_domain_ip = validate_and_parse_url(raw_url)

    # 1. URL & Domain Length
    url_len = len(url)
    domain_len = len(hostname)

    # 2. TLD & Subdomain Extraction via offline PSL snapshot
    if is_domain_ip:
        tld = "none"
        tld_len = 0
        subdomain_count = 0
    else:
        ext = _extractor(hostname)
        tld = ext.suffix.lower() if ext.suffix else "none"
        tld_len = len(ext.suffix) if ext.suffix else 0
        subdomains = [s for s in ext.subdomain.split(".") if s] if ext.subdomain else []
        subdomain_count = len(subdomains)

    # 3. Obfuscation (hex / percent encoding)
    hex_obf = re.findall(r"%[0-9a-fA-F]{2}", url)
    has_obfuscation = 1 if hex_obf else 0
    no_obfuscated_char = len(hex_obf) * 3
    obfuscation_ratio = round(no_obfuscated_char / url_len, 4) if url_len > 0 else 0.0

    # 4. Letters & Letter Ratio
    letters = re.findall(r"[a-zA-Z]", url)
    no_letters = len(letters)
    letter_ratio = round(no_letters / url_len, 4) if url_len > 0 else 0.0

    # 5. Digits & Digit Ratio (PhiUSIIL spelling: Degits)
    digits = re.findall(r"[0-9]", url)
    no_digits = len(digits)
    digit_ratio = round(no_digits / url_len, 4) if url_len > 0 else 0.0

    # 6. Delimiters
    no_equals = url.count("=")
    no_qmark = url.count("?")
    no_ampersand = url.count("&")

    # 7. Other Special Characters (excluding alphanumeric and =?&)
    no_other_special = sum(1 for c in url if not c.isalnum() and c not in "=?&")
    total_special = no_equals + no_qmark + no_ampersand + no_other_special
    special_ratio = round(total_special / url_len, 4) if url_len > 0 else 0.0

    # 8. HTTPS indicator
    is_https = 1 if url.lower().startswith("https://") else 0

    # Return exactly the 19 features in the exact metadata order
    return {
        "URLLength": url_len,
        "DomainLength": domain_len,
        "IsDomainIP": is_domain_ip,
        "TLD": tld,
        "TLDLength": tld_len,
        "NoOfSubDomain": subdomain_count,
        "HasObfuscation": has_obfuscation,
        "NoOfObfuscatedChar": no_obfuscated_char,
        "ObfuscationRatio": obfuscation_ratio,
        "NoOfLettersInURL": no_letters,
        "LetterRatioInURL": letter_ratio,
        "NoOfDegitsInURL": no_digits,
        "DegitRatioInURL": digit_ratio,
        "NoOfEqualsInURL": no_equals,
        "NoOfQMarkInURL": no_qmark,
        "NoOfAmpersandInURL": no_ampersand,
        "NoOfOtherSpecialCharsInURL": no_other_special,
        "SpacialCharRatioInURL": special_ratio,
        "IsHTTPS": is_https,
    }


def extract_presentation_metadata(raw_url: str) -> dict[str, Any]:
    """
    Extract presentation-only metadata for UI dashboard display.
    These fields MUST NOT be passed into the Tier 1 model feature dictionary.
    """
    url, hostname, is_ip = validate_and_parse_url(raw_url)
    _, norm_url, _ = normalize_url(raw_url)

    is_punycode = bool("xn--" in hostname)
    entropy = compute_shannon_entropy(url)

    if is_ip:
        tld = "none"
    else:
        ext = _extractor(hostname)
        tld = ext.suffix.lower() if ext.suffix else "none"

    return {
        "domain": hostname,
        "tld": tld,
        "shannon_entropy": entropy,
        "is_punycode": is_punycode,
        "is_ip": is_ip,
        "normalized_url": norm_url,
    }
