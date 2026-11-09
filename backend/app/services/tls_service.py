"""
TRACEHAWK — TLS Certificate Auditing & Forensics Service (Phase 4.3).

Performs authentic, SSRF-hardened socket-level handshake and peer/leaf X.509
certificate inspection. Protects against SSRF and DNS rebinding by pre-resolving
and pinning validated public IP addresses. Decouples certificate metadata extraction
from chain trust and hostname verification. Enforces HTTPS port 443 only.
"""

import datetime
import ipaddress
import logging
import math
import socket
import ssl
from typing import Any

import certifi
import idna
from cryptography import x509
from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding, rsa
from cryptography.x509.oid import SignatureAlgorithmOID

from backend.app.utils.domain_validator import validate_and_normalize_domain

logger = logging.getLogger("tracehawk.services.tls")

DEFAULT_TLS_TIMEOUT: float = 5.0
MAX_TLS_TIMEOUT: float = 30.0
PERMITTED_TLS_PORT: int = 443


def _validate_tls_port(port: Any) -> int:
    """
    Enforce HTTPS port 443 strictly.
    Rejects boolean values (since isinstance(True, int) is True in Python),
    non-integers, and any port other than 443.
    """
    if isinstance(port, bool) or not isinstance(port, int):
        raise ValueError(f"Port {port!r} is not permitted for TLS inspection. Only integer port {PERMITTED_TLS_PORT} is permitted.")  # noqa: TRY004
    if port != PERMITTED_TLS_PORT:
        raise ValueError(
            f"Port {port} is not permitted for TLS inspection. Only port {PERMITTED_TLS_PORT} is permitted."
        )
    return port


def _validate_tls_timeout(val: Any) -> float:
    """
    Validate TLS timeout parameter:
    1. Rejects boolean values explicitly.
    2. Rejects non-numeric types.
    3. Rejects NaN and Infinity for floats.
    4. Rejects non-positive values (<= 0).
    5. Enforces hard upper bound without float conversion to safely prevent
       OverflowError on huge integers.
    """
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        raise ValueError(f"Timeout must be a positive finite number, got {val!r}.")  # noqa: TRY004
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        raise ValueError(f"Timeout must be a positive finite number, got {val!r}.")
    if val <= 0:
        raise ValueError(f"Timeout must be a positive finite number, got {val!r}.")
    if val > MAX_TLS_TIMEOUT:
        raise ValueError(f"Timeout ({val}s) exceeds maximum permitted limit of {MAX_TLS_TIMEOUT}s.")
    return float(val)


def is_prohibited_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> tuple[bool, str]:
    """
    Check if an IP address is prohibited under SSRF protection policy.
    Rejects loopback, private, link-local, multicast, reserved, unspecified,
    and all non-global addresses (including CGNAT RFC 6598).
    """
    # Unpack IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1 or ::ffff:10.0.0.1)
    if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped:
        return is_prohibited_ip(ip_obj.ipv4_mapped)

    if ip_obj.is_loopback:
        return True, "loopback address"
    if ip_obj.is_private:
        return True, "private address"
    if ip_obj.is_link_local:
        return True, "link-local address"
    if ip_obj.is_multicast:
        return True, "multicast address"
    if ip_obj.is_reserved:
        return True, "reserved address"
    if ip_obj.is_unspecified:
        return True, "unspecified address"
    if getattr(ip_obj, "is_site_local", False):
        return True, "site-local address"
    if not ip_obj.is_global:
        return True, "non-global address"
    return False, ""


