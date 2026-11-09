"""TLS Certificate Cryptographic Audit Endpoint."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ....services.tls_service import audit_tls_certificate

router = APIRouter()


class TlsIntelligenceResponse(BaseModel):
    domain: str
    validityStatus: str
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
    sanList: list[str]
    warnings: list[str]


@router.get("/intelligence/tls", response_model=TlsIntelligenceResponse)
async def get_tls_intelligence(domain: str = Query(..., description="Target domain name")):
    """
    Perform authentic socket-level X.509 certificate audit and cipher suite inspection.
    """
    clean_domain = domain.strip().lower()
    if not clean_domain:
        raise HTTPException(status_code=400, detail="Domain name parameter cannot be empty.")

    try:
        data = audit_tls_certificate(clean_domain)
        return TlsIntelligenceResponse(**data)
    except (ValueError, TypeError) as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
