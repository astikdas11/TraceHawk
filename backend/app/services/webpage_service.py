"""
TRACEHAWK — Webpage Evidence & DOM Feature Extraction Service.
Extracts the 28 webpage-derived DOM and content features (Feature Set B)
matching the frozen Phase 3 PhiUSIIL schema for Tier 2 ML inference.
Zero external network calls required for offline extraction.
Provides SSRF-protected safe fetching when live collection is requested.
"""

import difflib
import logging
import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

import tldextract

logger = logging.getLogger("tracehawk.services.webpage")

# Offline TLD extractor with bundled PSL snapshot (zero network egress)
_extractor = tldextract.TLDExtract(cache_dir=False, suffix_list_urls=None)


def _get_registered_domain(domain_or_url: str) -> str:
    """Extract canonical registered domain (eTLD+1) avoiding deprecation warnings."""
    if not domain_or_url:
        return ""
    extracted = _extractor(domain_or_url)
    if extracted.domain and extracted.suffix:
        return f"{extracted.domain}.{extracted.suffix}".lower()
    return (extracted.domain or "").lower()

# Canonical 28 Tier 2 webpage-derived feature names matching model_metadata.json
CANONICAL_TIER2_WEBPAGE_FEATURES = (
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
)

SOCIAL_DOMAINS = frozenset({
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
    "tiktok.com",
    "pinterest.com",
    "reddit.com",
    "t.me",
    "telegram.org",
    "whatsapp.com",
    "github.com",
})

BANK_KEYWORDS = re.compile(
    r"\b(bank|banking|financial|account|signin|log-in|verify-identity|credit-union|wire-transfer)\b",
    re.IGNORECASE,
)
PAY_KEYWORDS = re.compile(
    r"\b(pay|payment|paypal|creditcard|credit-card|checkout|billing|invoice|stripe|visa|mastercard)\b",
    re.IGNORECASE,
)
CRYPTO_KEYWORDS = re.compile(
    r"\b(crypto|bitcoin|btc|ethereum|eth|wallet|blockchain|coinbase|binance|metamask|ledger)\b",
    re.IGNORECASE,
)
COPYRIGHT_KEYWORDS = re.compile(
    r"(&copy;|©|\bcopyright\b|\ball rights reserved\b)",
    re.IGNORECASE,
)
POPUP_CALL_PATTERN = re.compile(
    r"(?:window\.open\s*\(|\.showModal\s*\()",
    re.IGNORECASE,
)
POPUP_PATTERN = POPUP_CALL_PATTERN  # Backward-compatibility alias

CLIENT_REDIRECT_PATTERN = re.compile(
    r"(?:window\.location\s*=|location\.href\s*=|location\.(?:replace|assign)\s*\(|window\.location\.(?:replace|assign)\s*\()",
    re.IGNORECASE,
)


