<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-orange" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/node-24%2B-brightgreen" alt="Node 24+" />
  <img src="https://img.shields.io/badge/pnpm-monorepo-blue" alt="pnpm" />
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
</p>

<p align="center">
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=alert_status" alt="Quality Gate Status" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=security_rating" alt="Security Rating" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=reliability_rating" alt="Reliability Rating" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=sqale_rating" alt="Maintainability Rating" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=coverage" alt="Coverage" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=bugs" alt="Bugs" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=merlinbecker_LLM-Eval-Games2026"><img src="https://sonarcloud.io/api/project_badges/measure?project=merlinbecker_LLM-Eval-Games2026&metric=code_smells" alt="Code Smells" /></a>
</p>

# 🏆 LLM Championship — *Winter Games '85*

> **A gamified web application for evaluating and comparing Large Language Models — wrapped in a nostalgic Macintosh System 5 aesthetic.**

Pit LLMs against each other in head-to-head competitions. Let AI judges score them. Visualize the results on podiums and triangle charts. All with a charming 1-bit retro UI that feels like booting up a 1985 Macintosh.

---

## ✨ Features at a Glance

### 🔌 Multi-Gateway LLM Connectivity
Connect to any LLM provider through a unified gateway system:
- **OpenRouter** — access hundreds of models through a single API key
- **GitHub Copilot** — use GitHub's Copilot model endpoint
- **Custom Endpoints** — plug in any OpenAI-, Anthropic-, or Gemini-compatible API with custom headers and full URL configuration
- Built-in **SSRF protection** — all gateway URLs are validated against private IP ranges, localhost, and metadata endpoints

### 📋 Dataset Management
- **Upload** Markdown-formatted test datasets (`.md` files)
- **AI-Generate** datasets on any topic using a connected LLM
- **Privacy Check** — AI-powered PII detection scans your data for personal information
- **Anonymization** — automatically replace detected PII with synthetic data
- Datasets are parsed into individual test items (split by `##` headings or paragraphs)

### 🏟️ Competition System
Create tournaments where contestant models answer questions and judge models score them:
- Select **contestant models** (the ones being evaluated)
- Select **judge models** (3–5 LLMs that score each response 1–10 with reasoning)
- Attach a **system prompt** to shape model behavior
- **Parallel evaluation** — up to 5 models evaluated concurrently
- **Live progress** — watch results stream in with 2-second polling

### 🎯 Animated Judge Scoring
During live competitions, an animated overlay shows judges revealing their scores in real time:
- Robot judges hold up score cards with bounce animations
- Scores are revealed one by one with a running average
- Queue-based state machine ensures smooth transitions between scoring events

### 📊 Results & Visualization
- **Podium View** — 1st, 2nd, 3rd place with robot avatars and medals
- **Triangle Chart** — SVG ternary plot mapping each model across three axes:
  - **Quality** (judge scores)
  - **Speed** (response time)
  - **Efficiency** (cost per token)
  - Scores are **relatively normalized** (1–10) across all models — best gets 10, worst gets 1
- **Detail View** — drill into individual questions: see the original dataset prompt, each model's response, and every judge's score with reasoning
- **Winner & Judge Cards** — dedicated views for the fastest, cheapest, and highest-quality models

### 🔒 Client-Side Vault
Your API keys never leave your browser unencrypted:
- **AES-256-GCM** encryption with **PBKDF2** key derivation (100k iterations)
- Stored in LocalStorage with gzip compression
- Export / import as `.vault` files for backup and portability
- All data synced to the server only within encrypted sessions

### 🖥️ Retro UI Design System
Every pixel is crafted to evoke the Macintosh System 5 era:
- 1-bit monochrome palette with dithering patterns
- Pixel fonts (Silkscreen, VT323)
- Collapsible `RetroWindow` components with striped title bars
- 8-bit robot avatars for competing models
- Press-effect buttons, 3px borders, and checkerboard backgrounds

---

## 🏗️ Architecture

```
LLM-Eval-Games2026/
├── artifacts/
│   ├── api-server/            Express 5 REST API (in-memory store, session management)
│   ├── llm-championship/      React 19 SPA (main application)
│   └── mockup-sandbox/        Design prototyping sandbox
├── lib/
│   ├── api-spec/              OpenAPI 3.1 spec (single source of truth)
│   ├── api-client-react/      Generated React Query hooks (via Orval)
│   ├── api-zod/               Generated Zod validation schemas
│   └── store/                 In-memory store with TypeScript interfaces
├── scripts/                   Startup & utility scripts
└── plans/                     Feature planning documents
```

**End-to-end type safety:** The OpenAPI 3.1 specification generates both the React Query client hooks and Zod validation schemas via Orval — ensuring types stay in sync from API contract to UI.

