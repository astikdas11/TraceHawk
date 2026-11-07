# TRACEHAWK — Hawk Shield
### AI-Powered Cybersecurity Intelligence Platform
> **Tagline:** *See the Threat. Trace the Source.*

---

## 1. Overview

**TRACEHAWK** is an enterprise-grade Security Operations Center (SOC) intelligence and digital forensics platform designed to analyse suspicious URLs, evaluate deceptive messages, audit TLS certificate hierarchies, inspect authoritative DNS records, and correlate threat telemetry across verified open-source intelligence repositories.

The visual and conceptual identity is anchored in **Hawk Shield** — symbolizing vigilance, sharp analytical vision, digital sovereignty, and uncompromising forensic defense.

> [!NOTE]
> **Phase 1 Frontend Delivery:**
> This repository contains the complete, production-ready frontend interface. Threat detection datasets have been downloaded and will be powered by a dedicated Python FastAPI backend and custom Machine Learning models in subsequent phases. All currently displayed analytics utilize curated, realistic demonstration benchmarks clearly marked with **FRONTEND DEMONSTRATION DATA** badges.

---

## 2. Visual Identity & Design System

The platform blends modern minimalist design (inspired by Cloudflare, Linear, and Vercel) with sovereign GovTech engineering aesthetics:

### Animated Indian National Flag Background
- **Subtle CSS Waving Fabric:** Smooth, low-intensity waving animation mimicking natural cloth in wind using CSS keyframe transforms (`flagWave`, `fabricShimmer`).
- **Official Tricolour Harmony:**
  - **Saffron:** `#FF9933` (Used for critical accents, primary actions, and warnings)
  - **White:** `#FFFFFF` (Typography and crisp highlights)
  - **India Green:** `#138808` (Low-risk badges, verified states, and secure operational feeds)
  - **Ashoka Chakra Navy:** `#000080` (Geometric circular motif with 24 distinct spokes)
- **Contrast & Legibility Guardrails:** A deep SOC backdrop layer (`#101C32` with 92% opacity and subtle grid overlays) protects content contrast and ensures WCAG AAA accessibility across all data-dense workspaces.

### Foreground Palette
- **Deep Navy:** `#101C32` (Primary workspace foundation)
- **Dark Slate:** `#263449` (Card panels and container borders)
- **Secondary Slate:** `#526174` (Muted labels and metadata)
- **Ivory / White:** `#F4F5F2` / `#FFFFFF` (High-contrast typography)
- **Border Neutral:** `#1E2B3E` / `#E2E7ED`

### Hawk Shield Emblem
A geometric, symmetrical hawk head seamlessly integrated into a digital protective shield with circuit-inspired vector accents and subtle saffron and green highlights.

---

## 3. Implemented Modules & Workspaces

The platform is structured into a public landing interface and 9 specialized SOC workspaces:

### 1. Landing Page (`/`)
- **Hero Section:** Prominent title, tagline, platform summary, and an interactive hero URL investigation bar.
- **Hawk Shield Visual Preview:** Real-time simulated URL forensics card demonstrating lexical entropy, certificate validity, and threat feed matches.
- **Core Capabilities Grid:** 6 technical capability cards (URL Forensics, Message Heuristics, TLS Handshake, Threat Feeds, Explainable Scoring, Exportable Reports).
- **4-Step Investigation Lifecycle:** Submit $\rightarrow$ Technical Analysis $\rightarrow$ Threat Correlation $\rightarrow$ Forensic Report.
- **Foundational Security Principles:**
  1. *The HTTPS Fallacy Principle:* Demonstrates why an active padlock does not guarantee safety (80%+ of phishing attacks deploy valid automated DV certificates).
  2. *The Threat Feed Fallacy Principle:* Emphasizes that absence of a known IOC does not imply safety due to zero-day lag.
- **Telemetry Benchmark Matrix:** Curated metrics showcasing 1,060 audited queries, 230 confirmed malicious identifications, and 5 correlated feeds.