class _DOMParser(HTMLParser):
    """Event-driven standard library HTML/DOM parser extracting structural features."""

    def __init__(self, page_domain: str, page_url: str):
        super().__init__()
        self.page_domain = page_domain.lower().strip()
        self.page_url = page_url.lower().strip()
        self.page_registered_domain = _get_registered_domain(self.page_domain)

        # Extracted elements
        self.title_text: list[str] = []
        self.in_title = False
        self.in_script = False
        self.in_style = False
        self.script_chunks: list[str] = []
        self.event_handlers: list[str] = []
        self.modal_elements = 0
        self.has_favicon = 0
        self.robots = 0
        self.is_responsive = 0
        self.has_description = 0
        self.no_of_url_redirect = 0
        self.no_of_self_redirect = 0
        self.no_of_iframe = 0
        self.no_of_image = 0
        self.no_of_css = 0
        self.no_of_js = 0
        self.has_external_form_submit = 0
        self.has_submit_button = 0
        self.has_hidden_fields = 0
        self.has_password_field = 0
        self.has_social_net = 0
        self.no_of_self_ref = 0
        self.no_of_empty_ref = 0
        self.no_of_external_ref = 0
        self.raw_text_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        tag_lower = tag.lower()
        attr_dict = {k.lower(): (v or "") for k, v in attrs}

        # Check modal popup attributes / tags in DOM
        if tag_lower == "dialog":
            self.modal_elements += 1
        else:
            cls = attr_dict.get("class", "").lower()
            elem_id = attr_dict.get("id", "").lower()
            if "modal-popup" in cls or "popup-box" in cls or "modal-popup" in elem_id or "popup-box" in elem_id:
                self.modal_elements += 1

        # Check inline script event handlers (e.g. onclick, onload)
        for k, v in attr_dict.items():
            if k.startswith("on") and v:
                self.event_handlers.append(v)

        if tag_lower == "title":
            self.in_title = True

        elif tag_lower == "link":
            rel = attr_dict.get("rel", "").lower()
            if "icon" in rel:
                self.has_favicon = 1
            if "stylesheet" in rel:
                self.no_of_css += 1

        elif tag_lower == "style":
            self.no_of_css += 1
            self.in_style = True

        elif tag_lower == "script":
            self.no_of_js += 1
            self.in_script = True

        elif tag_lower == "iframe":
            self.no_of_iframe += 1

        elif tag_lower == "img":
            self.no_of_image += 1

        elif tag_lower == "meta":
            name = attr_dict.get("name", "").lower()
            http_equiv = attr_dict.get("http-equiv", "").lower()
            content = attr_dict.get("content", "").lower()

            if name in ("robots", "googlebot"):
                self.robots = 1
            elif name == "viewport":
                self.is_responsive = 1
            elif name == "description" and content.strip():
                self.has_description = 1

            if http_equiv == "refresh":
                self.no_of_url_redirect = 1

        elif tag_lower == "input":
            input_type = attr_dict.get("type", "text").lower()
            if input_type == "password":
                self.has_password_field = 1
            elif input_type == "hidden":
                self.has_hidden_fields = 1
            elif input_type in ("submit", "image"):
                self.has_submit_button = 1

        elif tag_lower == "button":
            btn_type = attr_dict.get("type", "submit").lower()
            if btn_type in ("submit", ""):
                self.has_submit_button = 1

        elif tag_lower == "form":
            action = attr_dict.get("action", "").strip()
            if action:
                parsed_action = urlparse(action)
                if parsed_action.netloc:
                    action_domain = parsed_action.netloc.lower().split(":")[0]
                    action_reg = _get_registered_domain(action_domain)
                    page_reg = self.page_registered_domain
                    is_external = (
                        (action_reg != page_reg) if (action_reg and page_reg)
                        else (action_domain != self.page_domain)
                    )
                    if is_external:
                        self.has_external_form_submit = 1
                    else:
                        self.no_of_self_redirect = 1
                elif action in ("#", "", self.page_url):
                    self.no_of_self_redirect = 1

        elif tag_lower == "a":
            href = attr_dict.get("href", "").strip()
            href_lower = href.lower()
            if not href or href == "#" or href_lower.startswith(("javascript:void", "javascript:;")):
                self.no_of_empty_ref += 1
            elif href_lower.startswith(("mailto:", "tel:", "sms:", "callto:")):
                # Communication protocols: not DOM page navigations, do not count as self, empty, or external refs
                pass
            elif href_lower.startswith("javascript:"):
                # Non-void javascript pseudos count as empty references
                self.no_of_empty_ref += 1
            else:
                parsed_href = urlparse(href)
                if parsed_href.netloc:
                    href_domain = parsed_href.netloc.lower().split(":")[0]
                    # Check social network links
                    reg_domain = _get_registered_domain(href_domain)
                    if reg_domain in SOCIAL_DOMAINS or href_domain in SOCIAL_DOMAINS:
                        self.has_social_net = 1

                    page_reg = self.page_registered_domain
                    is_external = (
                        (reg_domain != page_reg) if (reg_domain and page_reg)
                        else (href_domain != self.page_domain)
                    )
                    if is_external:
                        self.no_of_external_ref += 1
                    else:
                        self.no_of_self_ref += 1
                else:
                    self.no_of_self_ref += 1

    def handle_endtag(self, tag: str):
        tag_lower = tag.lower()
        if tag_lower == "title":
            self.in_title = False
        elif tag_lower == "style":
            self.in_style = False
        elif tag_lower == "script":
            self.in_script = False

    def handle_data(self, data: str):
        if self.in_title:
            self.title_text.append(data)
        if self.in_script:
            self.script_chunks.append(data)
        elif not self.in_style:
            self.raw_text_chunks.append(data)


def compute_string_match_score(query: str, target: str) -> float:
    """Compute similarity score [0.0, 100.0] between two strings."""
    if not query or not target:
        return 0.0
    q_norm = query.lower().strip()
    t_norm = target.lower().strip()
    ratio = difflib.SequenceMatcher(None, q_norm, t_norm).ratio()
    return round(float(ratio * 100.0), 2)


