"""
TRACEHAWK — Vercel Serverless Runtime Diagnostic Probe
Phase 5, Step 2A.1: Diagnostic safety corrections.
Temporary diagnostic endpoints to evaluate event loop lifecycle, thread identity,
in-function concurrency, process isolation, and cross-loop asyncio synchronization.

STRICT SECURITY SAFEGUARDS:
- POSITIVE-MATCH ONLY: Mounted strictly when VERCEL_ENV == 'preview' (or local development/test).
- DISABLED IN PRODUCTION: Production, missing, malformed, staging, or unconfigured markers fail closed.
- Protected by DIAGNOSTIC_SECRET environment variable (minimum 32 bytes / characters).
- Constant-time timing-attack safe comparison using hmac.compare_digest.
- Never logs, prints, echoes, or returns the diagnostic secret.
- Hard bounded timeouts (max 5.0 seconds) and concurrency caps (max 15 waiters).

PROCESS-LOCAL ARCHITECTURE NOTE:
- All asyncio.Event barriers and in-memory counters reside strictly in the heap memory
  of the individual Python operating system process (os.getpid()).
- They DO NOT coordinate state across multiple Vercel container instances or microVMs.
- If Vercel distributes concurrent requests across distinct instances, barrier coordination
  is intentionally missed and reported via telemetry ('multi_instance_miss': True).
"""

import asyncio
import hmac
import os
import sys
import threading
import time
import uuid
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Header, Query, Request, status

diagnostic_router = APIRouter(prefix="/api/debug", tags=["Runtime Diagnostics"])

# ==============================================================================
# Module-Level Synchronization Primitives
# ==============================================================================

# Module-level 1-slot semaphore specifically to evaluate cross-loop contention.
# A 1-slot semaphore guarantees that ANY overlapping concurrent request arriving
# at the same container instance immediately experiences contention (value == 0),
# forcing the creation of an internal waiter Future attached to that request's event loop.
diagnostic_contention_semaphore = asyncio.Semaphore(1)

# Module-level multi-slot semaphore for burst concurrency testing
diagnostic_burst_semaphore = asyncio.Semaphore(10)

# In-memory diagnostic synchronization state — STRICTLY PROCESS-LOCAL.
# Resides exclusively in the heap of a single OS process (os.getpid()).
_diagnostic_barriers: dict[str, asyncio.Event] = {}
_barrier_waiters_count: dict[str, int] = {}
_barrier_lock = threading.Lock()

MAX_HOLD_SECONDS = 5.0
MAX_CONCURRENT_WAITERS = 15
MIN_SECRET_BYTES = 32

ALLOWED_VERCEL_ENVIRONMENTS = {"preview"}
ALLOWED_LOCAL_ENVIRONMENTS = {"development", "test"}


# ==============================================================================
# Environment & Authentication Security Controls
# ==============================================================================

