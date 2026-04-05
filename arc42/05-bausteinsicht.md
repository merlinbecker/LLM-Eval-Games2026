# 5. Bausteinsicht

## 5.1 Whitebox Gesamtsystem (Ebene 1)

```mermaid
C4Container
    title Container-Diagramm — LLM Championship

    Person(user, "Benutzer", "KI-Ingenieur / Prompt-Entwickler")

    System_Boundary(monorepo, "LLM Championship Monorepo") {

        Container(frontend, \"LLM Championship Frontend\", \"React 19, Vite, TypeScript, Tailwind CSS\", \"Single Page Application mit Retro-UI (Macintosh System 5). Client-Vault (AES-256-GCM, LocalStorage). Seiten: Dashboard, Gateways, Datasets, NewCompetition, CompetitionResults, Logs\")

        Container(apiClient, "API Client React", "TypeScript, React Query, Orval", "Generierte React-Query-Hooks und Fetch-Wrapper für alle API-Endpunkte")

        Container(apiServer, \"API Server\", \"Express 5, Node.js 24, TypeScript\", \"REST-API mit Session-Management, In-Memory-Store, Routen für Gateways, Datasets, Competitions, Logs und Health. LLM-Gateway-Integration, Evaluations-Engine und automatisches LLM-Call-Logging\")

        Container(storeLib, "Store Library", "TypeScript", "In-Memory-Store mit session-scoped Maps; TypeScript-Interfaces für Gateway, Dataset, Competition")

        Container(apiZod, "API Zod Schemas", "Zod, Orval", "Generierte Zod-Validierungsschemas aus OpenAPI-Spec für alle Request/Response-Typen")

        Container(apiSpec, "API Specification", "OpenAPI 3.1 YAML", "Zentrale API-Kontraktdefinition; Quelle für Codegenerierung")
    }

    System_Ext(llmAPIs, "LLM Gateway APIs", "OpenRouter, GitHub Copilot, Custom (OpenAI/Anthropic/Gemini)")

    Rel(user, frontend, "Nutzt", "HTTPS / Browser")
    Rel(frontend, apiClient, "Importiert", "npm-Paket")
    Rel(apiClient, apiServer, "REST/JSON + Session-Cookie", "/api/*")
    Rel(apiServer, storeLib, "Importiert", "npm-Paket")
    Rel(apiServer, llmAPIs, "HTTPS", "/chat/completions, /models")
    Rel(apiSpec, apiClient, "Generiert", "Orval Codegen")
    Rel(apiSpec, apiZod, "Generiert", "Orval Codegen")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Enthaltene Bausteine (Blackboxen)

| Baustein              | Verantwortung                                                                                               | Paket                        |
|-----------------------|-------------------------------------------------------------------------------------------------------------|------------------------------|
| **Frontend SPA**      | Darstellung der Retro-UI; Benutzerinteraktion; Client-Vault-Management; Zustandsverwaltung via React Query  | `@workspace/llm-championship` |
| **API Client React**  | Generierte React-Query-Hooks und Custom-Fetch-Wrapper; typsicherer API-Zugriff mit Session-Cookie           | `@workspace/api-client-react` |
| **API Server**        | REST-Endpunkte; Geschäftslogik für Gateway-Verwaltung, Dataset-Operationen, Wettbewerbs-Evaluation           | `@workspace/api-server`       |
| **Store Library**     | In-Memory-Store mit session-scoped Maps; gemeinsame Dataset-Markdown-Helfer; TypeScript-Interfaces für Gateway, Dataset, Competition | `@workspace/store`            |
| **API Zod Schemas**   | Generierte Zod-Schemas für Request/Response-Validierung                                                     | `@workspace/api-zod`          |
| **API Specification** | OpenAPI-3.1-Kontraktdefinition als YAML; Quelle für Client- und Schema-Generierung                          | `@workspace/api-spec`         |

### Wichtige Schnittstellen

| Schnittstelle          | Beschreibung                                                                                           |
|------------------------|--------------------------------------------------------------------------------------------------------|
| REST API `/api/*`      | JSON-basierte REST-API zwischen Frontend und Backend; definiert über OpenAPI-Spec; Session-Cookie für Authentifizierung |
| LLM Gateway Interface  | Multi-Format LLM-Interface: OpenAI Chat Completions, Anthropic Converse, Gemini generateContent; automatische Request/Response-Transformation je Gateway-Typ; Custom HTTP Headers und `{model}`-URL-Platzhalter für Custom-Endpunkte |
| Session-Sync           | `POST /api/session/sync` zum Restaurieren von Vault-Daten in den In-Memory-Store                       |

---

## 5.2 Ebene 2 — API Server (Whitebox)

```mermaid
C4Component
    title Komponenten-Diagramm — API Server

    Container_Boundary(apiServer, "API Server (Express 5)") {

        Component(app, "App (Express)", "express, cors, cookie-parser, pino-http", "Middleware-Stack: Logging, CORS, Cookie-Parsing, JSON-Parsing, Router-Mount auf /api")

        Component(sessionMiddleware, "Session Middleware", "TypeScript", "Prüft Session-Cookie; schützt alle Routen außer /healthz und /session/sync; liefert 401 bei fehlender Session")

        Component(sessionRoute, "Session Router", "express.Router", "POST /session/sync — Vault-Daten importieren und Session erstellen; DELETE /session — Session löschen")

        Component(healthRoute, "Health Router", "express.Router", "GET /healthz — Systemstatus")

        Component(gatewaysRoute, "Gateways Router", "express.Router", "CRUD für LLM-Gateways; GET /gateways/:id/models für Modellauflistung")

        Component(datasetsRoute, "Datasets Router", "express.Router", "CRUD, Upload (Multer), Privacy-Check, Anonymisierung, KI-Generierung von Datensätzen")

        Component(competitionsRoute, "Competitions Router", "express.Router", "CRUD für Wettbewerbe; POST /competitions/:id/run delegiert die asynchrone Evaluation an den Competition Runner")

        Component(competitionRunner, "Competition Runner Service", "TypeScript", "Orchestriert Wettbewerbsdurchläufe: Gateway-Lookup, Contestant-/Judge-Calls, partielle Resultatpersistenz, Cost-/Score-Berechnung und Activity-Progress")

        Component(logsRoute, "Logs Router", "express.Router", "GET /logs — Alle LLM-Call-Logs abrufen; DELETE /logs — Logs löschen")

        Component(activitiesRoute, "Activities Router", "express.Router", "GET /activities — Alle Background-Activities auflisten; GET /activities/:id — Einzelne Activity; POST /activities/:id/ack — Als gelesen markieren")

        Component(llmGateway, "LLM Gateway Module", "TypeScript", "chatCompletion(), listModelsFromGateway(), validateGatewayUrl() — Multi-Format LLM-Kommunikation (OpenAI/Anthropic/Gemini), intern in Provider-/Security-/Typ-Helfer aufgeteilt; SSRF-Schutz, Custom Headers und automatisches Call-Logging")

        Component(logger, "Logger", "Pino", "Strukturiertes Logging; JSON (Prod) / Pretty-Print (Dev); redaktiert Auth-Header")
    }

    Container(storeLib, "Store Library", "In-Memory-Store")
    System_Ext(llmAPIs, "LLM Gateway APIs", "Extern")

    Rel(app, sessionRoute, "Routet zu", "(öffentlich)")
    Rel(app, sessionMiddleware, "Middleware", "(schützt folgende Routen)")
    Rel(app, healthRoute, "Routet zu", "(öffentlich)")
    Rel(app, gatewaysRoute, "Routet zu", "(geschützt)")
    Rel(app, datasetsRoute, "Routet zu", "(geschützt)")
    Rel(app, competitionsRoute, "Routet zu", "(geschützt)")
    Rel(app, logsRoute, "Routet zu", "(geschützt)")
    Rel(app, activitiesRoute, "Routet zu", "(geschützt)")

    Rel(activitiesRoute, storeLib, "Liest/Schreibt", "session-scoped Activities")

    Rel(gatewaysRoute, llmGateway, "Nutzt", "Modelle auflisten")
    Rel(datasetsRoute, llmGateway, "Nutzt", "Privacy-Check, Anonymisierung, Generierung")
    Rel(competitionsRoute, competitionRunner, "Delegiert", "Run-Orchestrierung")
    Rel(competitionRunner, llmGateway, "Nutzt", "Evaluation: Teilnehmer + Richter")

    Rel(gatewaysRoute, storeLib, "Liest/Schreibt", "session-scoped Gateways")
    Rel(datasetsRoute, storeLib, "Liest/Schreibt", "session-scoped Datasets")
    Rel(competitionsRoute, storeLib, "Liest/Schreibt", "session-scoped Competitions (CRUD)")
    Rel(competitionRunner, storeLib, "Liest/Schreibt", "session-scoped Competitions + Activities")
    Rel(logsRoute, storeLib, "Liest/Löscht", "session-scoped LLM-Logs")
    Rel(sessionRoute, storeLib, "Erstellt/Löscht", "Sessions + Bulk-Import")

    Rel(llmGateway, llmAPIs, "HTTPS", "/chat/completions, /models")

    Rel(app, logger, "Nutzt")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Whitebox API Server — Komponentenbeschreibung

| Komponente              | Verantwortung                                                                                                                     |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **App**                 | Express-Instanz; Stack: `pinoHttp` → `cors({ credentials: true })` → `cookieParser()` → `express.json (10MB)` → `express.urlencoded` → Router `/api` |
| **Session Middleware**  | Prüft HttpOnly-Cookie `sessionId`; ruft `store.touchSession()` auf; liefert 401 für ungültige Sessions; `/healthz` und `/session/sync` passieren ohne Session |
| **Session Router**      | `POST /session/sync` — erstellt Session, importiert Gateways+Datasets aus Vault; `DELETE /session` — löscht Session und Cookie    |
| **Health Router**       | `GET /healthz` → `{ status: "ok" }`                                                                                               |
| **Gateways Router**     | `GET/POST /gateways`, `DELETE /gateways/:id`, `GET /gateways/:id/models`; validiert und speichert Gateway-Konfigurationen; `GET/POST /configured-models`, `DELETE /configured-models/:id` — vorkonfigurierte Modelle mit optionalen Kosten ($/M Tokens) verwalten |
| **Datasets Router**     | `GET/POST /datasets`, `POST /datasets/upload` (Multer, 5MB, .md), `DELETE /datasets/:id`, Privacy-Check/Anonymisierung/Generierung |
| **Competitions Router** | `GET/POST /competitions`, `GET/DELETE /competitions/:id`, `POST /competitions/:id/run`; hält HTTP-Validierung und Response-Wiring schlank und delegiert die Run-Orchestrierung an den Competition Runner |
| **Competition Runner Service** | Führt Wettbewerbe aus: lädt Gateway-Mapping, ruft Contestants und Judges auf, speichert partielle Ergebnisse, aktualisiert Activities und berechnet aggregierte Kennzahlen |
| **Logs Router**         | `GET /logs` — LLM-Call-Logs der aktuellen Session abrufen (neueste zuerst); `DELETE /logs` — alle Logs löschen                    |
| **Activities Router**   | `GET /activities` — alle Background-Activities auflisten; `GET /activities/:id` — einzelne Activity; `POST /activities/:id/ack` — als gelesen markieren |
| **LLM Gateway Module**  | Zentrale LLM-Kommunikation: `chatCompletion()`, `listModelsFromGateway()`, `validateGatewayUrl()` mit SSRF-Schutz; intern in Provider-/Security-/Typ-Helfer zerlegt; Multi-Format-Support (OpenAI, Anthropic Converse, Gemini generateContent) via Provider-Mapper für Request/Response; Custom HTTP Headers; `{model}`-URL-Platzhalter; automatisches Call-Logging (Request/Response) in den Session-Store |
| **Logger**              | Pino-Logger; strukturiertes JSON-Logging in Produktion; Pretty-Print in Entwicklung; Redaktion sensibler Header                    |

---

## 5.3 Ebene 2 — Frontend SPA (Whitebox)

```mermaid
C4Component
    title Komponenten-Diagramm — Frontend SPA

    Container_Boundary(frontend, "LLM Championship Frontend (React 19)") {

        Component(appShell, "App Shell", "React, Wouter, React Query", "VaultProvider, QueryClientProvider, VaultGuard-Wrapper, BackgroundActivityProvider, Toaster (sonner), Router-Setup, TopMenu-Layout")

        Component(vaultSystem, "Vault-System", "Web Crypto API, React Context", "VaultGuard (Login/Unlock-UI), VaultStore (State-Management), Crypto (AES-256-GCM, PBKDF2), Sync (Server-Session)")

        Component(bgActivities, "Background-Activity-System", "React Context, sonner", "BackgroundActivityProvider: Pollt GET /api/activities alle 3s; erkennt Status-Änderungen; zeigt Toast-Notifications bei Abschluss/Fehler; invalidiert Queries automatisch")

        Component(topMenu, "TopMenu", "React", "Navigationsleiste im Retro-Stil mit Links, Vault-Lock, Export, Sync-Indikator, ActivityDropdown (Spinner + Badge für laufende Jobs)")

        Component(arenaDashboard, "Arena Dashboard", "React", "Hero-Bereich, Feature-Karten, aktuelle Wettbewerbe als Tabelle")

        Component(gatewaysPage, "Gateways Page", "React", "2-Spalten-Layout: Gateway-Liste + Formular (5 Provider-Typen: OpenRouter, GitHub Copilot, Custom OpenAI/Anthropic/Gemini); Custom-Header-Editor; Vault-Sync bei CRUD")

        Component(datasetsPage, "Datasets Page", "React", "3 Tabs: Databanks-Liste, Upload (Datei/Text), KI-Generator; Vault-Sync bei CRUD")

        Component(newCompetition, "New Competition", "React", "Formular: Name, Dataset, System-Prompt, Teilnehmer-/Richterauswahl")

        Component(judgesScoreReveal, "JudgesScoreReveal", "React", "Animiertes Richter-Scoring-Overlay: Queue-basierte State-Machine (entering→revealing→holding→exiting→idle); Roboter halten Wertungskarten hoch")

        Component(competitionResults, "Competition Results", "React, SVG", "Tab-basierte Ergebnisdarstellung: (1) Übersicht — Statistik-Kacheln, Gewinner-Highlight, Dreiecksdiagramm, Rangliste; (2) Gewinner & Judges — Podium, Modell-Auswahl, Judge-Roboter mit Wertungskarten, Zeit/Kosten; (3) Detail-Antworten — Vollständige Antworten und Einzelbewertungen pro Frage mit Fragen-Navigation. Live-Polling (2s), JudgesScoreReveal-Overlay im Running-State")

        Component(logsPage, "Logs Page", "React", "LLM-Call-Log-Viewer: expandierbare Einträge mit Status, Modell, Dauer, Timestamp; einklappbare JSON-Ansicht für Request/Response; Auto-Refresh (5s); Clear-Funktion")

        Component(retroComponents, "Retro-Komponentenbibliothek", "React, Tailwind CSS", "RetroWindow, RetroButton, RetroInput, RetroTextarea, RetroSelect, RetroBadge, RobotIcon, JudgeRevealRobot")
    }

    Container(apiClient, "API Client React", "React Query Hooks")

    Rel(appShell, vaultSystem, "Wraps")
    Rel(appShell, bgActivities, "Wraps")
    Rel(appShell, topMenu, "Rendert")
    Rel(topMenu, bgActivities, "useBackgroundActivities()")
    Rel(bgActivities, apiClient, "useListActivities(), useAcknowledgeActivity()")
    Rel(appShell, arenaDashboard, "Route: /")
    Rel(appShell, gatewaysPage, "Route: /gateways")
    Rel(appShell, datasetsPage, "Route: /datasets")
    Rel(appShell, newCompetition, "Route: /competitions/new")
    Rel(appShell, competitionResults, "Route: /competitions/:id")
    Rel(appShell, logsPage, "Route: /logs")

    Rel(vaultSystem, apiClient, "POST /session/sync, DELETE /session")
    Rel(arenaDashboard, apiClient, "useListCompetitions()")
    Rel(gatewaysPage, apiClient, "useListGateways(), useCreateGateway(), useDeleteGateway()")
    Rel(datasetsPage, apiClient, "useListDatasets(), useCreateDataset(), useUploadDataset(), useGenerateDataset(), usePrivacyCheckDataset()")
    Rel(newCompetition, apiClient, "useCreateCompetition(), useListGateways(), useListGatewayModels()")
    Rel(competitionResults, apiClient, "useGetCompetition(), useRunCompetition(), useGetDataset()")
    Rel(competitionResults, judgesScoreReveal, "Rendert im Running-State als Overlay")
    Rel(logsPage, apiClient, "useListLlmLogs(), useClearLlmLogs()")

    Rel(arenaDashboard, retroComponents, "Nutzt")
    Rel(gatewaysPage, retroComponents, "Nutzt")
    Rel(datasetsPage, retroComponents, "Nutzt")
    Rel(newCompetition, retroComponents, "Nutzt")
    Rel(competitionResults, retroComponents, "Nutzt")
    Rel(logsPage, retroComponents, "Nutzt")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

## 5.4 Ebene 2 — Store Library (Whitebox)

```mermaid
C4Component
    title Komponenten-Diagramm — Store Library

    Container_Boundary(storeLib, "Store Library (@workspace/store)") {

        Component(storeIndex, "InMemoryStore", "TypeScript", "Singleton-Klasse mit session-scoped Maps; CRUD für Gateways, Datasets, Competitions, Activities; gemeinsame Dataset-Markdown-Normalisierung/-Segmentierung; Bulk-Import; Cleanup-Timer (5min Intervall, 2h TTL)")

        Component(storeTypes, "Type Definitions", "TypeScript", "Plain Interfaces und Pure Helpers: Gateway, Dataset, Competition, Activity, LlmLog, ConfiguredModel, CreateGateway, CreateDataset, CreateCompetition, CreateActivity, CreateConfiguredModel, ModelSelection, CompetitionResultEntry, Dataset-Markdown-Parser/Serializer")
    }

    Container(apiServer, "API Server", "Express 5")

    Rel(storeIndex, storeTypes, "Importiert")
    Rel(apiServer, storeIndex, "store.listGateways(), store.createGateway(), ...", "Session-scoped CRUD")
```

### Store Library — Datenmodell

| Interface           | Felder                                                                                                    |
|---------------------|-----------------------------------------------------------------------------------------------------------|
| **Gateway**         | `id`, `name`, `type` (openrouter/github_copilot/custom_openai/custom_anthropic/custom_gemini), `baseUrl`, `apiKey`, `customHeaders?`, `createdAt` |
| **ConfiguredModel** | `id`, `name`, `gatewayId`, `modelId`, `inputCostPerMillionTokens?`, `outputCostPerMillionTokens?`, `createdAt` |
| **Dataset**         | `id`, `name`, `content` (Markdown), `privacyStatus`, `privacyReport`, `createdAt`                        |
| **Competition**     | `id`, `name`, `datasetId`, `systemPrompt`, `status`, `contestantModels`, `judgeModels`, `results`, `createdAt` |
| **ModelSelection**  | `gatewayId`, `modelId`, `modelName`, `inputCostPerMillionTokens?`, `outputCostPerMillionTokens?`          |
| **LlmLog**          | `id`, `timestamp`, `gatewayType`, `modelId`, `requestUrl`, `requestBody`, `responseStatus`, `responseBody`, `durationMs`, `error` |
| **Activity**        | `id`, `type` (competition_run/dataset_generate), `status` (running/completed/error), `title`, `progress?`, `resultId?`, `error?`, `acknowledged`, `createdAt`, `completedAt?` |

Jede Session hat eigene Counter (`nextId`) und Maps; Sessions werden nach 2 Stunden Inaktivität automatisch bereinigt. LLM-Logs werden als Array pro Session gespeichert (max. 500 Einträge, FIFO). Activities tracken den Status langläufiger Hintergrund-Operationen und können vom Frontend als gelesen markiert werden.
Zusätzlich exportiert `@workspace/store` gemeinsame Pure Helpers zur Dataset-Markdown-Verarbeitung: Wrapping-Code-Fences werden normalisiert, Items werden konsistent über `##`-Überschriften oder Absatz-Fallback segmentiert, und bearbeitete Items werden wieder kanonisch serialisiert.

---

## 5.5 Ebene 2 — Client-Vault (Whitebox)

```mermaid
C4Component
    title Komponenten-Diagramm — Client-Vault

    Container_Boundary(vault, "Client-Vault (Browser)") {

        Component(vaultCrypto, "Crypto Module", "Web Crypto API", "encrypt(): PBKDF2 → AES-256-GCM + gzip; decrypt(): AES-256-GCM → gunzip; 100k Iterationen, 16-Byte Salt, 12-Byte IV")

        Component(vaultStore, "Vault Store", "React Context", "VaultProvider + useVault Hook; Zustände: no-vault, locked, unlocked; Auto-Save (2s debounced); Mutations: addGateway, removeGateway, addDataset, updateDataset, removeDataset")

        Component(vaultSync, "Vault Sync", "TypeScript", "syncToServer(): POST /api/session/sync mit Vault-Payload; deleteSession(): DELETE /api/session; Fire-and-forget bei Mutationen")

        Component(vaultGuard, "VaultGuard", "React", "Gatekeeper-Komponente: zeigt Unlock-Formular (locked) oder Welcome-Formular mit Create/Import (no-vault)")

        Component(vaultTypes, "Vault Types", "TypeScript", "VaultData, VaultGateway, VaultDataset, VaultSettings, StoredVault")
    }

    Container(localStorage, "LocalStorage", "Browser API", "Schlüssel: llm-championship-vault")

    Rel(vaultStore, vaultCrypto, "Verschlüsselt/Entschlüsselt")
    Rel(vaultStore, localStorage, "Liest/Schreibt", "StoredVault (Base64)")
    Rel(vaultStore, vaultSync, "Synchronisiert bei Unlock + Mutationen")
    Rel(vaultGuard, vaultStore, "Prüft Status, ruft unlock/create auf")
    Rel(vaultStore, vaultTypes, "Nutzt")
```

### Vault — Verschlüsselungsarchitektur

```
Klartext-JSON  →  gzip  →  AES-256-GCM verschlüsseln  →  Base64  →  LocalStorage
LocalStorage   →  Base64-Decode  →  AES-256-GCM entschlüsseln  →  gunzip  →  JSON
```

| Eigenschaft        | Wert                                        |
|--------------------|---------------------------------------------|
| Schlüsselableitung | PBKDF2, 100.000 Iterationen, SHA-256        |
| Verschlüsselung    | AES-256-GCM                                 |
| Salt               | 16 Bytes (crypto.getRandomValues)           |
| IV                 | 12 Bytes (pro Verschlüsselung neu erzeugt)  |
| Kompression        | gzip via CompressionStream/DecompressionStream |
| Speicherort        | LocalStorage, Schlüssel `llm-championship-vault` |
| Export             | `.vault`-Datei (gleiches Format)            |

---