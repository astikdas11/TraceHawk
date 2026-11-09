# TRACEHAWK — Hawk Shield
### AI-Powered Cybersecurity Threat Intelligence & Digital Forensics Platform
> **Tagline:** *See the Threat. Trace the Source.*

---

## 1. Project Overview

**TRACEHAWK** is an enterprise-grade Security Operations Center (SOC) intelligence and digital forensics workstation designed to analyze suspicious URLs, evaluate deceptive messages, inspect TLS peer/leaf certificates, resolve DNS records, and correlate threat telemetry across verified global intelligence repositories.

The visual and conceptual identity is anchored in **Hawk Shield** — symbolizing vigilance, sharp analytical vision, digital sovereignty, and uncompromising forensic defense.

---

## 2. Directory Structure

```text
TRACEHAWK/
│
├── data/
│   ├── raw/
│   │   └── PhiUSIIL_Phishing_URL_Dataset.csv   # Raw benchmark dataset (56 columns, ~56MB)
│   ├── intermediate/                           # Cleaned, imputed intermediate artifacts
│   ├── processed/                              # Processed feature matrices
│   └── splits/                                 # Stratified domain-grouped splits (80/10/10)
│
├── frontend/                                   # Production-ready React 19 + Tailwind v4 SOC Workstation
│   ├── src/
│   │   ├── components/                         # UI layouts, charts, and common SOC widgets
│   │   ├── views/                              # Public Landing and 9 specialized Dashboard modules
│   │   └── data/                               # Sample telemetry & benchmark data
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                                    # Python FastAPI Threat Intelligence & ML Backend
│   ├── app/
│   │   ├── api/v1/                             # REST API endpoints (URL, Message, Domain, TLS)
│   │   ├── core/                               # Settings, CORS, and environment configuration
│   │   ├── services/                           # Canonical feature extractor, ML service, DNS, TLS
│   │   ├── utils/                              # Canonical Tier 1 extractor (feature_extractor.py)
│   │   └── main.py                             # FastAPI server entry point, /api/health & /api/ready
│   ├── tests/                                  # Backend unit & integration test suites
│   └── requirements.txt                        # Backend production dependencies
│
├── pipeline/
│   └── preprocess_phiusiil.py                  # End-to-end dataset cleaning & split pipeline
│
├── config/
│   └── phiusiil_features.json                  # Feature categorization, drop lists, & preprocessing rules
│
├── models/
│   └── production/                             # Frozen production models (XGBoost) & metadata
│       ├── model_metadata.json                 # Production schema, hashes, thresholds & metrics
│       ├── url_only_model.joblib               # Tier 1 URL-only model artifact
│       └── full_webpage_model.joblib           # Tier 2 Full-webpage model artifact
│
├── reports/                                    # Preprocessing summaries, evaluation reports & curves
├── notebooks/                                  # Jupyter notebooks for EDA and model experimentation
├── requirements-phase2.txt                     # Phase 2 Python dependencies
└── README.md                                   # Root project documentation
```

---

## 3. Data Pipeline & Model Governance

### Dataset Fingerprint & Partitioning
- **Source Benchmark:** PhiUSIIL Phishing URL Dataset (235,370 clean records post-deduplication and sanitization).
- **Domain-Grouped Split:** Partitioned strictly by registrable domain to guarantee **zero domain overlap** across splits:
  - **Training Set (80%):** 188,296 records
  - **Validation Set (10%):** 23,537 records
  - **Test Set (10%):** 23,537 records
