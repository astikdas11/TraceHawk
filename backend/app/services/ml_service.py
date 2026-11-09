"""
TRACEHAWK — Machine Learning & Investigation Orchestration Service.
Loads production model artifacts, evaluates model-estimated class probabilities,
applies validation-locked operating thresholds, and orchestrates multi-tiered investigations
with strict failure semantics and rigorous input validation.
"""

import hashlib
import json
import logging
import math
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ..core.config import settings
from ..schemas.prediction import InvestigationStatus, URLInferenceResponse
from ..utils.feature_extractor import extract_url_only_features

logger = logging.getLogger("tracehawk.services.ml")


def _validate_exact_threshold(raw_val: Any, expected: float, field_name: str, model_name: str) -> float:
    """
    Validate that threshold value is strictly numeric float/int, not a bool,
    finite (not NaN or inf), and exactly equal to expected value without rounding.
    """
    if isinstance(raw_val, bool):
        raise TypeError(f"{model_name} {field_name} must be float, got bool ({raw_val}).")
    if not isinstance(raw_val, (int, float, np.floating, np.integer)):
        raise TypeError(f"{model_name} {field_name} must be numeric float, got {type(raw_val).__name__} ({raw_val}).")

    val = float(raw_val)
    if math.isnan(val) or math.isinf(val):
        raise ValueError(f"{model_name} {field_name} must be a finite number, got {val}.")

    if val != expected:
        raise ValueError(f"{model_name} {field_name} must be exactly {expected}, got {raw_val}.")

    return val


