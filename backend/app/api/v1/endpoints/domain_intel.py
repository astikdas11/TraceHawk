"""Domain & Authoritative DNS Intelligence Endpoint."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ....services.dns_service import query_domain_dns_records

router = APIRouter()


class DnsRecordModel(BaseModel):
    type: str
    value: str
    ttl: int
    flag: str | None = None


class DomainIntelligenceResponse(BaseModel):
    domain: str
    registrar: str
    creationDate: str
    ageDays: int
    asn: str
    ipAddress: str
    dnsRecords: list[DnsRecordModel]
    collectionStatus: str = "PARTIAL"
    uncollectedFields: list[str] = []
    warnings: list[str] = []


@router.get("/intelligence/domain", response_model=DomainIntelligenceResponse)
async def get_domain_intelligence(name: str = Query(..., description="Target domain name")):
    """
    Query authentic DNS zone records (A, AAAA, MX, NS, TXT, CNAME, SOA).
    Discloses collection status and uncollected fields when data sources are unavailable.
    """
    clean_domain = name.strip().lower()
    if not clean_domain:
        raise HTTPException(status_code=400, detail="Domain name parameter cannot be empty.")

    try:
        data = query_domain_dns_records(clean_domain)
        return DomainIntelligenceResponse(**data)
    except (ValueError, TypeError) as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
