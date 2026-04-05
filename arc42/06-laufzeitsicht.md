# 6. Laufzeitsicht

## 6.1 Szenario: Vault entsperren und Session synchronisieren

```mermaid
sequenceDiagram
    actor User as Benutzer
    participant FE as Frontend SPA
    participant LS as LocalStorage
    participant API as API Server
    participant Store as In-Memory Store

    User->>FE: Webseite öffnen
    FE->>LS: Vault vorhanden?

    alt Vault existiert
        FE->>User: Passwort-Dialog anzeigen
        User->>FE: Passwort eingeben
        FE->>FE: PBKDF2 → AES-Key ableiten
        FE->>LS: Vault laden + entschlüsseln + gunzip
        LS-->>FE: VaultData { gateways[], datasets[], settings }
    else Kein Vault
        FE->>User: "Vault erstellen" Dialog
        User->>FE: Passwort wählen
        FE->>FE: Leeren Vault erstellen + verschlüsseln
        FE->>LS: Vault speichern
    end

    FE->>API: POST /api/session/sync { gateways[], datasets[] }
    API->>API: Session-ID aus Cookie oder erzeugen
    API->>Store: Session erstellen + Daten importieren
    Store-->>API: Session bereit
    API-->>FE: 200 OK + Set-Cookie: sessionId (HttpOnly)

    Note over FE,API: Ab jetzt: Normale API-Aufrufe mit Session-Cookie
```

## 6.2 Szenario: Wettbewerb erstellen und durchführen

Dies ist das zentrale Nutzungsszenario — ein Benutzer erstellt einen Wettbewerb und startet die Evaluation.

```mermaid
sequenceDiagram
    actor User as Benutzer
    participant FE as Frontend SPA
    participant API as API Server
    participant Store as In-Memory Store
    participant LLM as LLM Gateway APIs

    User->>FE: Wettbewerb erstellen (Name, Dataset, Teilnehmer, Richter)
    FE->>API: POST /api/competitions
    API->>Store: createCompetition(sessionId, data)
    Store-->>API: Competition { id, status: 'draft' }
    API-->>FE: 201 Created
    FE-->>User: Weiterleitung zu /competitions/:id

    User->>FE: "INITIATE RUN" klicken
    FE->>API: POST /api/competitions/:id/run
    API->>Store: createActivity(type='competition_run', title)
    API->>Store: updateCompetition(status='running')
    API-->>FE: CompetitionDetail + activityId

    Note over FE: Nutzer kann frei navigieren<br/>Activity-Polling alle 3s

    loop Für jedes Teilnehmer-Modell
        API->>Store: getDataset(sessionId, datasetId)
        loop Für jedes Test-Item im Datensatz
            API->>Store: updateActivity(progress)
            API->>LLM: POST /chat/completions (System-Prompt + Item)
            LLM-->>API: Response + Token-Nutzung
            loop Für jeden Richter (3-5 Modelle)
                API->>LLM: POST /chat/completions (Bewertungs-Prompt)
                LLM-->>API: Score (1-10) + Begründung
            end
            API->>Store: updateCompetition(results: Zwischenergebnis)
        end
    end

    API->>Store: updateCompetition(status='completed', results)
    API->>Store: updateActivity(status='completed', resultId)

    Note over FE: Während Evaluation: JudgesScoreReveal-Overlay<br/>zeigt animierte Richter-Wertungen in Echtzeit<br/>(Queue-basiert, State-Machine-Animation)

    Note over FE: BackgroundActivityProvider erkennt<br/>Status-Änderung → Toast-Notification
    FE->>FE: Query-Invalidierung (Competitions-Liste)
    FE-->>User: Toast: "Wettbewerb abgeschlossen"
    FE-->>User: Podium, Dreiecksdiagramm (relativ normalisiert), Bewertungsprotokolle mit Datensatz-Fragen
```

**Besonderheiten:**
- Die Evaluation läuft asynchron im API-Server; `BackgroundActivityProvider` pollt Activity-Status alle 3 Sekunden
- Zusätzlich pollt `CompetitionResults` die Competition-Daten alle 2 Sekunden für partielle Ergebnis-Updates
- `JudgesScoreReveal` erkennt neue Richter-Wertungen per `useEffect`-Diff (vorherige vs. aktuelle Response-Counts) und zeigt sie als animiertes Overlay mit Roboter-Wertungskarten
- Teilnehmer-Modelle werden mit `max concurrency = 5` parallel evaluiert
- Richter-Bewertungen laufen ebenfalls parallel (max 5)
- Zwischenergebnisse werden nach jedem Item im In-Memory-Store aktualisiert (partielle Updates)
- Activity-Progress zeigt aktuelles Modell und Item-Fortschritt (z.B. "ModelXY: item 3/10")
- Bei Fehler: Activity-Status wird auf `error` gesetzt, Toast-Notification mit Fehlermeldung
- Kostenschätzung: Verwendet die am `ConfiguredModel` hinterlegten Kosten (`inputCostPerMillionTokens`, `outputCostPerMillionTokens` in $/M Tokens); Fallback auf `$1.00/M Input`, `$2.00/M Output` wenn keine modellspezifischen Kosten konfiguriert sind

