"""TRACEHAWK Pydantic Schemas for Phishing Classification & Inference."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class InvestigationStatus(str, Enum):
    """Investigation status indicating the completeness and reliability of evidence collection."""

    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
    PARTIAL_ANALYSIS = "PARTIAL_ANALYSIS"
    INCONCLUSIVE = "INCONCLUSIVE"
    COLLECTION_FAILED = "COLLECTION_FAILED"


class URLInferenceRequest(BaseModel):
    url: str = Field(..., description="Target URL string to evaluate.")
    tier: str = Field("tier1", description="Inference tier: 'tier1' (URL-only) or 'tier2' (full webpage).")


class URLInferenceResponse(BaseModel):
    url: str
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score from 0 (benign) to 100 (critical threat).")
    risk_level: str = Field(..., description="Legacy risk level: LOW_RISK, SUSPICIOUS, HIGH_RISK, CONFIRMED_MALICIOUS")
    risk_label: str = Field(
        default="Low Risk",
        description="Calibrated human-facing presentation label (e.g., Low Risk, Suspicious, High Risk, Critical Risk)",
    )
    is_malicious: bool
    investigation_status: InvestigationStatus = Field(
        default=InvestigationStatus.ANALYSIS_COMPLETE,
        description="Investigation completeness: ANALYSIS_COMPLETE, PARTIAL_ANALYSIS, INCONCLUSIVE, or COLLECTION_FAILED.",
    )
    full_webpage_completed: bool = Field(
        default=True,
        description="Flag indicating whether full webpage inspection completed.",
    )
    tier_used: str
    model_version: str
    latency_ms: float
    reasons: list[str] = Field(default_factory=list)
    extracted_features: dict[str, Any] = Field(default_factory=dict)
    tier1_finding: dict[str, Any] | None = Field(
        default=None,
        description="Preserved Tier 1 URL-only finding when Tier 2 encounters collection failures.",
    )