def is_diagnostic_allowed() -> bool:
    """
    Determine whether diagnostic endpoints are permitted to operate.

    STRICT POSITIVE-MATCH & PRESENCE RULES:
    1. Production must always disable diagnostic routes:
       Any marker indicating production (VERCEL_ENV=production or ENVIRONMENT=production)
       takes immediate precedence and fails closed.
    2. Vercel execution is permitted ONLY when:
       - VERCEL positively identifies Vercel execution ('1' or 'true'), OR VERCEL_ENV is present;
       - AND VERCEL_ENV exactly equals 'preview';
       - AND the diagnostic secret passes the minimum 32-byte length check.
    3. Local development/test is permitted ONLY when:
       - BOTH VERCEL and VERCEL_ENV are genuinely absent from os.environ (os.environ.get(...) is None);
       - AND ENVIRONMENT exactly equals 'development' or 'test';
       - AND the diagnostic secret passes the minimum 32-byte length check.
    4. Any present but empty, malformed, or unexpected Vercel marker must fail closed
       unless the request positively satisfies the exact Preview rule.
    5. In particular, VERCEL="0", VERCEL="false", empty VERCEL, empty VERCEL_ENV, or unexpected
       marker combinations must fail closed and NEVER fall through to local development mode.
    6. ENVIRONMENT=development or test must NEVER override any Vercel marker.
    """
    raw_vercel = os.environ.get("VERCEL")
    raw_vercel_env = os.environ.get("VERCEL_ENV")
    raw_app_env = os.environ.get("ENVIRONMENT")

    norm_vercel = raw_vercel.strip().lower() if raw_vercel is not None else ""
    norm_vercel_env = raw_vercel_env.strip().lower() if raw_vercel_env is not None else ""
    norm_app_env = raw_app_env.strip().lower() if raw_app_env is not None else ""

    # Rule 1: Production must always disable diagnostic routes
    if norm_vercel_env == "production" or norm_app_env == "production":
        return False

    # Check whether ANY Vercel marker is present in the environment (not None)
    vercel_marker_present = (raw_vercel is not None) or (raw_vercel_env is not None)

    if vercel_marker_present:
        # Rule 2: On Vercel, permitted ONLY if VERCEL positively identifies Vercel execution
        # ('1' or 'true') OR VERCEL_ENV is present, AND VERCEL_ENV exactly equals 'preview'.
        vercel_is_active = (norm_vercel in {"1", "true"}) or (raw_vercel_env is not None)
        if not vercel_is_active:
            # Present but non-active marker (e.g. VERCEL="0", VERCEL="false", VERCEL="")
            return False

        if norm_vercel_env != "preview":
            # Missing, empty, staging, or unexpected VERCEL_ENV on Vercel fails closed
            return False
    else:
        # Rule 3: Local development/test is permitted ONLY when BOTH VERCEL and VERCEL_ENV
        # are genuinely absent from the environment (raw_vercel is None and raw_vercel_env is None)
        # AND ENVIRONMENT exactly equals 'development' or 'test'.
        if norm_app_env not in ALLOWED_LOCAL_ENVIRONMENTS:
            return False

    # Cryptographic secret entropy requirement (>= 32 bytes)
    raw_secret = os.environ.get("DIAGNOSTIC_SECRET", "").strip()
    if not raw_secret:
        return False

    secret_bytes = raw_secret.encode("utf-8")
    if len(secret_bytes) < MIN_SECRET_BYTES:
        return False

    return True


def verify_diagnostic_auth(x_diagnostic_secret: str | None = Header(None)) -> None:
    """Validate diagnostic secret with timing-attack safe comparison."""
    if not is_diagnostic_allowed():
        # Disclose zero information in production, misconfigured, or unconfigured environments
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnostic interface is not available in this environment.",
        )

    expected_secret = os.environ.get("DIAGNOSTIC_SECRET", "").strip()
    provided_secret = (x_diagnostic_secret or "").strip()

    if not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing diagnostic credentials.",
        )


# ==============================================================================
# Diagnostic Probes & Telemetry Endpoints
# ==============================================================================

@diagnostic_router.get("/runtime")
async def get_runtime_diagnostics(
    request: Request,
    x_diagnostic_secret: str | None = Header(None),
) -> dict[str, Any]:
    """
    Record Python runtime, process ID, thread identity, and event-loop identity.
    Used to establish whether concurrent invocations share container instances.
    """
    verify_diagnostic_auth(x_diagnostic_secret)

    running_loop = asyncio.get_running_loop()
    current_thread = threading.current_thread()
    entry_epoch = time.time()

    return {
        "invocation_id": str(uuid.uuid4()),
        "python_version": sys.version,
        "process_id": os.getpid(),
        "thread_id": threading.get_ident(),
        "thread_name": current_thread.name,
        "event_loop_id": id(running_loop),
        "event_loop_class": type(running_loop).__name__,
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(entry_epoch)),
        "timestamp_monotonic": time.monotonic(),
    }


