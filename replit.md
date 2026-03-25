# Workspace

## Overview

pnpm workspace monorepo using TypeScript. LLM-Eiskunstlauf-Meisterschaft (LLM Ice Skating Championship) — a gamified web app for comparing Large Language Models.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Data storage**: In-Memory Store (session-scoped) + Client-Vault (AES-256-GCM encrypted, LocalStorage)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Wouter + React Query

## Design

Macintosh System 5 / Winter Games 1985 aesthetic. Fully monochrome black-and-white, pixel/bitmap look, dithered patterns, checkerboard borders, Chicago-style pixel font. 8-bit robot personas for competing models. Olympic video game feel.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (In-Memory Store, Session-Management)
│   ├── llm-championship/   # React + Vite frontend (main web app, Client-Vault)
│   └── mockup-sandbox/     # Design prototyping sandbox
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── store/              # In-Memory Store (session-scoped Maps, TypeScript interfaces)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Data Architecture

The system uses **no external database**. Data is stored in two complementary layers:

- **Client-Vault (Browser)**: Encrypted LocalStorage vault (AES-256-GCM, PBKDF2 key derivation, gzip compression). Stores gateways (incl. API keys), datasets, and settings. Exportable as `.vault` file.
- **In-Memory Store (Server)**: Session-scoped `Map` objects in the API server. Populated via `POST /api/session/sync` when the vault is unlocked. Sessions identified by HttpOnly cookies; auto-cleaned after 2h inactivity.

### Data Model

- **Gateway**: LLM gateway config (name, type: openrouter/github_copilot/custom, baseUrl, apiKey)
- **Dataset**: Test dataset in Markdown format (name, content, systemPrompt, privacyStatus, privacyReport)
- **Competition**: Competition record (name, datasetId, systemPrompt, status, contestantModels/judgeModels, results)

## Key Features

1. **Gateway Management**: Configure multiple LLM providers (OpenRouter, GitHub Copilot SDK, Azure AI Foundry, custom OpenAI-compatible)
2. **Dataset Management**: Upload/generate Markdown test datasets, privacy/PII check, anonymization
3. **Competition System**: Select models + judges, run evaluation, collect speed/cost/quality metrics
4. **Results Visualization**: Radar chart (speed/cost/quality), podium view, detailed judge scores
5. **Client-Vault**: Encrypted browser-side data store with password protection, export/import

## API Endpoints

- `POST /api/session/sync` — Sync vault data to server, create session
- `DELETE /api/session` — Destroy session
- `GET /api/healthz` — Health check
- `GET/POST /api/gateways` — CRUD for LLM gateways
- `DELETE /api/gateways/:id`
- `GET /api/gateways/:id/models` — List models from a gateway
- `GET/POST /api/datasets` — CRUD for datasets
- `GET/DELETE /api/datasets/:id`
- `POST /api/datasets/:id/privacy-check` — PII analysis
- `POST /api/datasets/:id/anonymize` — Anonymize PII
- `POST /api/datasets/generate` — LLM-powered dataset generation
- `GET/POST /api/competitions` — CRUD for competitions
- `GET/DELETE /api/competitions/:id`
- `POST /api/competitions/:id/run` — Execute competition evaluation

All endpoints except `/healthz` and `/session/sync` require a valid session cookie.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with session management, in-memory store, and LLM gateway integration. Routes in `src/routes/`.

### `artifacts/llm-championship` (`@workspace/llm-championship`)

React + Vite frontend. Retro Macintosh System 5 design. Client-Vault for encrypted data storage. Pages: Arena, Datasets, Gateways, New Competition, Competition Results.

### `lib/store` (`@workspace/store`)

In-memory store with session-scoped Maps. TypeScript interfaces for Gateway, Dataset, Competition. Auto-cleanup after 2h inactivity.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval codegen config.

### `lib/api-zod` / `lib/api-client-react`

Generated Zod schemas and React Query hooks from OpenAPI spec.

## LLM Gateway Architecture

The backend (`artifacts/api-server/src/lib/llm-gateway.ts`) implements a universal adapter supporting:
- **OpenRouter**: OpenAI-compatible API at `https://openrouter.ai/api/v1`
- **GitHub Copilot SDK**: GitHub Models API
- **Custom**: Any OpenAI-compatible endpoint (Azure AI Foundry, self-hosted, etc.)

All gateways use the standard `/chat/completions` and `/models` endpoints.
