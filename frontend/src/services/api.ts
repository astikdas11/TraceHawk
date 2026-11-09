/// <reference types="vite/client" />
/**
 * TRACEHAWK — Frontend API Client (Phase 4.3 Step 6).
 *
 * Provides typed interaction with the FastAPI backend endpoints.
 */

import { DomainInvestigationResponse } from '../types/domainInvestigation';

const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const API_BASE_URL =
  metaEnv?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Investigates a target domain by orchestrating DNS intelligence,
 * TLS certificate forensic auditing, and structured evidence synthesis.
 *
 * Calls POST /api/v1/investigate/domain
 */
export async function investigateDomain(
  domain: string,
  signal?: AbortSignal
): Promise<DomainInvestigationResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/investigate/domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain }),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err; // Allow caller to ignore intentional aborts
    }
    // Generic network error fallback that does not leak internal ports, hostnames, or sensitive configurations
    throw new Error(
      'Unable to connect to the backend service. Please verify network connectivity and that the service is running.'
    );
  }

  if (!response.ok) {
    let detailMessage = `Domain investigation failed with HTTP status ${response.status}.`;

    try {
      const errData = await response.json();
      if (typeof errData?.detail === 'string' && errData.detail.trim().length > 0) {
        const rawDetail = errData.detail.trim();
        // Never expose internal stack traces or exception dumps
        const isInternalDump =
          rawDetail.includes('Traceback') ||
          rawDetail.includes('Exception') ||
          rawDetail.includes('File "') ||
          rawDetail.includes('line ');

        if (!isInternalDump) {
          detailMessage = rawDetail;
        } else if (response.status === 500) {
          detailMessage =
            'Internal domain intelligence service failure. Please try again later.';
        }
      } else if (Array.isArray(errData?.detail) && errData.detail.length > 0) {
        // Handle FastAPI validation error structure (HTTP 422)
        const firstErr = errData.detail[0];
        if (typeof firstErr?.msg === 'string' && firstErr.msg.trim().length > 0) {
          detailMessage = firstErr.msg.trim();
        }
      } else {
        // Malformed or empty JSON error body fallbacks
        if (response.status === 400) {
          detailMessage =
            'Invalid domain format. Please enter a valid fully qualified domain name.';
        } else if (response.status === 500) {
          detailMessage =
            'Internal domain intelligence service failure. Please try again later.';
        }
      }
    } catch {
      // Non-JSON response body fallbacks
      if (response.status === 400) {
        detailMessage =
          'Invalid domain format. Please enter a valid fully qualified domain name.';
      } else if (response.status === 500) {
        detailMessage =
          'Internal domain intelligence service failure. Please try again later.';
      }
    }

    throw new Error(detailMessage);
  }

  return (await response.json()) as DomainInvestigationResponse;
}

/**
 * Health check query for backend availability monitoring.
 */
export async function checkHealth(signal?: AbortSignal): Promise<{ status: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET', signal });
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return (await res.json()) as { status: string };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error('Backend health service unreachable.');
  }
}