def _compute_sha256(path: Path) -> str:
    """Calculate SHA256 hex digest of a file on disk without modifying it."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

# Frozen Phase 3 Feature Schemas
TIER1_CANONICAL_FEATURES = [
    "URLLength",
    "DomainLength",
    "IsDomainIP",
    "TLD",
    "TLDLength",
    "NoOfSubDomain",
    "HasObfuscation",
    "NoOfObfuscatedChar",
    "ObfuscationRatio",
    "NoOfLettersInURL",
    "LetterRatioInURL",
    "NoOfDegitsInURL",
    "DegitRatioInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
    "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL",
    "SpacialCharRatioInURL",
    "IsHTTPS",
]

TIER2_CANONICAL_FEATURES = [
    "URLLength",
    "DomainLength",
    "IsDomainIP",
    "TLD",
    "TLDLength",
    "NoOfSubDomain",
    "HasObfuscation",
    "NoOfObfuscatedChar",
    "ObfuscationRatio",
    "NoOfLettersInURL",
    "LetterRatioInURL",
    "NoOfDegitsInURL",
    "DegitRatioInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
    "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL",
    "SpacialCharRatioInURL",
    "IsHTTPS",
    "LineOfCode",
    "LargestLineLength",
    "HasTitle",
    "DomainTitleMatchScore",
    "URLTitleMatchScore",
    "HasFavicon",
    "Robots",
    "IsResponsive",
    "NoOfURLRedirect",
    "NoOfSelfRedirect",
    "HasDescription",
    "NoOfPopup",
    "NoOfiFrame",
    "HasExternalFormSubmit",
    "HasSocialNet",
    "HasSubmitButton",
    "HasHiddenFields",
    "HasPasswordField",
    "Bank",
    "Pay",
    "Crypto",
    "HasCopyrightInfo",
    "NoOfImage",
    "NoOfCSS",
    "NoOfJS",
    "NoOfSelfRef",
    "NoOfEmptyRef",
    "NoOfExternalRef",
]

# Canonical feature categorizations according to frozen Phase 3 schema
# Note on NoOfURLRedirect and NoOfSelfRedirect:
# Empirical verification of the authoritative frozen training dataset
# (data/raw/PhiUSIIL_Phishing_URL_Dataset.csv, exactly 235,795 rows) confirms that:
# - NoOfURLRedirect contains strictly binary values {0, 1}: 204,331 rows = 0, 31,464 rows = 1.
# - NoOfSelfRedirect contains strictly binary values {0, 1}: 226,338 rows = 0, 9,457 rows = 1.
# Both features were trained as binary flags in Phase 3 despite the 'NoOf...' prefix.
# Their categorization under BINARY_FEATURES is empirically verified and preserved.
BINARY_FEATURES = {
    # Tier 1
    "IsDomainIP",
    "HasObfuscation",
    "IsHTTPS",
    # Tier 2 additions
    "HasTitle",
    "HasFavicon",
    "Robots",
    "IsResponsive",
    "NoOfURLRedirect",
    "NoOfSelfRedirect",
    "HasDescription",
    "HasExternalFormSubmit",
    "HasSocialNet",
    "HasSubmitButton",
    "HasHiddenFields",
    "HasPasswordField",
    "Bank",
    "Pay",
    "Crypto",
    "HasCopyrightInfo",
}

RATIO_FEATURES = {
    "ObfuscationRatio",
    "LetterRatioInURL",
    "DegitRatioInURL",
    "SpacialCharRatioInURL",
}

SCORE_FEATURES = {
    "DomainTitleMatchScore",
    "URLTitleMatchScore",
}

COUNT_FEATURES = {
    "URLLength",
    "DomainLength",
    "TLDLength",
    "NoOfSubDomain",
    "NoOfObfuscatedChar",
    "NoOfLettersInURL",
    "NoOfDegitsInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
    "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL",
    "LineOfCode",
    "LargestLineLength",
    "NoOfPopup",
    "NoOfiFrame",
    "NoOfImage",
    "NoOfCSS",
    "NoOfJS",
    "NoOfSelfRef",
    "NoOfEmptyRef",
    "NoOfExternalRef",
}


class MLService:
    def __init__(self):
        self.url_model = None
        self.full_model = None
        self.metadata: dict[str, Any] = {}
        self.is_loaded = False
        self.load_error: str | None = None
        self.tier2_metadata_valid = True
        self.tier2_load_error: str | None = None
        self._load_metadata_and_models()

    @staticmethod
    def _validate_model_classes(classes: Any, model_name: str = "Model") -> None:
        """
        Verify that model exposes classes_ attribute matching exactly [0, 1].
        Rejects missing classes, reversed classes ([1, 0]), extra classes ([0, 1, 2]),
        boolean class labels ([False, True]), fractional/floating numeric labels ([0.5, 1.5]),
        and strings or unexpected types.
        """
        if classes is None:
            raise ValueError(f"{model_name} classes_ attribute is missing.")

        try:
            class_list = list(classes)
        except TypeError as err:
            raise ValueError(f"{model_name} classes_ is not iterable: {classes}") from err

        if len(class_list) != 2:
            raise ValueError(
                f"{model_name} classes_ must be exactly [0, 1], got length {len(class_list)}: {class_list}"
            )

        for c in class_list:
            if isinstance(c, bool):
                raise TypeError(f"{model_name} classes_ contains boolean label: {c}")
            if isinstance(c, (float, np.floating)):
                raise TypeError(f"{model_name} classes_ contains floating/fractional label: {c}")
            if not isinstance(c, (int, np.integer)):
                raise ValueError(f"{model_name} classes_ contains non-integer values: {c}")  # noqa: TRY004

        if int(class_list[0]) != 0 or int(class_list[1]) != 1:
            raise ValueError(
                f"{model_name} classes_ must be exactly [0, 1], got {class_list}."
            )

    @staticmethod
    def _validate_predict_proba_output(probs: Any, tier_name: str) -> tuple[float, float]:
        """
        Validate predict_proba() output array:
        - Must be a 2D array-like with shape (1, 2)
        - Must contain finite numeric values (no NaN, no Inf)
        - Probabilities must be within [0.0, 1.0]
        - Binary probabilities must sum to 1.0 (within 1e-3 float tolerance)
        Returns (prob_benign, prob_malicious).
        """
        if not hasattr(probs, "shape") or probs.shape != (1, 2):
            shape_desc = getattr(probs, "shape", type(probs).__name__)
            raise ValueError(f"{tier_name} predict_proba returned unexpected output shape {shape_desc}, expected (1, 2).")

        if not np.all(np.isfinite(probs)):
            raise ValueError(f"{tier_name} predict_proba returned non-finite values (NaN or Inf).")

        prob_benign = float(probs[0, 0])
        prob_malicious = float(probs[0, 1])

        if not (0.0 <= prob_benign <= 1.0 and 0.0 <= prob_malicious <= 1.0):
            raise ValueError(
                f"{tier_name} predict_proba returned probability out of bounds [0.0, 1.0]: [{prob_benign}, {prob_malicious}]."
            )

        if abs((prob_benign + prob_malicious) - 1.0) > 1e-3:
            raise ValueError(
                f"{tier_name} predict_proba probabilities do not sum to 1.0: "
                f"{prob_benign} + {prob_malicious} = {prob_benign + prob_malicious:.4f}."
            )

        return prob_benign, prob_malicious

    def _validate_tier1_metadata(self, meta: dict[str, Any]) -> None:
        """Strictly validate core and Tier 1 candidate metadata section."""
        if not isinstance(meta, dict):
            raise TypeError(f"Metadata must be a dictionary, got {type(meta).__name__}")

        model_version = meta.get("model_version")
        if not model_version or not isinstance(model_version, str) or not model_version.strip():
            raise ValueError("Metadata is missing a valid 'model_version' string.")

        labels = meta.get("canonical_labels")
        if not isinstance(labels, dict) or labels.get("0") != "BENIGN" or labels.get("1") != "MALICIOUS":
            raise ValueError(f"Metadata canonical_labels must map '0': 'BENIGN' and '1': 'MALICIOUS', got {labels}")

        if "models" not in meta or not isinstance(meta["models"], dict):
            raise KeyError("Metadata JSON is missing required 'models' configuration section.")

        t1_meta = meta["models"].get("url_only_candidate")
        if not t1_meta or not isinstance(t1_meta, dict):
            raise KeyError("Metadata missing required model key 'url_only_candidate'.")
        if t1_meta.get("feature_count") != 19:
            raise ValueError(f"Tier 1 feature_count must be exactly 19, got {t1_meta.get('feature_count')}")
        t1_order = t1_meta.get("feature_names_and_order")
        if not isinstance(t1_order, list) or len(t1_order) != 19 or t1_meta.get("feature_count") != len(t1_order):
            raise ValueError(
                f"Tier 1 feature_count ({t1_meta.get('feature_count')}) does not match length of "
                f"feature_names_and_order ({len(t1_order) if isinstance(t1_order, list) else type(t1_order).__name__})."
            )
        if t1_order != TIER1_CANONICAL_FEATURES:
            raise ValueError("Tier 1 feature_names_and_order does not match frozen Phase 3 schema.")
        t1_thresh = t1_meta.get("locked_operating_threshold", {})
        _validate_exact_threshold(t1_thresh.get("standard_threshold"), 0.50, "standard_threshold", "Tier 1")
        _validate_exact_threshold(t1_thresh.get("security_hardened_threshold"), 0.40, "security_hardened_threshold", "Tier 1")
        t1_sha = t1_meta.get("production_artifact_sha256")
        if not t1_sha or not isinstance(t1_sha, str) or len(t1_sha) != 64:
            raise ValueError("Tier 1 metadata missing or malformed 'production_artifact_sha256'.")
        if t1_meta.get("training_artifact_sha256") != t1_sha:
            raise ValueError("Tier 1 training and production artifact SHA256 hashes do not match.")
        if t1_meta.get("provenance_byte_identical") is not True:
            raise ValueError("Tier 1 provenance_byte_identical must be True.")

    def _validate_tier2_metadata(self, meta: dict[str, Any]) -> None:
        """Validate Tier 2 candidate metadata section."""
        if "models" not in meta or not isinstance(meta["models"], dict):
            raise KeyError("Metadata JSON is missing required 'models' configuration section.")

        t2_meta = meta["models"].get("full_webpage_candidate")
        if not t2_meta or not isinstance(t2_meta, dict):
            raise KeyError("Metadata missing required model key 'full_webpage_candidate'.")
        if t2_meta.get("feature_count") != 47:
            raise ValueError(f"Tier 2 feature_count must be exactly 47, got {t2_meta.get('feature_count')}")
        t2_order = t2_meta.get("feature_names_and_order")
        if not isinstance(t2_order, list) or len(t2_order) != 47 or t2_meta.get("feature_count") != len(t2_order):
            raise ValueError(
                f"Tier 2 feature_count ({t2_meta.get('feature_count')}) does not match length of "
                f"feature_names_and_order ({len(t2_order) if isinstance(t2_order, list) else type(t2_order).__name__})."
            )
        if t2_order != TIER2_CANONICAL_FEATURES:
            raise ValueError("Tier 2 feature_names_and_order does not match frozen Phase 3 schema.")
        t2_thresh = t2_meta.get("locked_operating_threshold", {})
        _validate_exact_threshold(t2_thresh.get("standard_threshold"), 0.50, "standard_threshold", "Tier 2")
        _validate_exact_threshold(t2_thresh.get("security_hardened_threshold"), 0.15, "security_hardened_threshold", "Tier 2")
        t2_sha = t2_meta.get("production_artifact_sha256")
        if not t2_sha or not isinstance(t2_sha, str) or len(t2_sha) != 64:
            raise ValueError("Tier 2 metadata has missing or malformed production_artifact_sha256.")
        if t2_meta.get("training_artifact_sha256") != t2_sha:
            raise ValueError("Tier 2 training and production artifact SHA256 hashes do not match.")
        if t2_meta.get("provenance_byte_identical") is not True:
            raise ValueError("Tier 2 provenance_byte_identical must be True.")

    def _validate_metadata(self, meta: dict[str, Any]) -> None:
        """Strictly validate frozen model metadata for both tiers against Phase 3 governance rules."""
        self._validate_tier1_metadata(meta)
        self._validate_tier2_metadata(meta)

    def _load_metadata_and_models(self):
        """
        Load production model artifacts and governance metadata with independent validation.
        Missing or corrupt metadata or Tier 1 model must prevent silent fake predictions.
        Tier 2 metadata/provenance failures degrade gracefully without taking Tier 1 offline.
        Paths are resolved via settings helpers, ensuring consistent resolution whether
        launched from the repository root, backend/, or via absolute environment variables.
        """
        meta_path = settings.get_model_metadata_path()
        url_path = settings.get_url_only_model_path()
        full_path = settings.get_full_webpage_model_path()

        # 1. Load and validate metadata
        if not meta_path.exists():
            self.load_error = f"Model metadata file missing at {meta_path}."
            logger.error(self.load_error)
            self.metadata = {}
        else:
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)

                # Strictly validate core & Tier 1 candidate metadata (must succeed for ML service to start)
                self._validate_tier1_metadata(meta)
                self.metadata = meta
                logger.info("Loaded and verified core and Tier 1 model metadata from %s", meta_path)

                # Validate Tier 2 metadata independently (supports graceful degradation if Tier 2 metadata/provenance fails)
                try:
                    self._validate_tier2_metadata(meta)
                    self.tier2_metadata_valid = True
                except Exception as t2_err:  # noqa: BLE001
                    self.tier2_metadata_valid = False
                    self.tier2_load_error = f"Tier 2 metadata validation failed: {t2_err}"
                    logger.warning("Tier 2 metadata validation failed: %s; Tier 2 will be unavailable.", t2_err)

            except Exception as e:  # noqa: BLE001
                self.load_error = f"Failed to load or parse model metadata: {e}"
                logger.error(self.load_error)
                self.metadata = {}

        # 2. Load and validate Tier 1 (URL-Only) Model
        if not url_path.exists():
            err = f"Tier 1 model artifact missing at {url_path}."
            self.load_error = (self.load_error + "; " + err) if self.load_error else err
            logger.error(err)
            self.url_model = None
        else:
            try:
                declared_t1_hash = (
                    self.metadata.get("models", {})
                    .get("url_only_candidate", {})
                    .get("production_artifact_sha256")
                )
                if not declared_t1_hash or not isinstance(declared_t1_hash, str) or len(declared_t1_hash) != 64:
                    raise ValueError(
                        f"Tier 1 metadata missing or malformed production_artifact_sha256: {declared_t1_hash}"
                    )

                actual_t1_hash = _compute_sha256(url_path)
                if actual_t1_hash.lower() != declared_t1_hash.lower():
                    raise ValueError(
                        f"Tier 1 model artifact SHA256 mismatch: expected {declared_t1_hash}, got {actual_t1_hash}"
                    )

                model = joblib.load(url_path)
                classes = getattr(model, "classes_", None)
                self._validate_model_classes(classes, "Tier 1 URL-only model")
                self.url_model = model
                logger.info("Tier 1 URL-only model loaded and verified from %s", url_path)
            except Exception as e:  # noqa: BLE001
                err = f"Failed to load Tier 1 model artifact: {e}"
                self.load_error = (self.load_error + "; " + err) if self.load_error else err
                logger.error(err)
                self.url_model = None

        # 3. Load and validate Tier 2 (Full Webpage) Model
        if not full_path.exists():
            logger.warning("Tier 2 model artifact missing at %s; Tier 2 inference will be unavailable.", full_path)
            self.full_model = None
        elif not self.tier2_metadata_valid:
            logger.warning("Tier 2 metadata is invalid (%s); Tier 2 inference will be unavailable.", self.tier2_load_error)
            self.full_model = None
        else:
            try:
                declared_t2_hash = (
                    self.metadata.get("models", {})
                    .get("full_webpage_candidate", {})
                    .get("production_artifact_sha256")
                )
                if not declared_t2_hash or not isinstance(declared_t2_hash, str) or len(declared_t2_hash) != 64:
                    raise ValueError(
                        f"Tier 2 metadata missing or malformed production_artifact_sha256: {declared_t2_hash}"
                    )

                actual_t2_hash = _compute_sha256(full_path)
                if actual_t2_hash.lower() != declared_t2_hash.lower():
                    raise ValueError(
                        f"Tier 2 model artifact SHA256 mismatch: expected {declared_t2_hash}, got {actual_t2_hash}"
                    )

                model = joblib.load(full_path)
                classes = getattr(model, "classes_", None)
                self._validate_model_classes(classes, "Tier 2 Full Webpage model")
                self.full_model = model
                logger.info("Tier 2 Full Webpage model loaded and verified from %s", full_path)
            except Exception as e:  # noqa: BLE001
                logger.warning("Failed to load Tier 2 model artifact: %s", e)
                self.full_model = None

        self.is_loaded = bool(self.url_model is not None and self.metadata and not self.load_error)

    def check_readiness(self) -> dict[str, Any]:
        """
        Verify that production inference dependencies are ready.
        Raises RuntimeError if required Tier 1 model or metadata is missing/corrupted.
        Explicitly reports whether Tier 2 model is available.
        """
        if not self.is_loaded or self.url_model is None or not self.metadata:
            raise RuntimeError(f"ML Service is not ready: {self.load_error or 'Dependencies uninitialized'}")

        model_version = self.metadata.get("model_version")
        if not model_version:
            raise RuntimeError("Model metadata is missing required 'model_version' field.")

        tier2_available = bool(self.full_model is not None and self.tier2_metadata_valid)
        return {
            "status": "ready",
            "ready": True,
            "tier1_model": "loaded",
            "tier2_model": "loaded" if tier2_available else "unavailable",
            "tier2_available": tier2_available,
            "metadata": "loaded",
            "model_version": model_version,
        }

    def get_threshold(self, tier: str, mode: str = "standard") -> float:
        """
        Retrieve and validate operating threshold from metadata configuration.
        Raises ValueError, TypeError, or KeyError on invalid tier, mode, or threshold values.
        """
        if not isinstance(tier, str):
            raise TypeError(f"tier argument must be a string, got {type(tier).__name__}")
        if not tier.strip():
            raise ValueError("tier argument cannot be empty or whitespace.")
        if not isinstance(mode, str):
            raise TypeError(f"mode argument must be a string, got {type(mode).__name__}")
        if not mode.strip():
            raise ValueError("mode argument cannot be empty or whitespace.")

        if not self.metadata or "models" not in self.metadata:
            raise KeyError("Production metadata not loaded or missing 'models' configuration.")

        tier_norm = tier.strip().lower()
        if tier_norm in ("tier1", "url_only"):
            model_key = "url_only_candidate"
        elif tier_norm in ("tier2", "full_webpage"):
            model_key = "full_webpage_candidate"
        else:
            raise ValueError(f"Invalid model tier '{tier}'. Expected 'tier1' (url_only) or 'tier2' (full_webpage).")

        mode_norm = mode.strip().lower()
        if mode_norm == "standard":
            threshold_field = "standard_threshold"
        elif mode_norm in ("security", "security_hardened"):
            threshold_field = "security_hardened_threshold"
        else:
            raise ValueError(f"Invalid threshold mode '{mode}'. Expected 'standard' or 'security' ('security_hardened').")

        if model_key not in self.metadata["models"]:
            raise KeyError(f"Candidate model key '{model_key}' missing from metadata.")

        meta_entry = self.metadata["models"][model_key]
        if "locked_operating_threshold" not in meta_entry:
            raise KeyError(f"locked_operating_threshold missing for '{model_key}'.")

        thresh_cfg = meta_entry["locked_operating_threshold"]
        if threshold_field not in thresh_cfg:
            raise KeyError(f"Threshold field '{threshold_field}' missing in metadata for '{model_key}'.")

        raw_val = thresh_cfg[threshold_field]
        if raw_val is None:
            raise ValueError(f"Threshold value for '{threshold_field}' is null in metadata.")
        if isinstance(raw_val, bool):
            raise TypeError(f"Threshold value for '{threshold_field}' must be float, got bool ({raw_val}).")
        if not isinstance(raw_val, (int, float, np.floating, np.integer)):
            raise ValueError(f"Non-numeric threshold value '{raw_val}' for '{model_key}': expected numeric float.")  # noqa: TRY004

        val = float(raw_val)
        if math.isnan(val) or math.isinf(val):
            raise ValueError(f"Threshold value for '{threshold_field}' must be a finite number, got {val}.")

        if not (0.0 <= val <= 1.0):
            raise ValueError(f"Operating threshold {val} out of valid range [0.0, 1.0].")

        expected_map = {
            ("url_only_candidate", "standard_threshold"): 0.50,
            ("url_only_candidate", "security_hardened_threshold"): 0.40,
            ("full_webpage_candidate", "standard_threshold"): 0.50,
            ("full_webpage_candidate", "security_hardened_threshold"): 0.15,
        }
        expected = expected_map.get((model_key, threshold_field))
        if expected is not None and val != expected:
            raise ValueError(f"Operating threshold for '{model_key}.{threshold_field}' must be exactly {expected}, got {val}.")

        return val

    def _validate_tier1_features(self, features: dict[str, Any], feature_names: list[str]) -> dict[str, Any]:
        """Validate input features for Tier 1 inference strictly."""
        if not isinstance(features, dict):
            raise TypeError(f"Features input must be a dictionary, got {type(features).__name__}")

        # Check for missing features
        missing = [col for col in feature_names if col not in features]
        if missing:
            raise ValueError(f"Missing required Tier 1 features: {missing}")

        # Check for null / None values
        null_cols = [col for col in feature_names if features[col] is None]
        if null_cols:
            raise ValueError(f"Features contain null/None values for: {null_cols}")

        validated: dict[str, Any] = {}

        # Validate TLD representation
        tld_val = features["TLD"]
        if not isinstance(tld_val, str):
            raise TypeError(f"Feature 'TLD' must be a str, got {type(tld_val).__name__} ({tld_val})")
        if not tld_val.strip():
            raise ValueError("Feature 'TLD' cannot be empty or whitespace.")
        validated["TLD"] = str(tld_val).strip()

        # Validate numeric features
        for col in feature_names:
            if col == "TLD":
                continue
            val = features[col]

            if isinstance(val, bool):
                if col in BINARY_FEATURES:
                    val = int(val)
                else:
                    raise TypeError(f"Feature '{col}' must be numeric (int/float), got bool ({val}).")

            if not isinstance(val, (int, float)):
                raise TypeError(f"Feature '{col}' must be numeric (int/float), got {type(val).__name__} ({val}).")

            if math.isnan(val) or math.isinf(val):
                raise ValueError(f"Feature '{col}' cannot be NaN or Infinite.")

            if col in BINARY_FEATURES:
                if val not in (0, 1):
                    raise ValueError(f"Binary flag '{col}' must be 0 or 1, got {val}")
            elif col in RATIO_FEATURES:
                if not (0.0 <= val <= 1.05):
                    raise ValueError(f"Ratio feature '{col}' must be within [0.0, 1.0], got {val}")
            elif col in COUNT_FEATURES:
                if val < 0:
                    raise ValueError(f"Feature '{col}' cannot be negative, got {val}")
            else:
                if val < 0:
                    raise ValueError(f"Feature '{col}' cannot be negative, got {val}")

            validated[col] = val

        return {col: validated[col] for col in feature_names}

    def _validate_tier2_features(self, features: dict[str, Any], feature_names: list[str]) -> dict[str, Any]:
        """Validate input features for Tier 2 inference strictly according to frozen schema."""
        if not isinstance(features, dict):
            raise TypeError(f"Features input must be a dictionary, got {type(features).__name__}")

        missing = [col for col in feature_names if col not in features]
        if missing:
            raise ValueError(f"Missing required Tier 2 features: {missing}")

        null_cols = [col for col in feature_names if features[col] is None]
        if null_cols:
            raise ValueError(f"Features contain null/None values for: {null_cols}")

        validated: dict[str, Any] = {}

        tld_val = features["TLD"]
        if not isinstance(tld_val, str):
            raise TypeError(f"Feature 'TLD' must be a str, got {type(tld_val).__name__} ({tld_val})")
        if not tld_val.strip():
            raise ValueError("Feature 'TLD' cannot be empty or whitespace.")
        validated["TLD"] = str(tld_val).strip()

        for col in feature_names:
            if col == "TLD":
                continue
            val = features[col]

            if isinstance(val, bool):
                if col in BINARY_FEATURES:
                    val = int(val)
                else:
                    raise TypeError(f"Feature '{col}' must be numeric (int/float), got bool ({val}).")

            if not isinstance(val, (int, float)):
                raise TypeError(f"Feature '{col}' must be numeric (int/float), got {type(val).__name__} ({val}).")

            if math.isnan(val) or math.isinf(val):
                raise ValueError(f"Feature '{col}' cannot be NaN or Infinite.")

            if col in BINARY_FEATURES:
                if val not in (0, 1):
                    raise ValueError(f"Binary feature '{col}' must be 0 or 1, got {val}")
            elif col in RATIO_FEATURES:
                if not (0.0 <= val <= 1.05):
                    raise ValueError(f"Ratio feature '{col}' must be within [0.0, 1.0], got {val}")
            elif col in SCORE_FEATURES:
                if not (0.0 <= val <= 100.05):
                    raise ValueError(f"Score feature '{col}' must be within [0.0, 100.0], got {val}")
            elif col in COUNT_FEATURES:
                if val < 0:
                    raise ValueError(f"Count feature '{col}' cannot be negative, got {val}")
            else:
                if val < 0:
                    raise ValueError(f"Feature '{col}' cannot be negative, got {val}")

            validated[col] = val

        return {col: validated[col] for col in feature_names}

    def predict_tier1(self, features: dict[str, Any], threshold_mode: str = "standard") -> dict[str, Any]:
        """
        Evaluate model-estimated class probabilities and predicted malicious-class probability to apply threshold for Tier 1 (URL-Only).
        Calls actual predict_proba() and retrieves malicious probability from index 1.
        """
        if not isinstance(threshold_mode, str):
            raise TypeError(f"threshold_mode argument must be a string, got {type(threshold_mode).__name__}")
        if not threshold_mode.strip():
            raise ValueError("threshold_mode argument cannot be empty or whitespace.")

        if not self.is_loaded or self.url_model is None or not self.metadata:
            raise RuntimeError(f"Tier 1 URL-only model artifact is not loaded: {self.load_error or 'Service uninitialized'}")

        threshold = self.get_threshold("tier1", mode=threshold_mode)
        feature_names = self.metadata["models"]["url_only_candidate"]["feature_names_and_order"]
        row = self._validate_tier1_features(features, feature_names)

        df = pd.DataFrame([row], columns=feature_names)

        classes = getattr(self.url_model, "classes_", None)
        try:
            self._validate_model_classes(classes, "Tier 1 URL-only model")
        except (ValueError, TypeError) as err:
            raise RuntimeError(f"Model classes_ verification failed: {err}") from err

        probs = self.url_model.predict_proba(df)
        prob_benign, prob_malicious = self._validate_predict_proba_output(probs, "Tier 1 URL-only model")
        is_malicious = bool(prob_malicious >= threshold)

        return {
            "tier": "tier1",
            "prob_malicious": prob_malicious,
            "prob_benign": prob_benign,
            "threshold": threshold,
            "threshold_mode": threshold_mode,
            "is_malicious": is_malicious,
            "risk_score": round(prob_malicious * 100, 2),
            "features": row,
        }

    def predict_tier2(self, features: dict[str, Any], threshold_mode: str = "standard") -> dict[str, Any]:
        """
        Evaluate model-estimated class probabilities and predicted malicious-class probability to apply threshold for Tier 2 (Full Webpage).
        Calls actual predict_proba() and retrieves malicious probability from index 1.
        """
        if not isinstance(threshold_mode, str):
            raise TypeError(f"threshold_mode argument must be a string, got {type(threshold_mode).__name__}")
        if not threshold_mode.strip():
            raise ValueError("threshold_mode argument cannot be empty or whitespace.")

        if self.full_model is None or not self.metadata or not self.tier2_metadata_valid:
            raise RuntimeError(
                f"Tier 2 Full Webpage model artifact is not loaded: {self.tier2_load_error or self.load_error or 'Service uninitialized'}"
            )

        threshold = self.get_threshold("tier2", mode=threshold_mode)
        feature_names = self.metadata["models"]["full_webpage_candidate"]["feature_names_and_order"]
        row = self._validate_tier2_features(features, feature_names)

        df = pd.DataFrame([row], columns=feature_names)

        classes = getattr(self.full_model, "classes_", None)
        try:
            self._validate_model_classes(classes, "Tier 2 Full Webpage model")
        except (ValueError, TypeError) as err:
            raise RuntimeError(f"Model classes_ verification failed: {err}") from err

        probs = self.full_model.predict_proba(df)
        prob_benign, prob_malicious = self._validate_predict_proba_output(probs, "Tier 2 Full Webpage model")
        is_malicious = bool(prob_malicious >= threshold)

        return {
            "tier": "tier2",
            "prob_malicious": prob_malicious,
            "prob_benign": prob_benign,
            "threshold": threshold,
            "threshold_mode": threshold_mode,
            "is_malicious": is_malicious,
            "risk_score": round(prob_malicious * 100, 2),
            "features": row,
        }

    def orchestrate_investigation(
        self,
        url: str,
        tier: str = "tier1",
        threshold_mode: str = "standard",
        webpage_evidence: dict[str, Any] | None = None,
        collection_error: str | None = None,
        html_content: str | None = None,
        parser_error: bool = False,
    ) -> URLInferenceResponse:
        """
        Orchestrate multi-tiered URL investigation.
        Always executes Tier 1 offline analysis.
        If Tier 2 is requested:
          - If collection fails: marks COLLECTION_FAILED, preserves Tier 1 finding, never returns benign.
          - If HTML is empty: marks INCONCLUSIVE, preserves Tier 1 finding.
          - If parser fails or required features missing: marks PARTIAL_ANALYSIS.
          - If all 47 features complete: evaluates Tier 2 model.
        """
        if not isinstance(url, str):
            raise TypeError(f"url argument must be a string, got {type(url).__name__}")
        if not url.strip():
            raise ValueError("url argument cannot be empty or whitespace.")
        if not isinstance(tier, str):
            raise TypeError(f"tier argument must be a string, got {type(tier).__name__}")
        if not tier.strip():
            raise ValueError("tier argument cannot be empty or whitespace.")
        if not isinstance(threshold_mode, str):
            raise TypeError(f"threshold_mode argument must be a string, got {type(threshold_mode).__name__}")
        if not threshold_mode.strip():
            raise ValueError("threshold_mode argument cannot be empty or whitespace.")

        tier_norm = tier.strip().lower()
        if tier_norm not in ("tier1", "url_only", "tier2", "full_webpage"):
            raise ValueError(f"Invalid tier '{tier}'. Expected 'tier1' (url_only) or 'tier2' (full_webpage).")

        t0 = time.perf_counter()
        reasons = []

        # Validate that production metadata contains an authentic model_version
        if not self.metadata or not self.metadata.get("model_version"):
            raise RuntimeError("Model metadata is missing or does not contain a valid 'model_version'.")
        model_version = self.metadata["model_version"]

        # 1. Tier 1 Offline Extraction & Inference (Always succeeds offline)
        url_features = extract_url_only_features(url)
        tier1_result = self.predict_tier1(url_features, threshold_mode=threshold_mode)

        tier1_finding = {
            "prob_malicious": tier1_result["prob_malicious"],
            "risk_score": tier1_result["risk_score"],
            "is_malicious": tier1_result["is_malicious"],
            "threshold": tier1_result["threshold"],
            "threshold_mode": threshold_mode,
        }

        # If user explicitly requested Tier 1 only:
        if tier_norm in ("tier1", "url_only"):
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            risk_level = self._compute_risk_level(tier1_result["risk_score"])
            risk_label = self._compute_risk_label(tier1_result["risk_score"])
            if tier1_result["is_malicious"]:
                reasons.append(
                    f"Offline lexical indicators exceeded operational threshold {tier1_result['threshold']:.2f} "
                    f"(Score: {tier1_result['risk_score']})."
                )
            else:
                reasons.append(
                    f"Observed offline lexical indicators remain below the operational decision threshold of "
                    f"{tier1_result['threshold']:.2f}. Results below threshold do not establish that the website is safe."
                )

            return URLInferenceResponse(
                url=url,
                risk_score=tier1_result["risk_score"],
                risk_level=risk_level,
                risk_label=risk_label,
                is_malicious=tier1_result["is_malicious"],
                investigation_status=InvestigationStatus.ANALYSIS_COMPLETE,
                full_webpage_completed=False,
                tier_used="tier1",
                model_version=model_version,
                latency_ms=elapsed_ms,
                reasons=reasons,
                extracted_features=url_features,
                tier1_finding=tier1_finding,
            )

        # 2. Tier 2 Full Webpage Investigation
        # Scenario A: Webpage collection failed (network timeout, DNS failure, connection refused)
        if collection_error:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            reasons.append(f"Webpage collection failed: {collection_error}.")
            reasons.append("Full webpage inspection could not be completed; defaulting to Tier 1 offline findings.")

            risk_score = tier1_result["risk_score"]
            is_malicious = tier1_result["is_malicious"]
            risk_level = self._compute_risk_level(risk_score) if is_malicious else "SUSPICIOUS"
            risk_label = self._compute_risk_label(risk_score) if is_malicious else "Suspicious"

            return URLInferenceResponse(
                url=url,
                risk_score=risk_score,
                risk_level=risk_level,
                risk_label=risk_label,
                is_malicious=is_malicious,
                investigation_status=InvestigationStatus.COLLECTION_FAILED,
                full_webpage_completed=False,
                tier_used="tier1_fallback",
                model_version=model_version,
                latency_ms=elapsed_ms,
                reasons=reasons,
                extracted_features=url_features,
                tier1_finding=tier1_finding,
            )

        # Scenario B: Empty HTML retrieved or unparseable payload
        if html_content is not None and not html_content.strip():
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            reasons.append("Retrieved webpage contained empty HTML body.")
            reasons.append("DOM evidence is inconclusive; full webpage analysis could not complete.")

            return URLInferenceResponse(
                url=url,
                risk_score=tier1_result["risk_score"],
                risk_level="SUSPICIOUS" if not tier1_result["is_malicious"] else "HIGH_RISK",
                risk_label="Suspicious" if not tier1_result["is_malicious"] else "High Risk",
                is_malicious=tier1_result["is_malicious"],
                investigation_status=InvestigationStatus.INCONCLUSIVE,
                full_webpage_completed=False,
                tier_used="tier1_fallback",
                model_version=model_version,
                latency_ms=elapsed_ms,
                reasons=reasons,
                extracted_features=url_features,
                tier1_finding=tier1_finding,
            )

        # Scenario C: HTML parser crash
        if parser_error:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            reasons.append("HTML parser failure: DOM structural elements could not be parsed.")
            reasons.append("Partial analysis completed; remaining attributes unverified.")

            return URLInferenceResponse(
                url=url,
                risk_score=tier1_result["risk_score"],
                risk_level="SUSPICIOUS" if not tier1_result["is_malicious"] else "HIGH_RISK",
                risk_label="Suspicious" if not tier1_result["is_malicious"] else "High Risk",
                is_malicious=tier1_result["is_malicious"],
                investigation_status=InvestigationStatus.PARTIAL_ANALYSIS,
                full_webpage_completed=False,
                tier_used="tier1_partial",
                model_version=model_version,
                latency_ms=elapsed_ms,
                reasons=reasons,
                extracted_features=url_features,
                tier1_finding=tier1_finding,
            )

        # Tier 2 Availability Guard (before processing webpage evidence):
        # If Tier 2 metadata is invalid or the Tier 2 model is unavailable,
        # preserve the Tier 1 result and return a controlled fallback instead of attempting Tier 2 inference.
        if self.full_model is None or not self.tier2_metadata_valid:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            guard_reason = self.tier2_load_error or "Tier 2 model artifact or metadata is unavailable."
            reasons.append(f"Tier 2 full webpage investigation unavailable: {guard_reason}")
            reasons.append("Defaulting to Tier 1 offline findings.")

            risk_score = tier1_result["risk_score"]
            is_malicious = tier1_result["is_malicious"]
            risk_level = self._compute_risk_level(risk_score) if is_malicious else "SUSPICIOUS"
            risk_label = self._compute_risk_label(risk_score) if is_malicious else "Suspicious"

            return URLInferenceResponse(
                url=url,
                risk_score=risk_score,
                risk_level=risk_level,
                risk_label=risk_label,
                is_malicious=is_malicious,
                investigation_status=InvestigationStatus.PARTIAL_ANALYSIS,
                full_webpage_completed=False,
                tier_used="tier1_fallback",
                model_version=model_version,
                latency_ms=elapsed_ms,
                reasons=reasons,
                extracted_features=url_features,
                tier1_finding=tier1_finding,
            )

        # Scenario D: Webpage Evidence Completeness Verification (Derived from Metadata)
        # Tier 2 requires all 47 features (19 Set A + 28 Set B webpage features)
        if webpage_evidence is not None:
            full_feature_names = self.metadata["models"]["full_webpage_candidate"]["feature_names_and_order"]
            url_feature_names = self.metadata["models"]["url_only_candidate"]["feature_names_and_order"]
            required_webpage_features = [f for f in full_feature_names if f not in url_feature_names]

            # Reject any webpage evidence keys that overlap with canonical 19 Tier 1 feature names
            overlapping_keys = [k for k in webpage_evidence if k in url_feature_names]
            if overlapping_keys:
                raise ValueError(
                    f"Webpage evidence contains prohibited Tier 1 feature keys: {overlapping_keys}. "
                    f"Tier 1 features are canonical and cannot be overwritten by webpage evidence."
                )

            missing_webpage_keys = [
                f for f in required_webpage_features if f not in webpage_evidence or webpage_evidence[f] is None
            ]

            if missing_webpage_keys:
                # Incomplete evidence (e.g. 20 features instead of 28): do NOT fabricate zeros
                elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
                reasons.append(
                    f"Incomplete webpage feature extraction: missing {len(missing_webpage_keys)} required features."
                )
                reasons.append(
                    f"Missing features: {missing_webpage_keys[:5]}{'...' if len(missing_webpage_keys) > 5 else ''}"
                )
                reasons.append(
                    "Tier 2 full webpage inference requires complete 47-feature evidence matrix; "
                    "defaulting to Tier 1 offline findings."
                )

                return URLInferenceResponse(
                    url=url,
                    risk_score=tier1_result["risk_score"],
                    risk_level="SUSPICIOUS" if not tier1_result["is_malicious"] else "HIGH_RISK",
                    risk_label="Suspicious" if not tier1_result["is_malicious"] else "High Risk",
                    is_malicious=tier1_result["is_malicious"],
                    investigation_status=InvestigationStatus.PARTIAL_ANALYSIS,
                    full_webpage_completed=False,
                    tier_used="tier1_partial",
                    model_version=model_version,
                    latency_ms=elapsed_ms,
                    reasons=reasons,
                    extracted_features=url_features,
                    tier1_finding=tier1_finding,
                )

            # Construct final 47-feature dictionary strictly following metadata-defined order.
            # Tier 1 features are canonical from URL extraction; remaining 28 features from webpage evidence.
            full_features = {
                col: url_features[col] if col in url_feature_names else webpage_evidence[col]
                for col in full_feature_names
            }
            tier2_result = self.predict_tier2(full_features, threshold_mode=threshold_mode)
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            risk_level = self._compute_risk_level(tier2_result["risk_score"])
            risk_label = self._compute_risk_label(tier2_result["risk_score"])

            if tier2_result["is_malicious"]:
                reasons.append(
                    f"Full webpage DOM analysis exceeded threat threshold {tier2_result['threshold']:.2f} "
                    f"(Score: {tier2_result['risk_score']})."
                )
            else:
                reasons.append(
                    f"Observed DOM and lexical indicators remain below the operational decision threshold of "
                    f"{tier2_result['threshold']:.2f}. Results below threshold do not establish that the website is safe."
                )

            return URLInferenceResponse(
                url=url,
                risk_score=tier2_result["risk_score"],
                risk_level=risk_level,
                risk_label=risk_label,
                is_malicious=tier2_result["is_malicious"],
                investigation_status=InvestigationStatus.ANALYSIS_COMPLETE,
                full_webpage_completed=True,
                tier_used="tier2",
                model_version=model_version,
                latency_ms=elapsed_ms,
                reasons=reasons,
                extracted_features=full_features,
                tier1_finding=tier1_finding,
            )

        # Fallback if no webpage evidence provided for tier2
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        reasons.append("No webpage evidence supplied for Tier 2 evaluation.")
        return URLInferenceResponse(
            url=url,
            risk_score=tier1_result["risk_score"],
            risk_level="SUSPICIOUS",
            risk_label="Suspicious",
            is_malicious=tier1_result["is_malicious"],
            investigation_status=InvestigationStatus.INCONCLUSIVE,
            full_webpage_completed=False,
            tier_used="tier1_fallback",
            model_version=model_version,
            latency_ms=elapsed_ms,
            reasons=reasons,
            extracted_features=url_features,
            tier1_finding=tier1_finding,
        )

    def predict_url_risk(self, features: dict[str, Any], threshold_mode: str = "standard") -> dict[str, Any]:
        """
        Evaluate URL-only risk using the loaded Tier 1 production model and exact operating thresholds.
        Supports 'standard' (0.50) and 'security_hardened' (0.40) threshold modes.
        Uses calibrated, responsible risk terminology.
        """
        if not isinstance(threshold_mode, str):
            raise TypeError(f"threshold_mode argument must be a string, got {type(threshold_mode).__name__}")
        if not threshold_mode.strip():
            raise ValueError("threshold_mode argument cannot be empty or whitespace.")

        if not self.is_loaded or self.url_model is None or not self.metadata:
            raise RuntimeError(f"ML inference service is unavailable: {self.load_error or 'Production model not ready'}")

        model_version = self.metadata.get("model_version")
        if not model_version:
            raise RuntimeError("Model metadata is missing required 'model_version' field.")

        mode_clean = threshold_mode.strip().lower()
        if mode_clean not in ("standard", "security_hardened"):
            raise ValueError(
                f"Invalid threshold_mode '{threshold_mode}'. Supported modes: 'standard' (0.50), 'security_hardened' (0.40)."
            )

        tier1 = self.predict_tier1(features, threshold_mode=mode_clean)
        is_malicious = tier1["is_malicious"]
        risk_score = tier1["risk_score"]
        prob_malicious = tier1["prob_malicious"]
        prob_benign = tier1.get("prob_benign", round(1.0 - prob_malicious, 6))

        # Calibrated responsible risk categorization (avoids claims of confirmed fraud based purely on ML)
        if is_malicious:
            if risk_score >= 80.0:
                category = "High-Risk Indicator Detected"
            else:
                category = "Suspicious Pattern Detected"
        else:
            if risk_score >= 40.0:
                category = "Potential Risk (Verification Recommended)"
            else:
                category = "Standard Web Property (Requires Verification)"

        reasons = [
            (
                f"Estimated malicious probability: {prob_malicious:.4f} "
                f"(Operating threshold: {tier1['threshold']:.2f}, mode: {tier1['threshold_mode']})"
            )
        ]
        return {
            "risk_score": round(risk_score),
            "risk_score_raw": risk_score,
            "risk_level": self._compute_risk_level(risk_score),
            "risk_label": self._compute_risk_label(risk_score),
            "category": category,
            "is_malicious": is_malicious,
            "prob_malicious": prob_malicious,
            "prob_benign": prob_benign,
            "threshold": tier1["threshold"],
            "threshold_mode": tier1["threshold_mode"],
            "reasons": reasons,
            "model_version": model_version,
            "tier": "tier1",
        }

    @staticmethod
    def _compute_risk_level(risk_score: float) -> str:
        """
        Legacy risk level mapping preserved for complete backward compatibility.
        Returns: 'CONFIRMED_MALICIOUS', 'HIGH_RISK', 'SUSPICIOUS', or 'LOW_RISK'.
        """
        if risk_score >= 80.0:
            return "CONFIRMED_MALICIOUS"
        if risk_score >= 60.0:
            return "HIGH_RISK"
        if risk_score >= 40.0:
            return "SUSPICIOUS"
        return "LOW_RISK"

    @staticmethod
    def _compute_risk_label(risk_score: float) -> str:
        """
        Calibrated presentation label for new frontend presentation.
        Avoids claiming confirmed fraudulent status solely based on probabilistic ML models.
        Returns: 'Critical Risk', 'High Risk', 'Suspicious', or 'Low Risk'.
        """
        if risk_score >= 80.0:
            return "Critical Risk"
        if risk_score >= 60.0:
            return "High Risk"
        if risk_score >= 40.0:
            return "Suspicious"
        return "Low Risk"


ml_service = MLService()
