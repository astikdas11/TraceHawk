"""
TRACEHAWK — URL Investigation Engine Service (Phase 4.2).

Orchestrates full-stack lexical forensics, RFC 3986 URL normalization,
safe decomposition, canonical Tier 1 feature extraction, production ML inference,
and calibrated, responsible risk categorization.
"""

import logging
from datetime import UTC, datetime
from typing import Any

from ..utils.feature_extractor import (
    extract_presentation_metadata,
    extract_url_only_features,
    generate_investigation_id,
    normalize_url,
    parse_url_safely,
    redact_url_credentials,
    validate_and_parse_url,
)
from .ml_service import ml_service

logger = logging.getLogger("tracehawk.services.url_investigation")


class UrlInvestigationService:
    """Enterprise URL investigation engine for Tier 1 lexical forensics and ML risk scoring."""

    def __init__(self, inference_service=None):
        self.ml_service = inference_service or ml_service

    def validate(self, raw_url: str) -> tuple[str, str, int]:
        """
        Validate URL syntax, schemes, ports, IP formats, and RFC limits.
        Raises ValueError or TypeError on invalid input.
        """
        return validate_and_parse_url(raw_url)

    def normalize(self, raw_url: str) -> tuple[str, str, dict[str, Any]]:
        """
        Perform RFC 3986 normalization without altering query order or target semantics.
        Returns (original_url, normalized_url, parsed_components).
        """
        return normalize_url(raw_url)

    def parse(self, raw_url: str) -> dict[str, Any]:
        """Safely decompose target URL into structured components without network egress."""
        return parse_url_safely(raw_url)

    def extract_features(self, raw_url: str) -> dict[str, Any]:
        """Extract canonical 19 features in exact frozen metadata order."""
        return extract_url_only_features(raw_url)

    def investigate(self, raw_url: str, threshold_mode: str = "standard") -> dict[str, Any]:
        """
        Execute full investigation workflow:
        1. Input validation & RFC normalization.
        2. Presentation metadata & canonical Tier 1 feature extraction.
           Note on feature parity: Model features are extracted directly from the submitted URL
           (clean_url), preserving raw character counts, case, hex obfuscations, and query syntax
           exactly as evaluated during Phase 3 model training. RFC 3986 normalization is performed
           in parallel for deduplication, indexing, and URL component presentation.
        3. Model prediction & threshold evaluation (standard: 0.50, security_hardened: 0.40).
        4. Structured evidence formulation with unrated/unverified confidence semantics.
        5. Deterministic investigation ID generation acting as a target asset fingerprint.
        """
        if not isinstance(raw_url, str) or not raw_url.strip():
            raise ValueError("Target URL cannot be empty or whitespace.")

        clean_url = raw_url.strip()

        # Validate operating threshold mode with strict type and value checking
        if threshold_mode is None or not isinstance(threshold_mode, str):
            raise TypeError(
                f"threshold_mode argument must be a string, got {type(threshold_mode).__name__} ({threshold_mode!r})"
            )
        mode = threshold_mode.strip().lower()
        if not mode:
            raise ValueError("threshold_mode argument cannot be empty or whitespace.")
        if mode not in ("standard", "security_hardened"):
            raise ValueError(
                f"Invalid threshold_mode '{threshold_mode}'. Must be 'standard' (0.50) or 'security_hardened' (0.40)."
            )

        # 1. URL Normalization and Canonical Feature Extraction
        orig_url, norm_url, _components = self.normalize(clean_url)
        model_features = self.extract_features(clean_url)
        pres_meta = extract_presentation_metadata(clean_url)

        # 2. Production ML Inference
        prediction = self.ml_service.predict_url_risk(model_features, threshold_mode=mode)

        # Consistent risk score extraction:
        # risk_score_raw is the high-precision float (0.0 - 100.0) from ML model probability
        # risk_score_int is the rounded integer percentage (0 - 100) for frontend gauges and badges
        risk_score_raw = float(prediction.get("risk_score_raw", prediction["risk_score"]))
        risk_score_int = round(risk_score_raw)
        risk_level = prediction["risk_level"]

        # Ensure valid, non-empty calibrated presentation label consistent with ML service
        risk_label = prediction.get("risk_label")
        if not risk_label or not isinstance(risk_label, str) or not risk_label.strip():
            risk_label = self.ml_service._compute_risk_label(risk_score_raw)

        # 3. Formulate structured evidence items with neutral confidence semantics
        evidence: list[dict[str, str]] = []
        idx = 1
        for reason in prediction.get("reasons", []):
            evidence.append(
                {
                    "id": f"IND-LEX-{idx:02d}",
                    "title": "Lexical & Structural Indicator",
                    "category": "Lexical Heuristics",
                    "severity": risk_level.lower(),
                    "evidence": reason,
                    "source": "TRACEHAWK ML Inference Engine",
                    "confidence": "Not independently verified",
                }
            )
            idx += 1

        # 4. Formulate evidence-grounded explanation and calibrated warnings
        is_malicious = prediction["is_malicious"]
        threshold = prediction["threshold"]
        prob_malicious = prediction["prob_malicious"]
        prob_benign = prediction["prob_benign"]
        prediction_label = "MALICIOUS" if is_malicious else "BENIGN"

        if is_malicious:
            explanation = (
                f"The investigated asset exhibits an elevated risk score of {risk_score_int}/100 "
                f"(estimated threat probability: {prob_malicious:.2%}), exceeding the operational "
                f"threshold of {threshold:.2f} (mode: {mode}). Lexical anomalies indicate potential "
                f"phishing risk; verification and containment procedures recommended."
            )
            warnings = [
                "Machine learning inference produces a probabilistic risk assessment, not definitive proof of fraud or legitimacy.",
                "Elevated risk indicators detected. Verification and containment procedures recommended before user access.",
            ]
        else:
            explanation = (
                f"The investigated asset exhibits an estimated risk score of {risk_score_int}/100 "
                f"(estimated threat probability: {prob_malicious:.2%}), remaining below the operational "
                f"decision threshold of {threshold:.2f} (mode: {mode}). Observed lexical indicators "
                f"do not exceed threat parameters; however, remaining below threshold does not establish that the website is safe. "
                f"Comprehensive multi-tiered inspection is recommended."
            )
            warnings = [
                "Machine learning inference produces a probabilistic risk assessment, not definitive proof of fraud or legitimacy.",
                "Result below threshold does not establish that the website is safe. Comprehensive multi-tiered inspection is recommended.",
            ]

        # Deterministic target fingerprint: identical raw URL inputs produce identical IDs
        investigation_id = generate_investigation_id(clean_url)
        timestamp = datetime.now(UTC).isoformat()

        return {
            "id": investigation_id,
            "url": redact_url_credentials(clean_url),
            "original_url": redact_url_credentials(orig_url),
            "normalized_url": norm_url,
            "normalisedUrl": norm_url,
            "domain": pres_meta["domain"],
            "riskScore": risk_score_int,
            "risk_score": risk_score_raw,
            "riskLevel": risk_level,
            "risk_level": risk_level,
            "riskLabel": risk_label,
            "risk_label": risk_label,
            "category": prediction["category"],
            "tier": "tier1",
            "model_version": prediction["model_version"],
            "prediction_label": prediction_label,
            "prob_malicious": prob_malicious,
            "prob_benign": prob_benign,
            "threshold": threshold,
            "threshold_mode": mode,
            "shannonEntropy": pres_meta["shannon_entropy"],
            "subdomainDepth": int(model_features["NoOfSubDomain"]),
            "isPunycode": bool(pres_meta["is_punycode"]),
            "isIpHosname": bool(model_features["IsDomainIP"]),
            "features": model_features,
            "explanation": explanation,
            "warnings": warnings,
            "evidenceList": evidence,
            "timestamp": timestamp,
        }


url_investigation_service = UrlInvestigationService()
