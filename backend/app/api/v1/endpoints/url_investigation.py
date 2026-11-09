"""
TRACEHAWK — URL Lexical Forensics & Production Inference Endpoint.
Integrates canonical Tier 1 feature extraction, URL normalization, and ML model prediction.
"""

import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ....services.url_investigation_service import url_investigation_service
from ....utils.feature_extractor import redact_url_credentials

logger = logging.getLogger("tracehawk.api.url_investigation")

router = APIRouter()


class UrlInvestigationRequest(BaseModel):
    url: str = Field(..., description="Target URL string to evaluate.")
    threshold_mode: Any = Field(
        default="standard",
        description="Operating threshold mode: 'standard' (0.50) or 'security_hardened' (0.40).",
    )


class ThreatEvidenceItem(BaseModel):
    id: str
    title: str
    category: str
    severity: str
    evidence: str
    source: str
    confidence: str


class UrlInvestigationResponse(BaseModel):
    id: str
    url: str
    original_url: str
    normalized_url: str
    normalisedUrl: str
    domain: str
    riskScore: int = Field(..., ge=0, le=100, description="Integer percentage risk score (0-100) for UI meter/badge display.")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Precise floating-point percentage risk score (e.g. 78.45) for analytical/reporting consumers.")
    riskLevel: str = Field(..., description="Legacy risk level: LOW_RISK, SUSPICIOUS, HIGH_RISK, CONFIRMED_MALICIOUS")
    risk_level: str = Field(..., description="Legacy risk level (snake_case)")
    risk_label: str = Field(..., description="Calibrated threat presentation label (e.g. Critical Risk, High Risk, Suspicious, Low Risk)")
    riskLabel: str = Field(..., description="Calibrated threat presentation label (camelCase alias)")
    category: str
    tier: str = "tier1"
    model_version: str
    prediction_label: str
    prob_malicious: float
    prob_benign: float
    threshold: float
    threshold_mode: str
    shannonEntropy: float
    subdomainDepth: int
    isPunycode: bool
    isIpHosname: bool
    features: dict[str, Any]
    explanation: str
    warnings: list[str] = Field(default_factory=list)
    evidenceList: list[ThreatEvidenceItem]
    timestamp: str


@router.post("/investigate/url", response_model=UrlInvestigationResponse)
async def investigate_url(payload: UrlInvestigationRequest):
    """
    Execute full-stack lexical extraction, URL normalization, ML prediction,
    and heuristic corroboration for a target URL or domain via UrlInvestigationService.
    """
    raw_url = payload.url.strip() if isinstance(payload.url, str) and payload.url else ""
    if not raw_url:
        raise HTTPException(status_code=400, detail="Target URL cannot be empty or whitespace.")

    # Validate operating threshold mode safely
    raw_mode = payload.threshold_mode
    if raw_mode is None or not isinstance(raw_mode, str):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid threshold_mode: must be a string, got {type(raw_mode).__name__}.",
        )
    clean_mode = raw_mode.strip().lower()
    if not clean_mode or clean_mode not in ("standard", "security_hardened"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid threshold_mode '{raw_mode}'. Must be 'standard' (0.50) or 'security_hardened' (0.40).",
        )

    try:
        result = url_investigation_service.investigate(raw_url, threshold_mode=clean_mode)
        return UrlInvestigationResponse(**result)
    except (ValueError, TypeError) as err:
        # Sanitize error detail to prevent leaking internal stack/paths and embedded credentials
        clean_msg = re.sub(r"[A-Za-z]:/[^:]+/", "", str(err).replace("\\", "/").split("\n")[0])
        clean_msg = redact_url_credentials(clean_msg)
        raise HTTPException(status_code=400, detail=f"Invalid target URL: {clean_msg}") from err
    except RuntimeError as err:
        logger.error("Inference service unavailable during URL investigation: %s", err)
        raise HTTPException(
            status_code=503,
            detail="Inference service is currently unavailable. Production models are not initialized.",
        ) from err
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected internal error during URL investigation")
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal server error occurred while processing the investigation.",
        ) from exc
