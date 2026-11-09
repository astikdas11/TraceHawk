"""Core application configuration with repository-root path resolution and production safeguards."""

import ipaddress
import json
from pathlib import Path
from typing import Any

from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repository root calculation: backend/app/core/config.py -> parents[3] is repo root
_CONFIG_FILE = Path(__file__).resolve()
REPO_ROOT = _CONFIG_FILE.parents[3]


def resolve_path_against_repo(path_str: str) -> Path:
    """
    Resolve a path string against the repository root if relative.
    If the path is supplied as an absolute path (e.g. from an environment variable),
    it remains absolute and unchanged.
    Ensures consistent path resolution regardless of whether the working directory
    is the repository root, backend/, or another directory.
    """
    p = Path(path_str)
    if p.is_absolute():
        return p

    # 1. Primary resolution against repository root
    repo_candidate = (REPO_ROOT / p).resolve()
    if repo_candidate.exists():
        return repo_candidate

    # 2. Secondary resolution against current working directory if found there
    cwd_candidate = p.resolve()
    if cwd_candidate.exists():
        return cwd_candidate

    # 3. Default: consistently resolve against repository root
    return repo_candidate


class Settings(BaseSettings):
    PROJECT_NAME: str = "TRACEHAWK Intelligence Engine"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"

    # Production Environment and Hardening Controls
    ENVIRONMENT: str = "development"
    DOCS_ENABLED: bool = True
    BODY_READ_TIMEOUT_SECONDS: float = 10.0

    # CORS Origins (supports JSON array or comma-separated string from environment)
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Reverse Proxy Security Controls (strictly loopback by default; validated at startup)
    TRUSTED_PROXIES: list[str] | str = ["127.0.0.1/32", "::1/128"]
    CLOUDFLARE_PROXIES: list[str] | str = []

    # Model Artifact Paths (defaults relative to repository root)
    MODEL_DIR: str = "models"
    MODEL_PATH: str = "models/production/url_only_model.joblib"
    URL_ONLY_MODEL_PATH: str = "models/production/url_only_model.joblib"
    FULL_WEBPAGE_MODEL_PATH: str = "models/production/full_webpage_model.joblib"
    MODEL_METADATA_PATH: str = "models/production/model_metadata.json"
    CONFIG_PATH: str = "config/phiusiil_features.json"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """
        Parse CORS_ORIGINS from JSON array string, comma-separated string, or existing list.
        Trims whitespace and trailing slashes for clean origin matching.
        Rejects malformed JSON arrays, valid non-array JSON values, and non-string array elements.
        """
        if isinstance(v, str):
            v_str = v.strip()
            # If the value appears to be a JSON array or object
            if v_str.startswith(("[", "{")) or v_str.endswith(("]", "}")):
                try:
                    parsed = json.loads(v_str)
                except (json.JSONDecodeError, ValueError) as err:
                    raise ValueError(f"Malformed JSON in CORS_ORIGINS: {err}") from err
                if not isinstance(parsed, list):
                    raise ValueError(
                        f"CORS_ORIGINS JSON configuration must be an array of strings, got {type(parsed).__name__}."
                    )
                cleaned: list[str] = []
                for item in parsed:
                    if not isinstance(item, str):
                        raise ValueError(  # noqa: TRY004
                            f"All elements in CORS_ORIGINS array must be strings, got {type(item).__name__}: {item!r}."
                        )
                    item_str = item.strip().rstrip("/")
                    if item_str:
                        cleaned.append(item_str)
                return cleaned

            # Reject valid JSON values that are not arrays (scalars: strings, numbers, booleans, null)
            try:
                parsed_scalar = json.loads(v_str)
                raise ValueError(
                    f"CORS_ORIGINS JSON configuration must be an array of strings, got {type(parsed_scalar).__name__}."
                )
            except (json.JSONDecodeError, TypeError):
                # Unquoted plain string (e.g. comma-separated URLs) -> parse as CSV
                pass

            # Normal comma-separated string support
            return [x.strip().rstrip("/") for x in v_str.split(",") if x.strip()]
        if isinstance(v, list):
            cleaned_list: list[str] = []
            for item in v:
                if not isinstance(item, str):
                    raise ValueError(  # noqa: TRY004
                        f"All elements in CORS_ORIGINS must be strings, got {type(item).__name__}: {item!r}."
                    )
                item_str = item.strip().rstrip("/")
                if item_str:
                    cleaned_list.append(item_str)
            return cleaned_list
        return v

    @field_validator("TRUSTED_PROXIES", "CLOUDFLARE_PROXIES", mode="after")
    @classmethod
    def validate_cidr_networks(cls, v: Any, info: ValidationInfo) -> list[str]:
        """
        Strictly validate that every configured proxy entry is a valid IP or CIDR network.
        Fails fast at startup with a descriptive error if any entry is invalid.
        """
        field_name = info.field_name
        if isinstance(v, str):
            raw_list = [x.strip() for x in v.split(",") if x.strip()]
        elif isinstance(v, list):
            raw_list = [str(x).strip() for x in v if str(x).strip()]
        else:
            raise ValueError(f"{field_name} must be a list of CIDR strings or a comma-separated string.")  # noqa: TRY004

        validated_cidrs: list[str] = []
        for item in raw_list:
            try:
                net = ipaddress.ip_network(item, strict=False)
                validated_cidrs.append(str(net))
            except ValueError as err:
                raise ValueError(
                    f"Invalid CIDR notation in {field_name}: '{item}'. "
                    f"Configuration error: {err}. Every entry must be a valid IP network specification."
                ) from err

        return validated_cidrs

    def get_trusted_proxy_networks(self) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
        """Get parsed ipaddress network objects for TRUSTED_PROXIES."""
        networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
        raw = self.TRUSTED_PROXIES if isinstance(self.TRUSTED_PROXIES, list) else [self.TRUSTED_PROXIES]
        for net in raw:
            networks.append(ipaddress.ip_network(net, strict=False))
        return networks

    def get_cloudflare_proxy_networks(self) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
        """Get parsed ipaddress network objects for CLOUDFLARE_PROXIES."""
        networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
        raw = self.CLOUDFLARE_PROXIES if isinstance(self.CLOUDFLARE_PROXIES, list) else [self.CLOUDFLARE_PROXIES]
        for net in raw:
            networks.append(ipaddress.ip_network(net, strict=False))
        return networks

    def get_url_only_model_path(self) -> Path:
        """Get canonical resolved path for Tier 1 model."""
        return resolve_path_against_repo(self.URL_ONLY_MODEL_PATH)

    def get_full_webpage_model_path(self) -> Path:
        """Get canonical resolved path for Tier 2 model."""
        return resolve_path_against_repo(self.FULL_WEBPAGE_MODEL_PATH)

    def get_model_metadata_path(self) -> Path:
        """Get canonical resolved path for model metadata."""
        return resolve_path_against_repo(self.MODEL_METADATA_PATH)

    def get_config_path(self) -> Path:
        """Get canonical resolved path for feature configuration."""
        return resolve_path_against_repo(self.CONFIG_PATH)

    def resolve_path(self, path_str: str) -> Path:
        """Resolve arbitrary path relative to repo root if relative."""
        return resolve_path_against_repo(path_str)


settings = Settings()
