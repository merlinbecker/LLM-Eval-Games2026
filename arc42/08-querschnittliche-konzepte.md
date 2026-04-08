# 8. Querschnittliche Konzepte

## 8.1 End-to-End-Typsicherheit

```mermaid
flowchart LR
    A["OpenAPI 3.1 Spec<br/>(lib/api-spec/openapi.yaml)"] -->|Orval Codegen| B["Zod Schemas<br/>(lib/api-zod)"]
    A -->|Orval Codegen| C["React Query Hooks<br/>(lib/api-client-react)"]
    D["Store Interfaces<br/>(lib/store/src/types.ts)"] --> F["TypeScript Types<br/>für Gateway, Dataset, Competition"]

    B --> G["Runtime-Validierung<br/>im API Server"]
    C --> H["Typsicherer API-Zugriff<br/>im Frontend"]
    F --> G

    style A fill:#333,stroke:#000,color:#fff
    style D fill:#333,stroke:#000,color:#fff
```

Die Typsicherheit erstreckt sich über alle Schichten:
- **API-Kontrakt** → OpenAPI 3.1 YAML als Single Source of Truth
- **Frontend** → Generierte React-Query-Hooks mit vollständigen TypeScript-Typen
- **Backend** → Plain TypeScript-Interfaces in `@workspace/store` für Typ-Definitionen
- **Validation** → Generierte Zod-Schemas für Request/Response-Validierung

## 8.2 Sicherheitskonzept

| Maßnahme                             | Beschreibung                                                                                                   |
|---------------------------------------|---------------------------------------------------------------------------------------------------------------|
| **SSRF-Schutz**                      | `validateGatewayUrl()` blockiert HTTPS-Pflicht, localhost, private IPs (RFC 1918), Link-Local, Metadata-Endpunkte |
| **DNS-Auflösung**                    | IPv4/IPv6-Auflösung wird geprüft; blockiert, wenn aufgelöste IP privat ist                                     |
| **API-Key-Schutz (Client-Vault)**    | API-Keys werden im Browser mit AES-256-GCM verschlüsselt (PBKDF2, 100k Iterationen); nur bei Session-Sync an Server übertragen; im RAM gehalten, nie persistiert |
| **Session-Cookies**                  | HttpOnly, SameSite=Strict, Path=/api, Max-Age=7200 (2h); kein JavaScript-Zugriff auf Session-ID               |
| **Header-Redaktion**                 | Pino-Logger redaktiert `authorization`- und `cookie`-Header im Logging                                         |
| **Upload-Validierung**               | Multer: max 5MB, nur `.md`-Dateien; JSON-Body: max 10MB                                                        |
| **CORS**                             | Aktiviert via `cors({ origin: true, credentials: true })` Middleware                                            |

## 8.3 LLM-Gateway-API-Formate

Das System unterstützt drei API-Formate für Custom-Gateways. Die Transformation zwischen den Formaten erfolgt im `LLM Gateway Module` über dedizierte Provider-Helfer für Request-Building und Response-Parsing.

### OpenAI-kompatibel (`custom_openai`)

| Aspekt | Details |
|--------|---------|
| **Request** | `POST {baseUrl}` mit `{ messages: [{role, content}], model, temperature }` |
| **Response-Extraktion** | Content: `choices[0].message.content`; Tokens: `usage.prompt_tokens`, `usage.completion_tokens` |
| **Beispiel-URL** | `https://api.example.com/openai/deployments/{model}/chat/completions?api-version=2024-10-21` |

### Anthropic-kompatibel (`custom_anthropic`)

| Aspekt | Details |
|--------|---------|
| **Request** | `POST {baseUrl}` mit `{ messages: [{role, content: [{text}]}], system: [{text}], inferenceConfig: {maxTokens, temperature} }` |
| **Response-Extraktion** | Content: `output.message.content[0].text`; Tokens: `usage.inputTokens`, `usage.outputTokens` |
| **Beispiel-URL** | `https://api.example.com/anthropic/model/{model}/converse` |

### Gemini-kompatibel (`custom_gemini`)

| Aspekt | Details |
|--------|---------|
| **Request** | `POST {baseUrl}` mit `{ contents: [{role, parts: [{text}]}], systemInstruction: {role, parts: [{text}]}, generationConfig: {temperature, topP, topK} }` |
| **Response-Extraktion** | Content: `candidates[0].content.parts[0].text`; Tokens: `usageMetadata.promptTokenCount`, `usageMetadata.candidatesTokenCount` |
| **Beispiel-URL** | `https://api.example.com/google/v1beta1/.../models/{model}:generateContent` |

### URL-Platzhalter und Custom Headers

- **`{model}`-Platzhalter:** Wird in der Base-URL durch `encodeURIComponent(modelId)` ersetzt
- **Custom Headers:** Beliebige Key-Value HTTP-Header pro Gateway konfigurierbar (z.B. `api-key`, `Authorization`)
- **Rückwärtskompatibilität:** Legacy-Typ `custom` wird intern als `custom_openai` behandelt
- **Kein Models-Endpunkt:** Custom-Gateways haben keinen `/models`-Endpunkt; Modelle werden manuell eingegeben

