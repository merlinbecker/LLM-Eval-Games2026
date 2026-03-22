# Workspace

## Overview

pnpm workspace monorepo using TypeScript. LLM-Eiskunstlauf-Meisterschaft (LLM Ice Skating Championship) — a gamified web app for comparing Large Language Models.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Wouter + React Query

## Design

Macintosh System 5 / Winter Games 1985 aesthetic. Fully monochrome black-and-white, pixel/bitmap look, dithered patterns, checkerboard borders, Chicago-style pixel font. 8-bit robot personas for competing models. Olympic video game feel.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   ├── llm-championship/   # React + Vite frontend (main web app)
│   └── mockup-sandbox/     # Design prototyping sandbox
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Database Schema

- **gateways**: LLM gateway configurations (name, type: openrouter/github_copilot/custom, baseUrl, apiKey)
- **datasets**: Test datasets in Markdown format (name, content, systemPrompt, privacyStatus, privacyReport)
- **competitions**: Competition records (name, datasetId, systemPrompt, status, contestantModels/judgeModels as JSONB, results as JSONB)

## Key Features

1. **Gateway Management**: Configure multiple LLM providers (OpenRouter, GitHub Copilot SDK, Azure AI Foundry, custom OpenAI-compatible)
2. **Dataset Management**: Upload/generate Markdown test datasets, privacy/PII check, anonymization
3. **Competition System**: Select models + judges, run evaluation, collect speed/cost/quality metrics
4. **Results Visualization**: Radar chart (speed/cost/quality), podium view, detailed judge scores

## API Endpoints

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

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with LLM gateway integration. Routes in `src/routes/`.

### `artifacts/llm-championship` (`@workspace/llm-championship`)

React + Vite frontend. Retro Macintosh System 5 design. Pages: Arena, Datasets, Gateways, New Competition, Competition Results.

### `lib/db` (`@workspace/db`)

Database layer with Drizzle ORM. Schemas: gateways, datasets, competitions.

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