def verify_certificate_hostname(cert: x509.Certificate, domain_name: str) -> str:
    """
    RFC 6125-compliant certificate hostname verification.
    Inspects Subject Alternative Name (dNSName) entries; falls back to Subject Common Name
    only when no SAN dNSNames are present.
    Supports exact matching and single-level wildcard matching (*.example.com matches
    sub.example.com, but does not match example.com or a.b.example.com).

    Returns:
        "MATCH" if hostname matches certificate, "MISMATCH" otherwise.
    """
    if not isinstance(cert, x509.Certificate) or not isinstance(domain_name, str):
        return "MISMATCH"

    clean_target = domain_name.strip().lower().rstrip(".")
    if not clean_target:
        return "MISMATCH"

    # Compute target ASCII and Unicode representations
    targets: set[str] = {clean_target}
    try:
        targets.add(idna.encode(clean_target).decode("ascii").lower())
    except idna.IDNAError:
        pass
    try:
        targets.add(idna.decode(clean_target).lower())
    except idna.IDNAError:
        pass

    # Extract candidate patterns: SAN takes precedence over CN per RFC 6125 Section 6.4.4
    candidate_patterns: list[str] = []
    has_san_extension = False
    try:
        san_ext = cert.extensions.get_extension_for_oid(x509.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
        has_san_extension = True
        for name in san_ext.value:
            if isinstance(name, x509.DNSName):
                candidate_patterns.append(name.value)
    except x509.ExtensionNotFound:
        pass

    # Fallback to Subject Common Name ONLY if no SAN extension is present
    if not has_san_extension and not candidate_patterns:
        cn_attrs = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)
        if cn_attrs:
            candidate_patterns.append(str(cn_attrs[0].value))

    for pattern in candidate_patterns:
        pat = pattern.strip().lower().rstrip(".")
        if not pat:
            continue

        # Exact match check
        if pat in targets:
            return "MATCH"

        # Check Punycode or Unicode equivalent
        pat_variants: set[str] = {pat}
        try:
            pat_variants.add(idna.encode(pat).decode("ascii").lower())
        except idna.IDNAError:
            pass
        try:
            pat_variants.add(idna.decode(pat).lower())
        except idna.IDNAError:
            pass

        if pat_variants & targets:
            return "MATCH"

        # RFC 6125 Section 6.4.3: Single-level wildcard matching (*.suffix)
        for p_var in pat_variants:
            if p_var.startswith("*."):
                suffix = p_var[2:]  # e.g. "example.com"
                if not suffix or "." not in suffix or "*" in suffix:
                    continue
                for t in targets:
                    if t.endswith("." + suffix):
                        left_label = t[:-len("." + suffix)]
                        # Must match exactly one label: no dots and non-empty
                        if left_label and "." not in left_label and "*" not in left_label:
                            return "MATCH"

    return "MISMATCH"


def is_cryptographically_self_signed(cert: x509.Certificate) -> bool | None:
    """
    Cryptographically verify whether a certificate is authentic self-signed.
    Merely having matching subject and issuer names is not sufficient.

    Returns:
        True: Certificate signature successfully verified with its own public key.
        False: Subject does not match issuer, or signature verification failed (invalid signature).
        None: Inconclusive (unsupported signature algorithm, unsupported padding parameters, or unknown key type).
    """
    if cert.subject != cert.issuer:
        return False

    try:
        pub_key = cert.public_key()
        sig_oid = getattr(cert, "signature_algorithm_oid", None)

        # 1. RSA Verification (PKCS#1 v1.5 or RSA-PSS)
        if isinstance(pub_key, rsa.RSAPublicKey):
            is_pss = (
                sig_oid == SignatureAlgorithmOID.RSASSA_PSS
                or isinstance(getattr(cert, "signature_algorithm_parameters", None), padding.PSS)
            )
            if is_pss:
                pss_params = getattr(cert, "signature_algorithm_parameters", None)
                if not isinstance(pss_params, padding.PSS):
                    return None
                hash_algo = getattr(cert, "signature_hash_algorithm", None)
                if hash_algo is None:
                    return None
                try:
                    pub_key.verify(
                        cert.signature,
                        cert.tbs_certificate_bytes,
                        pss_params,
                        hash_algo,
                    )
                    return True
                except InvalidSignature:
                    return False
                except (UnsupportedAlgorithm, TypeError, ValueError):
                    return None
            else:
                # PKCS#1 v1.5 verification
                hash_algo = getattr(cert, "signature_hash_algorithm", None)
                if hash_algo is None:
                    return None
                try:
                    pub_key.verify(
                        cert.signature,
                        cert.tbs_certificate_bytes,
                        padding.PKCS1v15(),
                        hash_algo,
                    )
                    return True
                except InvalidSignature:
                    return False
                except (UnsupportedAlgorithm, TypeError, ValueError):
                    return None

        # 2. Elliptic Curve (ECDSA)
        elif isinstance(pub_key, ec.EllipticCurvePublicKey):
            hash_algo = getattr(cert, "signature_hash_algorithm", None)
            if hash_algo is None:
                return None
            try:
                pub_key.verify(
                    cert.signature,
                    cert.tbs_certificate_bytes,
                    ec.ECDSA(hash_algo),
                )
                return True
            except InvalidSignature:
                return False
            except (UnsupportedAlgorithm, TypeError, ValueError):
                return None

        # 3. Ed25519
        elif isinstance(pub_key, ed25519.Ed25519PublicKey):
            try:
                pub_key.verify(cert.signature, cert.tbs_certificate_bytes)
                return True
            except InvalidSignature:
                return False
            except (UnsupportedAlgorithm, TypeError, ValueError):
                return None

        # Any other public key type is unsupported for self-signature verification
        return None

    except (UnsupportedAlgorithm, NotImplementedError):
        return None
    except Exception:  # noqa: BLE001
        return None


