# Custom Gateway – Planungsdokument

**Status:** ✅ Implementiert  
**Branch:** feature/rundlauf  
**Erstellt:** 2026-03-24

---

## 1. Anforderungsübersicht

Der bestehende `custom`-Gateway-Typ soll aufgeteilt werden in drei spezifische Custom-Typen:

| Typ | API-Kompatibilität | Beschreibung |
|---|---|---|
| `custom_openai` | OpenAI Chat Completions | Standard OpenAI-kompatible API |
| `custom_anthropic` | Anthropic Converse | AWS Bedrock / Anthropic Converse API |
| `custom_gemini` | Google Gemini generateContent | Vertex AI / Gemini API |

### Zusatzanforderungen
- **Kein Models-Endpunkt:** Bei Custom-Gateways gibt es keinen `/models`-Endpunkt → Modelle werden manuell eingegeben
- **Custom HTTP-Header:** Beliebige Key-Value HTTP-Header (z.B. `api-key`, `Authorization`, etc.)
- **Vollständige Base URL:** Die URL wird 1:1 verwendet, kein automatisches Anhängen von Pfaden. Enthält `{model}` als Platzhalter für die Model-ID
- **API Key:** Weiterhin optional als eigenständiges Feld (wird als Header-Wert verwendet)

---

## 2. API-Format-Referenz

### 2.1 OpenAI-kompatibel (`custom_openai`)

**Request-Format:**
```
POST {baseUrl}  (z.B. https://api.example.com/openai/deployments/{model}/chat/completions?api-version=2024-10-21)
```
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "model": "<modelId>",
  "temperature": 0.7
}
```

**Response-Format:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Antworttext"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

**Extraktion:**
- Content: `choices[0].message.content`
- Prompt Tokens: `usage.prompt_tokens`
- Completion Tokens: `usage.completion_tokens`

### 2.2 Anthropic-kompatibel (`custom_anthropic`)

**Request-Format:**
```
POST {baseUrl}  (z.B. https://api.example.com/anthropic/model/{model}/converse)
```
```json
{
  "messages": [
    {
      "role": "user",
      "content": [{"text": "..."}]
    }
  ],
  "system": [{"text": "System-Prompt"}],
  "inferenceConfig": {
    "maxTokens": 4096,
    "temperature": 0.7
  }
}
```

**Response-Format:**
```json
{
  "output": {
    "message": {
      "role": "assistant",
      "content": [
        {"text": "Antworttext"}
      ]
    }
  },
  "stopReason": "end_turn",
  "usage": {
    "inputTokens": 10,
    "outputTokens": 20,
    "totalTokens": 30
  }
}
```

**Extraktion:**
- Content: `output.message.content[0].text`
- Prompt Tokens: `usage.inputTokens`
- Completion Tokens: `usage.outputTokens`

### 2.3 Gemini-kompatibel (`custom_gemini`)

**Request-Format:**
```
POST {baseUrl}  (z.B. https://api.example.com/google/v1beta1/.../models/{model}:generateContent)
```
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "..."}]
    }
  ],
  "systemInstruction": {
    "role": "user",
    "parts": [{"text": "System-Prompt"}]
  },
  "generationConfig": {
    "temperature": 0.7,
    "topP": 1.0,
    "topK": 4
  }
}
```

**Response-Format:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{"text": "Antworttext"}],
        "role": "model"
      },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

**Extraktion:**
- Content: `candidates[0].content.parts[0].text`
- Prompt Tokens: `usageMetadata.promptTokenCount`
- Completion Tokens: `usageMetadata.candidatesTokenCount`

---

## 3. Datenmodell-Änderungen

### 3.1 Gateway-Typ-Enum erweitern

**Alt:** `openrouter | github_copilot | custom`  
**Neu:** `openrouter | github_copilot | custom_openai | custom_anthropic | custom_gemini`

> Rückwärtskompatibilität: `custom` wird als Alias für `custom_openai` behandelt.

### 3.2 Gateway: Neues Feld `customHeaders`

```typescript
interface Gateway {
  id: number;
  name: string;
  type: string; // erweitert um custom_openai, custom_anthropic, custom_gemini
  baseUrl: string;
  apiKey: string;
  customHeaders?: Record<string, string>; // NEU: Benutzerdefinierte HTTP-Header
  createdAt: string;
}
```

### 3.3 OpenAPI Schema-Änderungen

- `CreateGateway.type` enum: + `custom_openai`, `custom_anthropic`, `custom_gemini`
- `CreateGateway.customHeaders`: optional object (additionalProperties: string)
- `Gateway.customHeaders`: optional object (additionalProperties: string)
- `/gateways/{id}/models` gibt leere Liste zurück für Custom-Typen

---

## 4. Implementierungsplan

### Schritt 1: OpenAPI-Spec erweitern ✅
- Enum-Erweiterung für Gateway-Typen
- `customHeaders`-Feld hinzufügen (Gateway + CreateGateway)
- API Code generieren (orval)

### Schritt 2: Store/Types erweitern ✅
- `Gateway` und `CreateGateway` Interfaces um `customHeaders` erweitern