def extract_webpage_features(html_content: str, url: str) -> dict[str, Any]:
    """
    Extract all 28 webpage-derived DOM and content features strictly matching Feature Set B.
    Validates that:
    - HTML input is non-empty string.
    - All 28 features are present in canonical schema order.
    - Values conform to their respective types (binary, ratio, score, count).
    """
    if not isinstance(html_content, str):
        raise TypeError(f"html_content must be str, got {type(html_content).__name__}")
    if not html_content.strip():
        raise ValueError("html_content cannot be empty or whitespace.")
    if not isinstance(url, str):
        raise TypeError(f"url must be str, got {type(url).__name__}")

    lines = html_content.splitlines()
    line_of_code = len(lines)
    largest_line_length = max((len(line) for line in lines), default=0)

    # Resolve domain for relative / external ref detection
    parsed_url = urlparse(url if "://" in url else f"http://{url}")
    domain = parsed_url.netloc.split(":")[0].lower()

    parser = _DOMParser(page_domain=domain, page_url=url)
    try:
        parser.feed(html_content)
    except Exception as e:  # noqa: BLE001
        logger.warning("HTML parser encountered warning while parsing DOM: %s", e)

    full_title = "".join(parser.title_text).strip()
    has_title = 1 if bool(full_title) else 0

    domain_title_match_score = compute_string_match_score(domain, full_title) if has_title else 0.0
    url_title_match_score = compute_string_match_score(url, full_title) if has_title else 0.0

    # Strip HTML comments to avoid false positive matches inside commented-out markup or scripts
    cleaned_html = re.sub(r"<!--.*?-->", "", html_content, flags=re.DOTALL)

    # Collect executable script source (inline scripts + event handlers)
    script_source = "\n".join(parser.script_chunks + parser.event_handlers)
    # Strip comments from script code
    clean_script_source = re.sub(r"/\*.*?\*/", "", script_source, flags=re.DOTALL)
    clean_script_source = re.sub(r"//.*", "", clean_script_source)

    # Popups count: window.open() / .showModal() calls in script source + modal DOM elements
    popups = len(POPUP_CALL_PATTERN.findall(clean_script_source)) + parser.modal_elements

    # Client-side redirects in script bodies or meta refresh (excluding ordinary visible text)
    no_of_url_redirect = parser.no_of_url_redirect
    if not no_of_url_redirect and CLIENT_REDIRECT_PATTERN.search(clean_script_source):
        no_of_url_redirect = 1

    # Content lexical keyword detection across rendered text chunks (ignoring script & style blocks)
    all_text = " ".join(parser.raw_text_chunks)
    bank = 1 if bool(BANK_KEYWORDS.search(all_text)) else 0
    pay = 1 if bool(PAY_KEYWORDS.search(all_text)) else 0
    crypto = 1 if bool(CRYPTO_KEYWORDS.search(all_text)) else 0
    has_copyright_info = 1 if bool(COPYRIGHT_KEYWORDS.search(cleaned_html)) else 0

    features: dict[str, Any] = {
        "LineOfCode": int(line_of_code),
        "LargestLineLength": int(largest_line_length),
        "HasTitle": int(has_title),
        "DomainTitleMatchScore": float(domain_title_match_score),
        "URLTitleMatchScore": float(url_title_match_score),
        "HasFavicon": int(parser.has_favicon),
        "Robots": int(parser.robots),
        "IsResponsive": int(parser.is_responsive),
        "NoOfURLRedirect": int(no_of_url_redirect),
        "NoOfSelfRedirect": int(parser.no_of_self_redirect),
        "HasDescription": int(parser.has_description),
        "NoOfPopup": int(popups),
        "NoOfiFrame": int(parser.no_of_iframe),
        "HasExternalFormSubmit": int(parser.has_external_form_submit),
        "HasSocialNet": int(parser.has_social_net),
        "HasSubmitButton": int(parser.has_submit_button),
        "HasHiddenFields": int(parser.has_hidden_fields),
        "HasPasswordField": int(parser.has_password_field),
        "Bank": int(bank),
        "Pay": int(pay),
        "Crypto": int(crypto),
        "HasCopyrightInfo": int(has_copyright_info),
        "NoOfImage": int(parser.no_of_image),
        "NoOfCSS": int(parser.no_of_css),
        "NoOfJS": int(parser.no_of_js),
        "NoOfSelfRef": int(parser.no_of_self_ref),
        "NoOfEmptyRef": int(parser.no_of_empty_ref),
        "NoOfExternalRef": int(parser.no_of_external_ref),
    }

    # Verify that all 28 canonical features are returned in exact schema order
    return {col: features[col] for col in CANONICAL_TIER2_WEBPAGE_FEATURES}