## 8.4 Datenhaltungskonzept

Das System verzichtet bewusst auf eine externe Datenbank (siehe [ADR-9](09-architekturentscheidungen.md#adr-9)):

| Datentyp        | Client (Browser)                 | Server (Node.js)              | Begründung                                     |
|-----------------|----------------------------------|-------------------------------|-------------------------------------------------|
| **Gateways**    | Vault (AES-256-GCM verschlüsselt) | In-Memory (Session-Map)      | Enthält apiKey → muss verschlüsselt sein       |
| **Datasets**    | Vault (gzip-komprimiert)         | In-Memory (Session-Map)       | Können groß sein → Kompression spart Platz     |
| **Competitions** | —                               | In-Memory (Session-Map)       | Kurzlebig, laufende Evaluationen               |
| **Settings**    | Vault                            | —                             | Benutzereinstellungen, UI-Präferenzen          |

**Session-Lifecycle:** Sessions werden nach 2 Stunden Inaktivität automatisch bereinigt (Cleanup-Timer alle 5 Minuten). Der Client-Vault ist die primäre Datenquelle — ein Server-Neustart erfordert lediglich einen erneuten Session-Sync.

## 8.5 Retro-UI-Designsystem

Das UI folgt konsequent der **Macintosh System 5 Ästhetik** (ca. 1985):

| Element              | Umsetzung                                                                |
|----------------------|--------------------------------------------------------------------------|
| **Farbpalette**      | 1-bit Monochrom (Schwarz/Weiß) mit Dithering-Mustern                    |
| **Schriftarten**     | Silkscreen (Pixel-Font) für Überschriften; System-Monospace für Text     |
| **Fenster**          | `RetroWindow`: 3px Border, Titelleiste mit gestreiftem Hintergrund |
| **Buttons**          | `RetroButton`: Press-Effekt (translate), Varianten: primary/secondary/danger |
| **Formulare**        | `RetroInput`, `RetroTextarea`, `RetroSelect` mit 3px-Border und Focus-Ring |
| **Badges**           | `RetroBadge`: Inline mit Border, Uppercase, Letter-Spacing               |
| **Dreiecksdiagramm** | `TriangleChart`: SVG-basierter Ternary-Plot mit baryzentrischen Koordinaten; 3 Ecken (Qualität, Tempo, Effizienz); relative Normalisierung (1–10) anhand Min/Max aller Modelle (Speed/Cost invertiert: bester Wert → 10); Modelle als unterschiedliche Marker (Kreis, Quadrat, Raute, Dreieck, Kreuz); Gitterlinien bei 25%/50%/75%; Hover-Tooltip mit Z-Ordering |
| **Fensterinhalt**        | `RetroWindow` rendert stets einen klar abgegrenzten Content-Bereich unter der Titelleiste; Schließen erfolgt optional über einen dedizierten Close-Button |
| **Richter-Scoring-Overlay** | `JudgesScoreReveal`: Animiertes Overlay während laufender Wettbewerbe; `JudgeRevealRobot`-Komponenten mit CSS-Transition-Reveal und `animate-score-pop` (Bounce-Keyframe `scale 0.7→1.15→0.95→1`); absolut positioniert unter der Header-Bar (z-40); Queue-System (max. 4 Events) |

## 8.6 Fehlerbehandlung

| Schicht     | Strategie                                                                                                |
|-------------|----------------------------------------------------------------------------------------------------------|
| **Frontend** | `ApiError<T>` und `ResponseParseError` Klassen im Custom-Fetch; React-Query-Retry (1x)                 |
| **Backend**  | Express-Error-Handling; spezifische HTTP-Statuscodes (400, 401, 404, 500); Pino-Logging für alle Fehler  |
| **LLM**     | Timeout-Behandlung; Fehler bei LLM-Aufrufen werden als Wettbewerbs-Status `error` gespeichert            |
| **Session**  | 401-Response bei fehlender/ungültiger Session; Client initiiert automatisch Session-Sync                 |

## 8.7 Logging und Monitoring

- **Pino** als strukturierter Logger (JSON in Produktion, Pretty-Print in Entwicklung)
- **pino-http** Middleware für automatisches Request/Response-Logging
- Request-Serialisierung: nur `id`, `method`, `url` (ohne Query-Params)
- Response-Serialisierung: nur `statusCode`
- Sensible Daten (`authorization`, `cookie`) werden automatisch redaktiert
- **LLM-Call-Logging:** Jeder `chatCompletion()`-Aufruf wird automatisch im session-scoped In-Memory-Store geloggt (Request-Body, Response-Body, Status, Dauer, Fehler). Logs sind über `GET /api/logs` abrufbar und über die Logs-Seite im Frontend einsehbar. Pro Session werden maximal 500 Logs gespeichert (älteste werden verworfen). Die Logs-Seite bietet expandierbare Einträge mit einklappbarer, pretty-printed JSON-Ansicht und Auto-Refresh (5 Sekunden).

## 8.8 Background-Activity-Management

Langläufige Operationen (Wettbewerb-Evaluation, Datensatz-Generierung) werden als **Background Activities** verwaltet, damit der Benutzer die Anwendung frei weiternutzen kann.

**Backend-Pattern:**
- Bei Start einer langläufigen Operation wird ein `Activity`-Objekt im In-Memory-Store erstellt (`status: 'running'`)
- Der Endpunkt antwortet sofort (z.B. `202 Accepted`) und führt die Operation asynchron fort
- Fortschritt wird im Activity-Objekt aktualisiert (`progress`-Feld, z.B. "ModelXY: item 3/10")
- Bei Abschluss: `status: 'completed'`, `resultId` verweist auf das Ergebnis (Competition/Dataset-ID)
- Bei Fehler: `status: 'error'`, `error`-Feld enthält die Fehlermeldung
- REST-Endpunkte: `GET /api/activities` (alle), `GET /api/activities/:id` (einzeln), `POST /api/activities/:id/ack` (Kenntnisnahme)

**Frontend-Pattern:**
- `BackgroundActivityProvider` (React Context) pollt `GET /api/activities` alle 3 Sekunden
- Vergleicht vorherigen mit aktuellem Zustand; erkennt Statusänderungen (running → completed/error)
- Feuert **sonner**-Toast-Notifications bei Statuswechsel
- Automatische **Query-Invalidierung** (TanStack React Query) für betroffene Ressourcen (Datasets, Competitions)
- `ActivityDropdown` in der `TopMenu`-Leiste zeigt laufende/abgeschlossene Activities mit Badge-Counter
- Benutzer kann einzelne Activities als „zur Kenntnis genommen" markieren (`acknowledge`)

## 8.9 Gemeinsame Hilfsmodule (Code-Konsolidierung, April 2026)

Im Zuge einer Deduplizierungsinitiative (Branch `fix/optimization`) wurden ~200 doppelte Zeilen durch zentrale Hilfsmodule beseitigt.

### Backend

| Modul / Funktion | Datei | Beschreibung |
|---|---|---|
| `notFound(res, entity)` | `lib/route-utils.ts` | Einheitlicher 404-Express-Helper; ersetzt ~13 identische `res.status(404).json(...)`-Blöcke in allen Route-Dateien |
| `toGatewayConfig(g)` | `lib/llm-gateway.ts` | Wandelt einen Store-`Gateway`-Eintrag in das `GatewayConfig`-Interface um; ersetzt 6 Inline-Objekte in `datasets.ts`, `gateways.ts` und `competition-runner.ts` |
| `parseActivityId(id, res)` | `routes/activities.ts` | Lokaler Guard; parst die Activity-ID und antwortet mit 400 bei ungültiger Eingabe; ersetzt 2 identische `isNaN`-Blöcke |
| `getDefaultBase(type)` | `lib/llm-gateway/provider.ts` | Bereits vorhanden; `resolveGatewayBaseUrl()` in `gateways.ts` nutzt ihn jetzt direkt statt die URL-Mapping-Logik zu duplizieren |

### Frontend

| Modul / Funktion | Datei | Beschreibung |
|---|---|---|
| `computeAvgScore(judgeScores)` | `lib/competition-utils.ts` | Berechnet den mittleren Richter-Score; ersetzt 3 identische Reduce-Ausdrücke in `WinnersTab`, `RunProgressView` und `DetailsTab` |
| `sortByQuality(items)` | `lib/competition-utils.ts` | Generische Sortierfunktion nach `avgQuality`; ersetzt 5 Inline-Sortierungen in `CompetitionResults`, `Commentator`, `ArenaDashboard`, `QualityRanking` u. a. |
| `parseProgressTotal(progress)` | `lib/competition-utils.ts` | Regex-basiertes Parsen des `"x/y"`-Fortschrittsstrings; vereinheitlicht 2 inkonsistente Implementierungen (Regex vs. `indexOf`) in `Commentator` und `RunProgressView` |
| `RUNNING_POLL_INTERVAL` | `pages/CompetitionResults.tsx` | Konstante für das 2-Sekunden-Polling-Intervall; ersetzt 2 hardcodierte `2000`-Werte |
| `<RetroProgressBar percent>` | `components/retro.tsx` | Retro-Fortschrittsbalken-Komponente; ersetzt 2 identische JSX-Blöcke in `RunProgressView` und `ModelProgressBar` |
| ArenaDashboard Podium | `pages/ArenaDashboard.tsx` | 2 nahezu identische JSX-Podiumsarme durch eine einzelne `.map()`-Schleife ersetzt |

### OpenAPI-Spec

| Schema | Beschreibung |
|---|---|
| `GatewayType` | Als gemeinsames `$ref`-Schema in `openapi.yaml` extrahiert; `Gateway.type` und `CreateGateway.type` referenzieren es statt den Enum zu duplizieren; nach Codegen entfällt `CreateGatewayType` aus den generierten Dateien |

---