### Schritt 3: API-Server – LLM Gateway erweitern ✅
- `getProviderEndpoints()`: Neue Cases für `custom_openai`, `custom_anthropic`, `custom_gemini`
- `chatCompletion()`: Request-Body-Transformation je nach Custom-Typ
  - `custom_openai`: Standard OpenAI-Format (wie bisher)
  - `custom_anthropic`: Converse-Format (messages, system, inferenceConfig)
  - `custom_gemini`: generateContent-Format (contents, systemInstruction, generationConfig)
- Response-Parsing für jeden Typ
- `{model}`-Platzhalter-Ersetzung in der URL
- Custom Headers einbinden

### Schritt 4: API-Server – Routes erweitern ✅
- `POST /gateways`: `customHeaders` akzeptieren und speichern
- `GET /gateways`: `customHeaders` zurückgeben (ohne sensitive Werte)
- `GET /gateways/:id/models`: Leere Liste für Custom-Typen

### Schritt 5: Frontend – Vault Types erweitern ✅
- `VaultGateway.type` erweitern
- `VaultGateway.customHeaders` hinzufügen

### Schritt 6: Frontend – Gateway-Formular erweitern ✅
- Neue Gateway-Typen im Dropdown
- Custom-Headers-Editor (Key-Value Eingabefelder, dynamisch hinzufügen/entfernen)
- Base URL Hilfetext je nach Typ mit `{model}` Platzhalter
- Kein Models-Dropdown bei Custom-Gateways (nur manuelle Eingabe)

---

## 5. Ausführungsprotokoll

| Schritt | Status | Notizen |
|---|---|---|
| Recherche bestehender Code | ✅ | Alle relevanten Dateien gelesen und verstanden |
| API-Response-Formate recherchiert | ✅ | OpenAI, Anthropic Converse, Gemini generateContent |
| Plan erstellt | ✅ | Dieses Dokument |
| OpenAPI-Spec erweitern | ✅ | Enum um `custom_openai`, `custom_anthropic`, `custom_gemini` erweitert; `customHeaders`-Feld in Gateway + CreateGateway hinzugefügt |
| Store/Types erweitern | ✅ | `Gateway` und `CreateGateway` Interfaces um `customHeaders?: Record<string, string>` erweitert; `createGateway()` im Store aktualisiert |
| Code generieren (orval) | ✅ | `pnpm run codegen` erfolgreich – TS-Typen, React Query Hooks und Zod-Validatoren generiert |
| API-Server erweitern | ✅ | `llm-gateway.ts`: Neue Typen `AnthropicConverseResponse`, `GeminiGenerateResponse`; `buildRequestBody()` + `parseResponse()` für alle 3 Formate; `{model}`-Platzhalter in URL; Custom Headers; `getProviderEndpoints()` erweitert; `listModelsFromGateway()` gibt leere Liste für Custom zurück. `gateways.ts` Routes: `customHeaders` in POST/GET. `datasets.ts` + `competitions.ts`: Alle `chatCompletion()`-Aufrufe um `customHeaders` erweitert |
| Vault Types erweitern | ✅ | `VaultGateway.type` um neue Typen erweitert; `customHeaders` Feld hinzugefügt |
| Frontend erweitern | ✅ | Neues Dropdown mit 5 Provider-Optionen (OpenRouter, GitHub Copilot, Custom OpenAI/Anthropic/Gemini); Custom-Headers-Editor (dynamische Key-Value-Felder mit +/- Buttons); Base URL mit `{model}` Platzhalter-Hinweis; Models-Dropdown nur bei nicht-Custom-Gateways; Gateway-Badge zeigt lesbaren Typ-Label |
| TypeCheck | ✅ | Alle Packages fehlerfrei kompiliert |
| Tests | ✅ | 42/42 Tests bestanden |

---

## 6. Geänderte Dateien

| Datei | Art der Änderung |
|---|---|
| `lib/api-spec/openapi.yaml` | Enum erweitert, `customHeaders` Feld hinzugefügt |
| `lib/store/src/types.ts` | `customHeaders` in Gateway/CreateGateway |
| `lib/store/src/index.ts` | `createGateway()` speichert customHeaders |
| `lib/api-client-react/src/generated/*` | Neu generiert via orval |
| `lib/api-zod/src/generated/*` | Neu generiert via orval |
| `artifacts/api-server/src/lib/llm-gateway.ts` | 3 API-Formate, Custom Headers, `{model}` Platzhalter |
| `artifacts/api-server/src/routes/gateways.ts` | customHeaders in POST/GET |
| `artifacts/api-server/src/routes/datasets.ts` | customHeaders an chatCompletion weitergeleitet |
| `artifacts/api-server/src/routes/competitions.ts` | customHeaders an chatCompletion weitergeleitet |
| `artifacts/llm-championship/src/lib/vault/types.ts` | VaultGateway erweitert |
| `artifacts/llm-championship/src/pages/Gateways.tsx` | Neues Formular mit Custom-Typen und Header-Editor ||