def audit_tls_certificate(domain: str, port: int = PERMITTED_TLS_PORT, timeout: float = DEFAULT_TLS_TIMEOUT) -> dict[str, Any]:
    """
    Perform authentic, SSRF-hardened socket-level TLS handshake and peer/leaf X.509
    certificate inspection.

    Args:
        domain: Hostname or target domain to inspect.
        port: TLS port (must be exactly 443).
        timeout: Socket handshake timeout in seconds (positive, finite, <= 30.0s).

    Returns:
        dict[str, Any]: Real certificate properties including decoupled verification
                        statuses, subject, issuer, validity, SANs, and cipher suite.
    """
    # 1. Type and Input Validation
    if not isinstance(domain, str):
        raise TypeError(f"Expected str for domain, got {type(domain).__name__}")
    if not domain.strip():
        raise ValueError("Domain parameter cannot be empty or whitespace only.")

    # 2. Port Validation (HTTPS Port 443 Only)
    port = _validate_tls_port(port)

    # 3. Timeout Validation
    timeout = _validate_tls_timeout(timeout)

    # 4. Strict Domain Validation (IDNA2008 & SSRF input rejection)
    val_result = validate_and_normalize_domain(domain)
    clean_domain = val_result.normalized_domain
    ascii_domain = val_result.ascii_domain
    is_idn = val_result.is_idn

    # 5. SSRF Guard & DNS Pinning: Resolve hostname before connection
    try:
        addr_info = socket.getaddrinfo(ascii_domain, port, type=socket.SOCK_STREAM)
    except socket.gaierror as gai_err:
        logger.warning("DNS resolution failed for %s: %s", ascii_domain, type(gai_err).__name__)
        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
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
            "warnings": [f"DNS resolution failed for hostname '{clean_domain}'."],
        }
    except Exception as res_err:  # noqa: BLE001
        logger.warning("Unexpected DNS resolver failure for %s: %s", ascii_domain, type(res_err).__name__)
        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
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
            "warnings": [f"DNS resolution failed for hostname '{clean_domain}'."],
        }

    if not addr_info:
        raise ValueError(f"No IP addresses resolved for hostname '{clean_domain}'")

    # Validate every resolved address against SSRF rules
    pinned_sockaddr = None
    pinned_family = None
    for family, _socktype, _proto, _canonname, sockaddr in addr_info:
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError as ip_err:
            raise ValueError(f"Invalid IP address resolved for '{clean_domain}': {ip_str}") from ip_err

        is_blocked, reason = is_prohibited_ip(ip_obj)
        if is_blocked:
            raise ValueError(
                f"Prohibited destination IP '{ip_str}' ({reason}) for target '{clean_domain}'. "
                "Connection blocked by SSRF protection policy."
            )

        if pinned_sockaddr is None:
            pinned_sockaddr = sockaddr
            pinned_family = family

    assert pinned_sockaddr is not None and pinned_family is not None

    warnings: list[str] = []
    protocol: str = "NONE"
    cipher_suite: str = "NONE"
    raw_der: bytes | None = None
    chain_verification_status: str = "UNAVAILABLE"
    hostname_verification_status: str = "UNAVAILABLE"
    validity_status: str = "UNAVAILABLE"

    # 6. Complete chain-verifying handshake pinned to validated public IP
    # Creates a trusted SSL context using the certifi CA bundle with verify_mode=CERT_REQUIRED
    # and check_hostname=False so chain verification is decoupled from hostname verification.
    try:
        cafile = certifi.where() if certifi else None
        verify_ctx = ssl.create_default_context(cafile=cafile)
        verify_ctx.check_hostname = False
        verify_ctx.verify_mode = ssl.CERT_REQUIRED
        with socket.socket(family=pinned_family, type=socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            sock.connect(pinned_sockaddr)
            with verify_ctx.wrap_socket(sock, server_hostname=ascii_domain) as sslobj:
                protocol = sslobj.version() or "TLS"
                cipher_info = sslobj.cipher()
                cipher_suite = cipher_info[0] if cipher_info else "UNKNOWN"
                raw_der = sslobj.getpeercert(binary_form=True)
                chain_verification_status = "VERIFIED"
    except ssl.SSLCertVerificationError as v_err:
        err_msg = str(v_err).lower()
        if "expired" in err_msg:
            chain_verification_status = "EXPIRED"
            validity_status = "EXPIRED"
            warnings.append("Certificate has expired.")
        else:
            chain_verification_status = "UNTRUSTED_CA"
            validity_status = "UNTRUSTED_CA"
            warnings.append("Certificate chain verification failed: untrusted certificate authority.")

        # Attempt unverified fallback handshake to inspect leaf certificate attributes
        try:
            unverify_ctx = ssl.create_default_context()
            unverify_ctx.check_hostname = False
            unverify_ctx.verify_mode = ssl.CERT_NONE
            with socket.socket(family=pinned_family, type=socket.SOCK_STREAM) as unverified_sock:
                unverified_sock.settimeout(timeout)
                unverified_sock.connect(pinned_sockaddr)
                with unverify_ctx.wrap_socket(unverified_sock, server_hostname=ascii_domain) as unverified_sslobj:
                    protocol = unverified_sslobj.version() or "TLS"
                    cipher_info = unverified_sslobj.cipher()
                    cipher_suite = cipher_info[0] if cipher_info else "UNKNOWN"
                    raw_der = unverified_sslobj.getpeercert(binary_form=True)
        except Exception as unverified_err:  # noqa: BLE001
            logger.warning("Unverified fallback handshake failed for %s: %s", ascii_domain, type(unverified_err).__name__)
            raw_der = None

    except TimeoutError as t_err:
        logger.warning("TLS connection to %s timed out after %ss: %s", ascii_domain, timeout, type(t_err).__name__)
        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
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
            "warnings": [f"TLS connection to {clean_domain}:{port} timed out after {timeout} seconds."],
        }
    except Exception as conn_err:  # noqa: BLE001
        logger.warning("TLS handshake connection failed for %s: %s", ascii_domain, type(conn_err).__name__)
        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
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
            "warnings": [f"TLS connection to {clean_domain}:{port} failed."],
        }

    # 7. Fallback or connection failure with no raw certificate bytes
    if not raw_der:
        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
            "validityStatus": validity_status,
            "chainVerificationStatus": chain_verification_status,
            "hostnameVerificationStatus": hostname_verification_status,
            "subject": "UNAVAILABLE",
            "issuer": "UNAVAILABLE",
            "validationType": "UNAVAILABLE",
            "validFrom": "UNAVAILABLE",
            "validTo": "UNAVAILABLE",
            "daysRemaining": 0,
            "totalDays": 0,
            "protocol": protocol,
            "cipherSuite": cipher_suite,
            "signatureAlgorithm": "UNKNOWN",
            "publicKeyBits": 0,
            "keyStrength": "UNAVAILABLE",
            "sha256Fingerprint": "UNAVAILABLE",
            "sanList": [],
            "warnings": warnings or ["Failed to retrieve certificate data from target."],
        }

    # 8. Parse real X.509 certificate attributes
    try:
        cert = x509.load_der_x509_certificate(raw_der)

        # Subject extraction
        sub_cn_attrs = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)
        sub_o_attrs = cert.subject.get_attributes_for_oid(x509.NameOID.ORGANIZATION_NAME)
        sub_cn = sub_cn_attrs[0].value if sub_cn_attrs else ""
        sub_o = sub_o_attrs[0].value if sub_o_attrs else ""
        if sub_cn and sub_o:
            subject_str = f"{sub_cn} ({sub_o})"
        elif sub_cn or sub_o:
            subject_str = str(sub_cn or sub_o)
        else:
            subject_str = cert.subject.rfc4514_string()

        # Issuer extraction
        issuer_cn_attrs = cert.issuer.get_attributes_for_oid(x509.NameOID.COMMON_NAME)
        issuer_o_attrs = cert.issuer.get_attributes_for_oid(x509.NameOID.ORGANIZATION_NAME)
        issuer_cn = issuer_cn_attrs[0].value if issuer_cn_attrs else ""
        issuer_o = issuer_o_attrs[0].value if issuer_o_attrs else ""
        if issuer_cn and issuer_o:
            issuer_str = f"{issuer_cn} ({issuer_o})"
        elif issuer_cn or issuer_o:
            issuer_str = str(issuer_cn or issuer_o)
        else:
            issuer_str = cert.issuer.rfc4514_string()

        # SHA-256 Fingerprint
        sha256_fp = ":".join(f"{b:02X}" for b in cert.fingerprint(hashes.SHA256()))

        # SAN extraction
        san_list: list[str] = []
        try:
            san_ext = cert.extensions.get_extension_for_oid(x509.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
            for name in san_ext.value:
                san_list.append(str(name.value))
        except x509.ExtensionNotFound:
            pass

        # Hostname verification (RFC 6125)
        hostname_verification_status = verify_certificate_hostname(cert, ascii_domain)

        # Validity Dates & Expiration Assessment
        not_before = getattr(cert, "not_valid_before_utc", None) or cert.not_valid_before
        not_after = getattr(cert, "not_valid_after_utc", None) or cert.not_valid_after
        if not_before.tzinfo is None:
            not_before = not_before.replace(tzinfo=datetime.UTC)
        if not_after.tzinfo is None:
            not_after = not_after.replace(tzinfo=datetime.UTC)

        now = datetime.datetime.now(datetime.UTC)
        valid_from_str = not_before.strftime("%Y-%m-%d")
        valid_to_str = not_after.strftime("%Y-%m-%d")

        days_remaining = max(0, (not_after - now).days)
        total_days = max(1, (not_after - not_before).days)

        is_expired = (now > not_after)
        if is_expired:
            chain_verification_status = "EXPIRED"
            days_remaining = 0
            if not any("expired" in w.lower() for w in warnings):
                warnings.append(f"Certificate expired on {valid_to_str}.")
        elif 0 < days_remaining <= 14:
            warnings.append(f"Ephemeral certificate: Remaining validity <= 14 days ({days_remaining} days remaining).")

        if hostname_verification_status == "MISMATCH" and not any("hostname mismatch" in w.lower() for w in warnings):
            warnings.append(f"Certificate hostname mismatch: certificate does not match '{clean_domain}'.")

        # Cryptographic Self-Signature Assessment
        self_signed_result = is_cryptographically_self_signed(cert)
        if self_signed_result is True:
            validation_type = "SELF_SIGNED"
            if not is_expired:
                chain_verification_status = "UNTRUSTED_CA"
            warnings.append("Certificate is cryptographically self-signed.")
        else:
            if self_signed_result is None:
                if cert.subject == cert.issuer:
                    warnings.append(
                        "Certificate subject matches issuer name but signature algorithm is unsupported for cryptographic self-signature verification."
                    )
            elif cert.subject == cert.issuer:
                warnings.append("Certificate subject matches issuer name but self-signature does not verify.")

            validation_type = "UNKNOWN"
            try:
                policies_ext = cert.extensions.get_extension_for_oid(x509.ExtensionOID.CERTIFICATE_POLICIES)
                policy_oids = {str(p.policy_identifier.dotted_string) for p in policies_ext.value}
                if "2.23.140.1.1" in policy_oids:
                    validation_type = "EV"
                elif "2.23.140.1.2.1" in policy_oids:
                    validation_type = "DV"
            except (x509.ExtensionNotFound, ValueError, TypeError):
                pass

        # Backward-compatible validityStatus determination
        if is_expired:
            validity_status = "EXPIRED"
        elif hostname_verification_status == "MISMATCH":
            validity_status = "HOSTNAME_MISMATCH"
        elif self_signed_result is True:
            validity_status = "SELF_SIGNED"
        elif chain_verification_status == "UNTRUSTED_CA":
            validity_status = "UNTRUSTED_CA"
        elif chain_verification_status == "VERIFIED" and hostname_verification_status == "MATCH":
            validity_status = "ACTIVE"
        else:
            validity_status = "INVALID"

        # Public key size and cryptographic strength
        pub_key = cert.public_key()
        if isinstance(pub_key, rsa.RSAPublicKey):
            pub_bits = pub_key.key_size
            key_strength = "STRONG" if pub_bits >= 3072 else "ACCEPTABLE" if pub_bits >= 2048 else "WEAK_DEPRECATED"
        elif isinstance(pub_key, ec.EllipticCurvePublicKey):
            pub_bits = pub_key.curve.key_size
            key_strength = "STRONG" if pub_bits >= 256 else "WEAK_DEPRECATED"
        else:
            pub_bits = getattr(pub_key, "key_size", 0)
            key_strength = "ACCEPTABLE" if pub_bits >= 2048 else "WEAK_DEPRECATED"

        if key_strength == "WEAK_DEPRECATED":
            warnings.append(f"Cryptographically weak public key ({pub_bits} bits).")

        sig_alg = cert.signature_algorithm_oid._name if hasattr(cert.signature_algorithm_oid, "_name") else "UNKNOWN"

        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
            "validityStatus": validity_status,
            "chainVerificationStatus": chain_verification_status,
            "hostnameVerificationStatus": hostname_verification_status,
            "subject": subject_str,
            "issuer": issuer_str,
            "validationType": validation_type,
            "validFrom": valid_from_str,
            "validTo": valid_to_str,
            "daysRemaining": days_remaining,
            "totalDays": total_days,
            "protocol": protocol,
            "cipherSuite": cipher_suite,
            "signatureAlgorithm": sig_alg,
            "publicKeyBits": pub_bits,
            "keyStrength": key_strength,
            "sha256Fingerprint": sha256_fp,
            "sanList": san_list,
            "warnings": warnings,
        }

    except Exception as parse_err:  # noqa: BLE001
        logger.error("Failed to parse X.509 certificate for %s: %s", ascii_domain, type(parse_err).__name__)
        return {
            "domain": clean_domain,
            "asciiDomain": ascii_domain,
            "isIdn": is_idn,
            "validityStatus": "INVALID",
            "chainVerificationStatus": "INVALID",
            "hostnameVerificationStatus": "UNAVAILABLE",
            "subject": "UNAVAILABLE",
            "issuer": "UNAVAILABLE",
            "validationType": "UNAVAILABLE",
            "validFrom": "UNAVAILABLE",
            "validTo": "UNAVAILABLE",
            "daysRemaining": 0,
            "totalDays": 0,
            "protocol": protocol,
            "cipherSuite": cipher_suite,
            "signatureAlgorithm": "UNKNOWN",
            "publicKeyBits": 0,
            "keyStrength": "UNAVAILABLE",
            "sha256Fingerprint": "UNAVAILABLE",
            "sanList": [],
            "warnings": ["Failed to parse X.509 certificate attributes."],
        }