**No database required:** The system uses an in-memory store (session-scoped) on the server and an encrypted client-side vault in the browser. A server restart only requires a quick re-sync from the vault.

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | 24+ |
| **pnpm** | 9+ |

### Installation

```bash
# Clone the repository
git clone https://github.com/merlinbecker/LLM-Eval-Games2026.git
cd LLM-Eval-Games2026

# Install dependencies
pnpm install
```

### Running the Application

The quickest way to start both the API server and the frontend:

```bash
pnpm run start:app
```

This runs [`scripts/start-app.sh`](scripts/start-app.sh), which:
1. Starts the **API server** on port `8080`
2. Starts the **frontend dev server** on port `20529`
3. Opens `http://localhost:20529` in your browser

#### Custom Ports

```bash
API_PORT=3001 WEB_PORT=5173 pnpm run start:app
```

#### Running Services Individually

```bash
# API server only
pnpm --filter @workspace/api-server run dev

# Frontend only (requires API server running)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/llm-championship run dev
```

### Building for Production

```bash
pnpm run build
```

This type-checks all packages and builds both the API server (via esbuild) and the frontend (via Vite).

### Running Tests

```bash
# Run all tests
pnpm --filter @workspace/llm-championship run test

# Watch mode
pnpm --filter @workspace/llm-championship run test:watch

# With coverage
pnpm --filter @workspace/llm-championship run test:coverage
```

### Type Checking

```bash
# Check everything
pnpm run typecheck

# Check libraries only
pnpm run typecheck:libs
```

---

## 🎮 Quick Start Guide

1. **Create a Vault** — On first launch, set a password to create your encrypted vault
2. **Add a Gateway** — Go to *Gateways* and configure an LLM provider (e.g., OpenRouter with your API key)
3. **Add Models** — Browse available models from your gateway and configure the ones you want to use
4. **Create a Dataset** — Go to *Datasets* and upload a Markdown file with test questions, or generate one with AI
5. **Run a Competition** — Go to *New Competition*, pick contestants and judges, then hit **INITIATE RUN**
6. **Watch the Results** — See live judge scoring animations, then explore the podium, triangle chart, and detailed breakdowns

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Wouter, TanStack React Query |
| **Backend** | Express 5, Node.js 24, Pino logging |
| **Language** | TypeScript 5.9 (strict) |
| **API Contract** | OpenAPI 3.1 → Orval → React Query hooks + Zod schemas |
| **Encryption** | Web Crypto API (AES-256-GCM, PBKDF2) |
| **Testing** | Vitest, Testing Library |
| **Build** | esbuild (API), Vite (frontend), pnpm workspaces |
| **UI** | Custom retro component library (RetroWindow, RetroButton, RobotIcon, etc.) |

---

## 📡 API Overview

All endpoints are served under `/api` and require a valid session (except health check and session sync).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/session/sync` | Sync vault data, create session |
| `DELETE` | `/session` | Destroy session |
| `GET` | `/healthz` | Health check |
| `GET/POST` | `/gateways` | List / create gateways |
| `DELETE` | `/gateways/:id` | Delete a gateway |
| `GET` | `/gateways/:id/models` | List models from a gateway |
| `GET/POST` | `/configured-models` | List / create pre-configured models |
| `DELETE` | `/configured-models/:id` | Delete a configured model |
| `GET/POST` | `/datasets` | List / create datasets |
| `GET/DELETE` | `/datasets/:id` | Get / delete a dataset |
| `POST` | `/datasets/upload` | Upload Markdown dataset |
| `POST` | `/datasets/:id/privacy-check` | AI-powered PII detection |
| `POST` | `/datasets/:id/anonymize` | Anonymize detected PII |
| `POST` | `/datasets/generate` | AI-generate a dataset |
| `GET/POST` | `/competitions` | List / create competitions |
| `GET/DELETE` | `/competitions/:id` | Get / delete a competition |
| `POST` | `/competitions/:id/run` | Execute competition evaluation |
| `GET` | `/activities` | List background activities |
| `POST` | `/activities/:id/ack` | Acknowledge an activity |
| `GET` | `/logs` | List LLM call logs |
| `DELETE` | `/logs` | Clear all logs |

Full specification: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml)

---

## 📖 Documentation

Comprehensive architecture documentation following the **arc42** template is available in [`arc42.md`](arc42.md). It covers:

- System context & stakeholders
- Building block views (3 levels deep)
- Runtime scenarios (vault sync, competition flow, gateway config, privacy checks)
- Cross-cutting concepts (security, type safety, retro UI system)
- Architecture decision records (ADR-9: In-Memory Store + Vault vs. PostgreSQL)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