### 2. Main SOC Dashboard (`/dashboard` - Overview)
- **Telemetry Metric Cards:** Real-time counters for Total Investigations (1,060), Suspicious URLs (210), Malicious Threats (230), and Corroborated Matches (342).
- **24-Hour Threat Activity Chart:** Recharts area chart illustrating continuous traffic vs. flagged anomalies.
- **Risk Distribution Donut Chart:** Visual breakdown across Low Risk, Suspicious, High Risk, and Confirmed Malicious tiers.
- **Tactic Classification Bar Chart:** Classification by threat modality (Credential Harvest, Brand Impersonation, Banking Phish, Advance-Fee Fraud, Malware Staging).
- **Corroboration Stream Status:** Real-time status indicators for URLhaus, PhishTank, PhiUSIIL, AbuseIPDB, and CIRCL MISP.
- **Recent Audit Log:** Table of recent investigations with direct navigation into deep inspection.

### 3. URL Investigation Workspace (`/investigate/url`)
- **Multi-Factor Lexical Forensics:** Shannon entropy score, subdomain depth, URL length, punycode/homoglyph detection, raw IP hostname detection.
- **Network Resolution:** IP address resolution, Autonomous System Number (ASN), and hosting geolocation.
- **Preset Test Benchmarks:** Instant testing of SBI KYC phish lures (`http://sbi-kyc-verify-portal.in`), legitimate sovereign banking (`https://onlinesbi.sbi`), and utility extortion lures.
- **Corroborated Evidence Panel:** Individual evidence cards with source attribution, confidence metrics, and remediation guidance.

### 4. Phishing & Scam Message Analysis (`/investigate/message`)
- **Split-Panel Layout:** Left panel for raw message submission (SMS, WhatsApp, emails, job offers, utility cut-off warnings); right panel for forensic findings.
- **Linguistic Urgency & Threat Scoring:** NLP heuristic scoring measuring psychological time pressure, monetary demands, and coercive phrasing.
- **Automated Indicator Extraction:** Extracts URLs, telephone identifiers, email addresses, and suspicious keywords.
- **Entity Impersonation Detection:** Flags impersonation of recognized institutions (State Bank of India, Netflix, Amazon, etc.).

### 5. Domain Intelligence (`/intelligence/domain`)
- **WHOIS Registry Records:** Registrar identity, domain creation date, expiration timestamp, calculated domain age in days, and privacy proxy detection.
- **Authoritative DNS Zone Records:** Interactive record table filtering A, AAAA, MX, NS, TXT, and SOA records with TTL and security flags (SPF/DMARC status).

### 6. TLS & Certificate Intelligence (`/intelligence/tls`)
- **X.509 Certificate Audit:** Issuer Certificate Authority, validation tier (EV, OV, DV, Self-Signed), and validity date range.
- **Expiration Countdown Timeline:** Visual progress bar highlighting remaining certificate lifespan.
- **Cryptographic Configuration:** Protocol negotiation (TLS 1.3 / 1.2), cipher suite, signature algorithm, public key strength (e.g., 2048-bit RSA / 256-bit ECDSA).
- **Subject Alternative Names (SANs) & Transparency:** SAN list inspection and Certificate Transparency (CT) Signed Certificate Timestamp (SCT) audit.

### 7. Threat Intelligence Feeds (`/threat-intelligence`)
- **Feed Source Profiles:** Status, provider, tracked indicators count, sync frequency, and verified reliability rating.
- **Curated Threat Indicators Table:** Searchable and filterable database of active Indicators of Compromise (IOCs) across URLs, domains, and IP addresses.

### 8. Investigation History (`/investigations`)
- **Audit Trail Repository:** Complete log of previously audited targets.
- **Multi-Dimensional Filters:** Search by target asset or ID; filter by modality (URL, Message, Domain, TLS) and risk severity.
- **Quick Inspector Drawer:** Modal displaying the complete case dossier, evidence list, and direct links to workspaces.