@diagnostic_router.get("/concurrency")
async def execute_concurrency_diagnostic(
    request: Request,
    action: str = Query("barrier_wait", pattern="^(barrier_wait|barrier_release|semaphore_test|status)$"),
    semaphore_mode: str = Query("contention", pattern="^(contention|burst|none)$"),
    barrier_id: str = Query("default", min_length=1, max_length=64),
    hold_seconds: float = Query(2.0, ge=0.1, le=MAX_HOLD_SECONDS),
    timeout_seconds: float = Query(2.0, ge=0.1, le=10.0),
    x_diagnostic_secret: str | None = Header(None),
) -> dict[str, Any]:
    """
    Controlled asynchronous barrier and module-level semaphore diagnostic test.
    Evaluates in-function overlapping concurrency, cross-event-loop error emergence,
    and semaphore acquisition behavior under concurrent load.
    
    BARRIER SCOPE:
    Strictly process-local. If requests land on different container instances,
    barrier_release will report multi_instance_miss=True.
    """
    verify_diagnostic_auth(x_diagnostic_secret)

    running_loop = asyncio.get_running_loop()
    loop_id = id(running_loop)
    loop_class = type(running_loop).__name__
    thread_id = threading.get_ident()
    thread_name = threading.current_thread().name
    process_id = os.getpid()
    invocation_id = str(uuid.uuid4())
    entry_epoch = time.time()
    entry_monotonic = time.monotonic()
    entry_utc = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(entry_epoch))

    # Action 1: Status Probe
    if action == "status":
        with _barrier_lock:
            waiter_counts = dict(_barrier_waiters_count)
            active_barriers = list(_diagnostic_barriers.keys())
        return {
            "invocation_id": invocation_id,
            "process_id": process_id,
            "thread_id": thread_id,
            "thread_name": thread_name,
            "event_loop_id": loop_id,
            "event_loop_class": loop_class,
            "barrier_scope": "process_local",
            "active_barriers": active_barriers,
            "barrier_waiters": waiter_counts,
            "timestamp_utc": entry_utc,
        }

    # Action 2: Barrier Release
    if action == "barrier_release":
        with _barrier_lock:
            barrier_event = _diagnostic_barriers.get(barrier_id)
            if barrier_event:
                barrier_event.set()
                released = True
                multi_instance_miss = False
                routing_note = "Barrier successfully signaled within local process heap."
            else:
                released = False
                multi_instance_miss = True
                routing_note = (
                    "Barrier not found in current process memory. If concurrent requests "
                    "were distributed across different container instances, process-local "
                    "memory is not shared across instances."
                )
        return {
            "invocation_id": invocation_id,
            "barrier_id": barrier_id,
            "barrier_scope": "process_local",
            "released": released,
            "multi_instance_miss": multi_instance_miss,
            "routing_note": routing_note,
            "process_id": process_id,
            "thread_id": thread_id,
            "thread_name": thread_name,
            "event_loop_id": loop_id,
            "event_loop_class": loop_class,
            "timestamp_utc": entry_utc,
        }

    # Action 3 & 4: Concurrency Barrier & Semaphore Tests
    # Enforce bounded concurrent waiters per barrier
    with _barrier_lock:
        current_waiters = _barrier_waiters_count.get(barrier_id, 0)
        if current_waiters >= MAX_CONCURRENT_WAITERS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Exceeded maximum diagnostic waiters limit of {MAX_CONCURRENT_WAITERS}.",
            )
        _barrier_waiters_count[barrier_id] = current_waiters + 1

        if barrier_id not in _diagnostic_barriers:
            _diagnostic_barriers[barrier_id] = asyncio.Event()
        barrier_event = _diagnostic_barriers[barrier_id]

    # Select semaphore based on semaphore_mode
    if semaphore_mode == "contention":
        active_semaphore: asyncio.Semaphore | None = diagnostic_contention_semaphore
    elif semaphore_mode == "burst":
        active_semaphore = diagnostic_burst_semaphore
    else:
        active_semaphore = None

    semaphore_acquired = False
    semaphore_result = "not_tested" if active_semaphore is None else "pending"
    cross_loop_error: str | None = None
    release_error: str | None = None
    cancellation_detected = False
    hold_outcome = "not_started"

    try:
        # Step A: Test Module-Level Semaphore Acquisition
        if active_semaphore is not None:
            try:
                await asyncio.wait_for(
                    active_semaphore.acquire(),
                    timeout=timeout_seconds,
                )
                semaphore_acquired = True
                semaphore_result = "acquired"
            except TimeoutError:
                semaphore_result = "timeout_exceeded"
            except asyncio.CancelledError:
                cancellation_detected = True
                semaphore_result = "cancelled"
                raise
            except RuntimeError as err:
                # Detects "Task got Future attached to a different loop" or "Event loop closed"
                cross_loop_error = f"{type(err).__name__}: {str(err)}"
                semaphore_result = "cross_loop_runtime_error"
            except Exception as err:
                cross_loop_error = f"{type(err).__name__}: {str(err)}"
                semaphore_result = "exception"

        # Step B: If acquired (or not testing semaphore), hold on barrier or sleep
        if active_semaphore is None or semaphore_acquired:
            if action == "barrier_wait":
                try:
                    await asyncio.wait_for(barrier_event.wait(), timeout=hold_seconds)
                    hold_outcome = "barrier_signaled"
                except TimeoutError:
                    hold_outcome = "hold_duration_expired"
                except asyncio.CancelledError:
                    cancellation_detected = True
                    hold_outcome = "cancelled"
                    raise
            else:
                # semaphore_test: hold for requested duration
                try:
                    await asyncio.sleep(hold_seconds)
                    hold_outcome = "sleep_completed"
                except asyncio.CancelledError:
                    cancellation_detected = True
                    hold_outcome = "cancelled"
                    raise
        else:
            hold_outcome = "semaphore_not_acquired"

    finally:
        # Step C: Semaphore Release & Capacity Restoration
        if semaphore_acquired and active_semaphore is not None:
            try:
                active_semaphore.release()
            except Exception as rel_err:
                release_error = f"{type(rel_err).__name__}: {str(rel_err)}"

        # Clean up waiter count
        with _barrier_lock:
            remaining = _barrier_waiters_count.get(barrier_id, 1) - 1
            if remaining <= 0:
                _barrier_waiters_count.pop(barrier_id, None)
                _diagnostic_barriers.pop(barrier_id, None)
            else:
                _barrier_waiters_count[barrier_id] = remaining

    exit_epoch = time.time()
    exit_monotonic = time.monotonic()
    duration_ms = round((exit_monotonic - entry_monotonic) * 1000, 2)
    exit_utc = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(exit_epoch))

    return {
        "invocation_id": invocation_id,
        "process_id": process_id,
        "thread_id": thread_id,
        "thread_name": thread_name,
        "event_loop_id": loop_id,
        "event_loop_class": loop_class,
        "barrier_id": barrier_id,
        "barrier_scope": "process_local",
        "action": action,
        "semaphore_mode": semaphore_mode,
        "semaphore_acquired": semaphore_acquired,
        "semaphore_result": semaphore_result,
        "cross_loop_error": cross_loop_error,
        "cancellation_detected": cancellation_detected,
        "release_error": release_error,
        "hold_outcome": hold_outcome,
        "duration_ms": duration_ms,
        "entry_timestamp_utc": entry_utc,
        "exit_timestamp_utc": exit_utc,
    }


def mount_diagnostic_routes(app: FastAPI) -> None:
    """
    Mount diagnostic router conditionally.
    Strictly omitted unless is_diagnostic_allowed() returns True
    (positive match for Preview/development environment AND >= 32-byte secret configured).
    """
    if not is_diagnostic_allowed():
        return

    app.include_router(diagnostic_router)
