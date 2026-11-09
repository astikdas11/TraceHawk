"""
TRACEHAWK — Domain Investigation Orchestration Endpoint.
Exposes POST /api/v1/investigate/domain for authentic DNS intelligence collection,
hardened TLS cryptographic auditing, deterministic identification, and evidence synthesis.
"""

import logging
import re

from fastapi import APIRouter, HTTPException, status
from starlette.concurrency import run_in_threadpool

from backend.app.schemas.domain_investigation import (
    DomainInvestigationRequest,
    DomainInvestigationResponse,
)
from backend.app.services.domain_intelligence_service import (
    DomainInputError,
    get_domain_intelligence_service,
)
from backend.app.utils.feature_extractor import redact_url_credentials

logger = logging.getLogger("tracehawk.api.domain_investigation")

router = APIRouter()


@router.post(
    "/investigate/domain",
    response_model=DomainInvestigationResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Domain Intelligence Investigation",
    description=(
        "Orchestrates strict domain validation, authentic DNS intelligence collection, "
        "hardened TLS cryptographic auditing, deterministic identification, and evidence synthesis."
    ),
)
async def investigate_domain(
    payload: DomainInvestigationRequest,
) -> DomainInvestigationResponse:
    """
    Execute end-to-end domain intelligence investigation.

    Delegates synchronous blocking DNS and TLS network operations to an external threadpool
    to prevent event loop blocking.

    Args:
        payload: DomainInvestigationRequest containing target domain string.

    Returns:
        DomainInvestigationResponse with complete aggregated intelligence.

    Raises:
        HTTPException 400: If domain fails strict RFC 1035 / 1123 / IDNA validation,
                           contains schemes, paths, ports, credentials, or is an IP literal.
        HTTPException 500: If internal schema validation or service failure occurs.
    """
    service = get_domain_intelligence_service()

    try:
        return await run_in_threadpool(service.investigate_domain, payload.domain)
    except DomainInputError as err:
        # Sanitize user input error detail for presentation
        clean_msg = re.sub(
            r"[A-Za-z]:/[^:]+/", "", str(err).replace("\\", "/").split("\n")[0]
        )
        clean_msg = redact_url_credentials(clean_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target domain: {clean_msg}",
        ) from err
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected internal error during domain investigation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal server error occurred while processing the domain investigation.",
        ) from exc
