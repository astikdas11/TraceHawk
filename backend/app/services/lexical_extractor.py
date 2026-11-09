"""
TRACEHAWK — Lexical Feature Extractor (Deprecated Compatibility Wrapper).
Delegates canonical feature extraction to backend.app.utils.feature_extractor.
Maintains backward compatibility for legacy callers.
"""

import warnings
from typing import Any

from ..utils.feature_extractor import (
    compute_shannon_entropy,
    extract_presentation_metadata,
    extract_url_only_features,
)


def calculate_shannon_entropy(text: str) -> float:
    """Calculate the Shannon entropy of a given character string."""
    return compute_shannon_entropy(text)


def extract_url_lexical_features(url: str) -> dict[str, Any]:
    """
    Deprecated: Extract lexical features from a raw URL string matching the PhiUSIIL schema.
    Delegates to canonical extract_url_only_features() and augments with presentation metrics.
    """
    warnings.warn(
        "extract_url_lexical_features is deprecated. Use backend.app.utils.feature_extractor.extract_url_only_features "
        "for model inference and extract_presentation_metadata for UI metrics.",
        DeprecationWarning,
        stacklevel=2,
    )

    # Use canonical extractor for the 19 production features
    canonical_features = extract_url_only_features(url)
    pres_meta = extract_presentation_metadata(url)

    # Combine canonical features with legacy presentation keys for full backward compatibility
    legacy_dict = dict(canonical_features)
    legacy_dict.update({
        "url": url,
        "domain": pres_meta["domain"],
        "tld": pres_meta["tld"],
        "shannon_entropy": pres_meta["shannon_entropy"],
        "IsPunycode": 1 if pres_meta["is_punycode"] else 0,
    })
    return legacy_dict