- **Canonical Label Convention:**
  - `0 = BENIGN`
  - `1 = MALICIOUS`
  *(The raw dataset's inverse notation of 0=Phishing, 1=Legitimate is canonically inverted during preprocessing so that `1` consistently designates the positive malicious class).*

### Production Model Architecture

Both models utilize `xgboost.sklearn.XGBClassifier` (`hist` tree method, max depth 6, 150 estimators, learning rate 0.1):

1. **Tier 1: URL-Only Fast Scanner (`url_only_model.joblib`)**
   - **Feature Count:** Exactly 19 canonical features extracted offline via `backend/app/utils/feature_extractor.py`.
   - **Canonical Feature Schema:**
     1. `URLLength`
     2. `DomainLength`
     3. `IsDomainIP`
     4. `TLD`
     5. `TLDLength`
     6. `NoOfSubDomain`
     7. `HasObfuscation`
     8. `NoOfObfuscatedChar`
     9. `ObfuscationRatio`
     10. `NoOfLettersInURL`
     11. `LetterRatioInURL`
     12. `NoOfDegitsInURL`
     13. `DegitRatioInURL`
     14. `NoOfEqualsInURL`
     15. `NoOfQMarkInURL`
     16. `NoOfAmpersandInURL`
     17. `NoOfOtherSpecialCharsInURL`
     18. `SpacialCharRatioInURL`
     19. `IsHTTPS`
   - **Operating Thresholds:**
     - Standard Operating Threshold: `0.50`
     - Security-Hardened Operating Threshold: `0.40`
   - **Offline Benchmark Performance (Test Split, N=23,537):**
     - Accuracy: `99.715%`
     - Precision: `99.95%` (0.9995)
     - Recall: `99.381%`
     - F1-Score: `99.665%`
     - ROC-AUC: `0.99974`, PR-AUC: `0.99975`
     - Latency: Sub-5ms single-sample median latency (4.36ms).

2. **Tier 2: Deep Webpage & Content Inspector (`full_webpage_model.joblib`)**
   - **Feature Count:** Exactly 47 features (the 19 Tier 1 canonical features + 28 webpage-specific content and DOM features).
   - **Operating Thresholds:**
     - Standard Operating Threshold: `0.50`
     - Security-Hardened Operating Threshold: `0.15`
   - **Offline Benchmark Performance (Test Split, N=23,537):**
     - Accuracy: `99.996%`
     - Precision: `100%` (1.0000)
     - Recall: `99.99%` (0.9999)
     - F1-Score: `99.995%` (0.99995)
     - ROC-AUC: `1.0000`, PR-AUC: `1.0000`
   - **Evidence Completeness:** Requires all 47 features to be present. Never zero-fills missing webpage features; returns `PARTIAL_ANALYSIS` if webpage telemetry is incomplete.

> [!NOTE]
> **Authoritative Benchmark Notice:** All performance figures above are derived strictly from `models/production/model_metadata.json` evaluated on the held-out test split (23,537 samples). These metrics reflect controlled offline benchmark results and do not constitute a guarantee of live real-world detection accuracy against evolving or out-of-distribution phishing attacks.

---

## 4. Backend Architecture (`backend/`)

Powered by **FastAPI** with production-hardened endpoints:

| Endpoint | Method | Status | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | **Implemented** | Independent liveness probe; always returns HTTP 200 while service is alive. |
| `/api/ready` | `GET` | **Implemented** | Readiness probe; returns HTTP 200 when Tier 1 model and metadata are ready, or HTTP 503 if unavailable. |
| `/api/v1/investigate/url` | `POST` | **Implemented** | Real-time URL feature extraction, ML inference, and evidence generation. |
| `/api/v1/intelligence/domain` | `GET` | **Implemented** | Live DNS record resolution (`A`, `AAAA`, `MX`, `NS`, `TXT`, `CNAME`, `SOA`). |
| `/api/v1/intelligence/tls` | `GET` | **Implemented** | Live peer/leaf X.509 certificate inspection, cipher auditing, and SSRF defense. |
| `/api/v1/investigate/message` | `POST` | *Planned / Prototype* | NLP heuristic evaluation, urgency scoring, and entity impersonation checks. |

### Implemented vs. Planned Capabilities

- **DNS Resolution (`dns_service.py`):**
  - **Implemented:** Live DNS resolver queries for `A`, `AAAA`, `MX`, `NS`, `TXT`, `CNAME`, and `SOA` records with socket/resolver timeout and error handling.
  - **Explicitly Unavailable Pending Provider Integration:** WHOIS registrar details, domain creation date, domain age, and BGP/ASN routing are explicitly marked as unavailable (`UNAVAILABLE` or empty) in responses. TraceHawk never fabricates synthetic registrar, creation date, or ASN records.
- **TLS Certificate Inspection (`tls_service.py`):**
  - **Implemented:** Inspects the presented peer/leaf X.509 certificate during the TLS handshake.
  - **Cryptographic Self-Signature Authority:** Verifies whether leaf certificate signatures cryptographically validate with their own public key via `is_cryptographically_self_signed()`, supporting RSA (PKCS#1 v1.5 and RSA-PSS with PSS parameters), ECDSA, and Ed25519. Unsupported signature algorithms return an inconclusive result (`None`) and fall back to `UNKNOWN` validation type rather than claiming successful verification.
  - **SSRF Defense & DNS Pinning:** Resolves hostname prior to connection, rejects all non-global IP addresses (including private RFC 1918, loopback RFC 1122, link-local RFC 3927, Carrier-Grade NAT RFC 6598, multicast RFC 5771, and reserved ranges), rejects mixed public/private DNS responses entirely, pins the TCP socket to the validated public IP to prevent DNS rebinding, and preserves the original requested hostname for TLS SNI and RFC 6125 hostname verification. Restricts TLS inspection strictly to ports 443 and 8443.
  - **Planned Capability:** Complete multi-tier certificate-chain PKI validation with CRL/OCSP stapling auditing.
- **Threat Intelligence & Message Investigation:**
  - **Implemented:** Real-time URL feature extraction, model inference, and forensic telemetry.
  - **Planned External Threat Intelligence:** Third-party reputation feeds (VirusTotal, AlienVault OTX, abuse.ch) and live DOM scraping are planned future integrations and are not implied to be active in the offline ML pipeline.
  - **Planned / Prototype:** NLP heuristic message investigation (`/api/v1/investigate/message`) is currently a prototype/stub.

### Launching the Backend Server

#### Local Development
```bash
# From repository root
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation is available at: `http://127.0.0.1:8000/docs`

#### Production Deployment & Hosting Targets
The production server MUST be launched with `--no-proxy-headers` to ensure Uvicorn does not automatically rewrite client IP addresses from untrusted headers. TraceHawk's perimeter security layer enforces right-to-left trusted proxy traversal and Cloudflare CIDR validation directly on the true socket peer.

**1. Generic Production CLI Command:**
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --no-proxy-headers
```

**2. PaaS Hosting Platforms (Render & Railway):**
- **Render (`render.yaml` or Dashboard):**
  - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1 --no-proxy-headers`
- **Railway (`railway.json` or Dashboard):**
  - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1 --no-proxy-headers`

**3. Container / Dockerfile:**
```dockerfile
# Production entrypoint
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-proxy-headers"]
```

**4. Linux VM / Bare-Metal (`systemd` Service Unit):**

Select the configuration matching your VM's network topology:

- **Architecture A (Reverse Proxy Topology — Recommended for Production):**
  Uvicorn binds strictly to loopback (`127.0.0.1:8000`). A local reverse proxy (such as Nginx, Caddy, or HAProxy) terminates public TLS on ports 80/443 and forwards traffic to `http://127.0.0.1:8000`.
  - **Systemd `ExecStart`:**
    ```ini
    ExecStart=/opt/tracehawk/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers
    ```
  - **Proxy Trust Requirement:** Because the direct peer is the local reverse proxy over loopback, set `TRUSTED_PROXIES=["127.0.0.1/32"]` (and `"::1/128"` if proxying over IPv6) in your `/opt/tracehawk/.env` configuration. TraceHawk verifies the socket peer is `127.0.0.1` before trusting client addresses from `X-Forwarded-For`.

- **Architecture B (Direct Public Ingress — Standalone VM without Reverse Proxy):**
  If TRACEHAWK is directly exposed to public client traffic (e.g., protected only by an external cloud security group / VPC firewall):
  - **Systemd `ExecStart`:**
    ```ini
    ExecStart=/opt/tracehawk/.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-proxy-headers
    ```
  - **Proxy Trust Requirement:** Leave proxy trust empty (`TRUSTED_PROXIES=[]`). All client-supplied `X-Forwarded-For` headers are untrusted and discarded; TraceHawk uses the direct TCP socket address for all client rate limiting and forensics.

**Sample `systemd` Service Unit (`/etc/systemd/system/tracehawk.service`):**
```ini
[Unit]
Description=TRACEHAWK Cybersecurity Threat Intelligence Backend
After=network.target

[Service]
Type=simple
User=tracehawk
WorkingDirectory=/opt/tracehawk
EnvironmentFile=/opt/tracehawk/.env
# Architecture A (Behind local reverse proxy):
ExecStart=/opt/tracehawk/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers
# Architecture B (Direct public ingress):
# ExecStart=/opt/tracehawk/.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-proxy-headers
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> [!IMPORTANT]
> **Proxy Security & IP Attribution Contract:**
> - **Never Use Wildcard Proxy Trust:** Never use `--forwarded-allow-ips="*"` or `--proxy-headers` in production. Supplying wildcard trust exposes the application to remote client IP spoofing attacks.
> - **Do Not Invent PaaS Proxy CIDRs:** PaaS providers (Render, Railway) dynamically route through internal container meshes. Unless your infrastructure provides a static private VPC CIDR, do not guess internal IP ranges. If the app is directly exposed or if client IP cannot be securely proven by an upstream network boundary, leave `TRUSTED_PROXIES=[]` so the direct socket address is used.
> - **Official Cloudflare IP Ranges (IPv4 & IPv6):** When using Cloudflare edge proxying, configure `CLOUDFLARE_PROXIES` with the official Cloudflare published CIDRs (supports both IPv4 and IPv6 ingress):
>   - **IPv4:** `173.245.48.0/20`, `103.21.244.0/22`, `103.22.200.0/22`, `103.31.4.0/22`, `141.101.64.0/18`, `108.162.192.0/18`, `190.93.240.0/20`, `188.114.96.0/20`, `197.234.240.0/22`, `198.41.128.0/17`, `162.158.0.0/15`, `104.16.0.0/13`, `104.24.0.0/14`, `172.64.0.0/13`, `131.0.72.0/22`
>   - **IPv6:** `2400:cb00::/32`, `2606:4700::/32`, `2803:f800::/32`, `2405:b500::/32`, `2405:8100::/32`, `2a06:98c0::/29`, `2c0f:f248::/32`

---

## 5. Frontend Architecture (`frontend/`)

Built with **React 19**, **Tailwind CSS v4**, **Vite**, and **Lucide Icons**:
- **Mobile Optimized:** Dedicated thumb-friendly bottom navigation bar (`MobileBottomNav`), responsive 2x2 stat cards, and touch-optimized evidence cards.
- **Sovereign Design Aesthetic:** Ambient animated Indian National Flag gradient background honoring digital sovereignty.
- **Explainable Threat Evidence:** Real-time visual risk gauge, technical indicator breakdown, and model confidence scores.

### Launching the Frontend

```bash
cd frontend
npm install
npm run dev
```

The workstation interface will be accessible at: `http://localhost:5173`

---

## 6. Verification & Testing

### Running Test Suites

From the project root, activate the project's virtual environment or execute directly via the virtual environment binary (this ensures Windows Smart App Control does not intercept native `.pyd` C-extensions in `%LOCALAPPDATA%`):

**PowerShell (Windows):**
```powershell
# Option A: Activate virtual environment, then run pytest
.\.venv\Scripts\Activate.ps1
pytest -q

# Option B: Run directly via virtual environment binary
.\.venv\Scripts\pytest.exe -q
```

**Bash / Linux / macOS:**
```bash
source .venv/bin/activate
pytest -q
```

Or run backend tests with detailed verbosity:

```powershell
.\.venv\Scripts\pytest.exe backend/tests/ -v
```

### Frontend Build Verification

```bash
cd frontend
npm run build
```
