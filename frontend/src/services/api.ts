/// <reference types="vite/client" />
/**
 * TRACEHAWK — Frontend API Client.
 *
 * Provides typed interaction with the FastAPI backend endpoints.
 * Supports relative same-origin API routing for unified Vercel deployments,
 * with standard localhost fallback for local development.
 */

import { DomainInvestigationResponse } from '../types/domainInvestigation';
import { UrlInvestigationResponse } from '../types/urlInvestigation';

/**
 * Resolves the API base URL:
 * - In production (`import.meta.env.PROD`), always defaults to an empty string ("")
 *   for same-origin relative paths (/api/...), ensuring seamless Vercel deployment
 *   without CORS, mixed-content, or localhost routing issues.
 * - In development (`import.meta.env.DEV`), allows `VITE_API_BASE_URL` override if specified,
 *   defaulting to standard local backend 'http://127.0.0.1:8000'.
 */
export const API_BASE_URL: string = (() => {
  if (import.meta.env.PROD) {
    // In production on Vercel, frontend and backend share the same origin.
    // Relative paths ensure seamless preview, branch, and production deployments.
    return '';
  }
  const devUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof devUrl === 'string' && devUrl.trim().length > 0) {
    return devUrl.trim().replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000';
})();

/**
 * Investigates a target URL via canonical Tier 1 feature extraction and ML model inference.
 *
 * Calls POST /api/v1/investigate/url
 */
export async function investigateUrl(
  url: string,
  thresholdMode: 'standard' | 'security_hardened' = 'standard',
  signal?: AbortSignal
): Promise<UrlInvestigationResponse> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('Please enter a target URL or domain name.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/investigate/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: cleanUrl,
        threshold_mode: thresholdMode,
      }),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err; // Allow caller to handle intentional aborts cleanly
    }
    throw new Error(
      'Unable to connect to the backend service. Please verify network connectivity and that the service is running.'
    );
  }

  if (!response.ok) {
    let detailMessage = `URL investigation failed with HTTP status ${response.status}.`;
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
          detailMessage = 'Internal URL investigation service failure. Please try again later.';
        }
      } else if (Array.isArray(errData?.detail) && errData.detail.length > 0) {
        // Handle FastAPI validation error structure (HTTP 422)
        const firstErr = errData.detail[0];
        if (typeof firstErr?.msg === 'string' && firstErr.msg.trim().length > 0) {
          detailMessage = firstErr.msg.trim();
        }
      } else {
        if (response.status === 400) {
          detailMessage = 'Invalid target URL. Please enter a valid URL or domain.';
        } else if (response.status === 503) {
          detailMessage = 'Inference service is currently unavailable. Production models are not initialized.';
        } else if (response.status === 500) {
          detailMessage = 'Internal URL investigation service failure. Please try again later.';
        }
      }
    } catch {
      if (response.status === 400) {
        detailMessage = 'Invalid target URL. Please enter a valid URL or domain.';
      } else if (response.status === 503) {
        detailMessage = 'Inference service is currently unavailable. Production models are not initialized.';
      } else if (response.status === 500) {
        detailMessage = 'Internal URL investigation service failure. Please try again later.';
      }
    }

    throw new Error(detailMessage);
  }

  return (await response.json()) as UrlInvestigationResponse;
}

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
  const cleanDomain = domain.trim();
  if (!cleanDomain) {
    throw new Error('Please enter a target domain name to investigate.');
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/investigate/domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: cleanDomain }),
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
