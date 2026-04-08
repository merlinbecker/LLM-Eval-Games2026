# 3. Kontextabgrenzung

## 3.1 Fachlicher Kontext

```mermaid
C4Context
    title Fachlicher Kontext — LLM Championship

    Person(user, "KI-Ingenieur / Prompt-Entwickler", "Konfiguriert Gateways, verwaltet Datensätze, erstellt und startet Wettbewerbe")

    System(llmChampionship, "LLM Championship", "Gamifizierte Webanwendung zur Evaluation und zum Vergleich von LLMs")

    System_Ext(openrouter, "OpenRouter", "LLM-Aggregator-API mit Zugang zu hunderten Modellen")
    System_Ext(githubCopilot, "GitHub Copilot API", "GitHub's LLM-Endpunkt für Copilot-Modelle")
    System_Ext(customLLM, "Custom LLM API", "Beliebiger LLM-Endpunkt: OpenAI-, Anthropic- oder Gemini-kompatible API mit Custom Headers und vollständiger URL-Konfiguration")

    Rel(user, llmChampionship, "Nutzt", "Browser / HTTPS")
    Rel(llmChampionship, openrouter, "Sendet Chat-Completion-Anfragen", "HTTPS / REST")
    Rel(llmChampionship, githubCopilot, "Sendet Chat-Completion-Anfragen", "HTTPS / REST")
    Rel(llmChampionship, customLLM, "Sendet Chat-Completion-Anfragen", "HTTPS / REST")
```

**Externe fachliche Schnittstellen:**

| Partner                         | Beschreibung                                                                                                    |
|---------------------------------|-----------------------------------------------------------------------------------------------------------------|
| LLM-Gateways (extern)          | LLM-Endpunkte in drei Formaten: OpenAI-kompatibel (`/chat/completions`), Anthropic Converse (`/converse`), Gemini (`/generateContent`); werden vom System für Evaluation und Bewertung genutzt |
| Benutzer                        | Interagiert über die Web-UI; konfiguriert Gateways, lädt Datensätze, startet Wettbewerbe, analysiert Ergebnisse  |

## 3.2 Technischer Kontext

```mermaid
C4Context
    title Technischer Kontext — LLM Championship

    Person(user, "Benutzer", "Browser")

    System_Boundary(system, "LLM Championship System") {
        Container(spa, "Frontend SPA", "React 19, Vite, Tailwind CSS", "Retro-UI mit Wouter-Routing, React Query und Client-Vault (AES-256-GCM verschlüsselt)")
        Container(api, "API Server", "Express 5, Node.js 24", "REST-API mit In-Memory-Store, Session-Management, Pino-Logging")
    }

    System_Ext(llmGateways, "LLM Gateway APIs", "OpenRouter / GitHub Copilot / Custom (OpenAI-, Anthropic- oder Gemini-kompatibel)")

    Rel(user, spa, "HTTPS", "GET HTML/JS/CSS")
    Rel(spa, api, "REST/JSON + Session-Cookie", "/api/*")
    Rel(api, llmGateways, "HTTPS", "Chat Completions / Converse / generateContent")
```

**Mapping fachlich → technisch:**

| Fachliche Schnittstelle  | Technisches Protokoll                          | Format                                |
|--------------------------|-------------------------------------------------|---------------------------------------|
| LLM-Modell-Anfragen     | HTTPS POST (format-abhängig)                    | OpenAI Chat Completion / Anthropic Converse / Gemini generateContent JSON |
| Modell-Auflistung        | HTTPS GET `/models` (nur OpenRouter/GitHub)     | OpenAI Models Response JSON (Custom-Gateways: manuelle Modellangabe) |
| Frontend ↔ Backend       | HTTPS REST `/api/*` + HttpOnly-Session-Cookie   | JSON (spezifiziert via OpenAPI 3.1)   |
| Client-Vault ↔ Backend   | HTTPS POST `/api/session/sync`                  | JSON (Gateways + Datasets)            |

---