---

## 6.3 Szenario: Gateway konfigurieren und Modelle auflisten

```mermaid
sequenceDiagram
    actor User as Benutzer
    participant FE as Frontend SPA
    participant API as API Server
    participant Store as In-Memory Store
    participant LLM as LLM Gateway API

    User->>FE: Gateway-Formular ausfüllen (Name, Typ, URL, API-Key)
    FE->>API: POST /api/gateways
    API->>API: validateGatewayUrl() — SSRF-Prüfung
    Note over API: HTTPS-only, keine privaten IPs,<br/>DNS-Auflösung prüfen

    alt URL ungültig
        API-->>FE: 400 Bad Request
        FE-->>User: Fehlermeldung
    else URL gültig
        API->>Store: createGateway(sessionId, data)
        Store-->>API: Gateway { id }
        API-->>FE: 201 Created
        FE->>FE: Vault aktualisieren (addGateway)
        FE-->>User: Gateway in Liste angezeigt
    end

    User->>FE: Modelle für Gateway auflisten
    FE->>API: GET /api/gateways/:id/models
    API->>Store: getGateway(sessionId, id)
    API->>LLM: GET /models (mit API-Key)
    LLM-->>API: Model-Liste
    API-->>FE: ModelInfo[] (mit gatewayId, gatewayName)
    FE-->>User: Modell-Dropdown befüllt
```

---

## 6.4 Szenario: Datensatz mit Datenschutzprüfung

```mermaid
sequenceDiagram
    actor User as Benutzer
    participant FE as Frontend SPA
    participant API as API Server
    participant Store as In-Memory Store
    participant LLM as LLM Gateway API

    User->>FE: Markdown-Datensatz hochladen
    FE->>API: POST /api/datasets/upload (multipart/form-data)
    API->>Store: createDataset(sessionId, data)
    API-->>FE: Dataset { id, privacyStatus: 'unchecked' }
    FE->>FE: Vault aktualisieren (addDataset)

    User->>FE: "Privacy Check" klicken
    FE->>API: POST /api/datasets/:id/privacy-check
    API->>Store: getDataset(sessionId, id)
    API->>LLM: POST /chat/completions (PII-Erkennungs-Prompt)
    LLM-->>API: JSON mit PII-Findings
    API->>Store: updateDataset(privacyStatus, privacyReport)
    API-->>FE: PrivacyCheckResult { findings[], status }
    FE-->>User: Datenschutz-Status + Findings anzeigen

    opt Falls PII gefunden
        User->>FE: "Anonymize" klicken
        FE->>API: POST /api/datasets/:id/anonymize
        API->>LLM: POST /chat/completions (Anonymisierungs-Prompt)
        LLM-->>API: Anonymisierter Inhalt
        API->>Store: updateDataset(content, privacyStatus='anonymized')
        API-->>FE: Dataset { privacyStatus: 'anonymized' }
    end
```

## 6.5 Szenario: Datensatz asynchron generieren

Datensatz-Generierung läuft als Background-Job; der Benutzer kann währenddessen frei navigieren.

```mermaid
sequenceDiagram
    actor User as Benutzer
    participant FE as Frontend SPA
    participant BGP as BackgroundActivityProvider
    participant API as API Server
    participant Store as In-Memory Store
    participant LLM as LLM Gateway API

    User->>FE: Generierungs-Parameter eingeben
    FE->>API: POST /api/datasets/generate
    API->>Store: createActivity(type='dataset_generate', title)
    API-->>FE: 202 Accepted { activityId, message }
    FE-->>User: Toast: "Generierung gestartet"

    Note over User: Nutzer navigiert frei<br/>(z.B. zu Wettbewerben)

    API->>LLM: POST /chat/completions (Generierungs-Prompt)
    LLM-->>API: Generierter Datensatz (Markdown)
    API->>Store: createDataset(sessionId, parsedContent)
    API->>Store: updateActivity(status='completed', resultId=datasetId)

    loop Alle 3 Sekunden
        BGP->>API: GET /api/activities
        API-->>BGP: Activity[] (status-Änderung erkannt)
    end

    BGP->>FE: Toast-Notification: "Datensatz generiert"
    BGP->>FE: Automatische Query-Invalidierung (Datasets-Liste)
```

---