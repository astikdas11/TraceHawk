"""TRACEHAWK API v1 Router Aggregator."""

from fastapi import APIRouter

from .endpoints import (
    domain_intel,
    domain_investigation,
    tls_intel,
    url_investigation,
)

api_v1_router = APIRouter()

api_v1_router.include_router(url_investigation.router, tags=["URL Forensics"])
api_v1_router.include_router(domain_intel.router, tags=["Domain Intelligence"])
api_v1_router.include_router(tls_intel.router, tags=["TLS Cryptography"])
api_v1_router.include_router(domain_investigation.router, tags=["Domain Investigation"])