### 9. Forensic Intelligence Dossier (`/reports`)
- **Government-Grade Report Document:** Executive summary, subject asset classification, MITRE ATT&CK alignment (T1566 Spearphishing, T1583 Domain Acquisition), evidence vectors, and analyst sign-off.
- **Actions:** Print-ready formatting (`window.print()`), JSON export, and Markdown clipboard copy.

### 10. Workstation Settings & API Connectivity (`/settings`)
- **Backend API Configuration:** Configurable API Base URL (defaults to `http://127.0.0.1:8000`) with interactive ping health check.
- **Display Preferences:** Toggle for animated tricolour background and compact density mode.
- **Sensitivity Controls:** High-risk scoring threshold slider and telemetry refresh interval selector.

---

## 4. Backend & Machine Learning Integration Guide

The frontend is modularized so that your upcoming Python FastAPI backend and Machine Learning models connect seamlessly without rewriting UI components.

### Target REST API Endpoints
When starting the FastAPI backend on `http://127.0.0.1:8000`, implement the following routes:

#### 1. URL Analysis
```http
POST /api/v1/investigate/url
Content-Type: application/json

{
  "url": "http://sbi-kyc-verify-portal.in"
}
```
**Expected Response:**
```json
{
  "id": "TH-INV-98214",
  "url": "http://sbi-kyc-verify-portal.in",
  "domain": "sbi-kyc-verify-portal.in",
  "risk_level": "CONFIRMED_MALICIOUS",
  "risk_score": 97,
  "category": "Banking Impersonation & Phishing Credential Harvest",
  "shannon_entropy": 4.18,
  "subdomain_depth": 2,
  "is_punycode": false,
  "is_ip_hostname": false,
  "threat_feed_matches": ["URLhaus #8492019", "PhishTank #782194"],
  "indicators": [
    {
      "id": "IND-01",
      "title": "Institutional Impersonation (State Bank of India)",
      "category": "Identity Spoofing",
      "severity": "confirmed_malicious",
      "evidence": "Domain mimics sovereign banking service 'sbi' without sovereign authority origin.",
      "source": "Lexical Forensics Engine",
      "confidence": "High (Exact Keyword Vector)",
      "recommended_action": "Immediate blocking on enterprise resolver / Secure Web Gateway."
    }
  ]
}
```

#### 2. Message Analysis
```http
POST /api/v1/investigate/message
Content-Type: application/json

{
  "content": "Dear SBI User, your account has been suspended. Update KYC at http://sbi-kyc-verify-portal.in",
  "sender": "VM-SBIBNK"
}
```

#### 3. Domain & DNS Intelligence
```http
GET /api/v1/intelligence/domain?name=sbi-kyc-verify-portal.in
```

#### 4. TLS Certificate Analysis
```http
GET /api/v1/intelligence/tls?domain=sbi-kyc-verify-portal.in
```

#### 5. Health Check
```http
GET /api/health
```
**Expected Response:** `{"status": "ok", "engine": "FastAPI + ML Model"}`

---

## 5. Technology Stack

- **Framework:** React 19 + Vite 6
- **Language:** TypeScript 5.7 (Strict Mode)
- **Styling:** Tailwind CSS v4 + Custom Keyframe Animations
- **Motion & Transitions:** Framer Motion
- **Icons:** Lucide React
- **Data Visualization:** Recharts

---

## 6. Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation
```bash
# Clone or navigate to the project directory
cd TraceHawk

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will be accessible at:
```
http://127.0.0.1:3000
```

### Production Build
To verify TypeScript compilation and bundle the application for production:
```bash
npm run build
```
The compiled assets will be placed in the `dist/` directory.

To test the production build locally:
```bash
npm run preview
```

---

## 7. License & Credits

Developed for **TRACEHAWK — Hawk Shield**. Built strictly following non-repudiation, evidence-based cybersecurity verification principles.

