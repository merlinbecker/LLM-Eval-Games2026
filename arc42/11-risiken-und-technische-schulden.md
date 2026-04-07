# 11. Risiken und technische Schulden

| #  | Risiko / Technische Schuld                        | Beschreibung                                                                                                  | Mögliche Maßnahme                                          |
|----|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| R1 | **Manuelle Kostenpflege**                         | Modellspezifische Kosten (`$/M Tokens`) müssen manuell bei der Modellkonfiguration eingegeben werden; sie werden nicht automatisch von der Gateway-API (z.B. OpenRouter `/models` Pricing) synchronisiert. Bei Preisänderungen seitens des Anbieters stimmen die hinterlegten Kosten nicht mehr. | Automatischer Abgleich der Preise mit der OpenRouter-Pricing-API; periodischer Hintergrund-Sync; Warnung bei veralteten Preisen |
| R2 | **Kein Authentifizierungssystem**                 | Die Anwendung hat aktuell kein User-Login oder Autorisierung; Sessions sind anonym                             | Auth-Middleware einführen (z.B. OAuth2, JWT)                 |
| R3 | **Polling statt Push**                            | 2-Sekunden-Polling erzeugt unnötige Last; bei vielen gleichzeitigen Nutzern skaliert dies schlecht             | SSE oder WebSockets für Echtzeit-Updates                     |
| R4 | **Keine Rate-Limiting**                           | API-Endpunkte sind nicht gegen Missbrauch geschützt                                                            | Rate-Limiting-Middleware (z.B. express-rate-limit)           |
| R5 | **Datenverlust bei Server-Neustart**              | In-Memory-Daten (inkl. laufender Wettbewerbe) gehen bei Server-Neustart verloren                               | Client-Vault als primäre Quelle; optionale File-Persistenz  |
| R6 | **Backend-Integrationsabdeckung unvollständig** | Frontend-Unit-Tests sowie direkte Runner- und Gateway-Helfertests sind vorhanden, aber Routen-Fehlerpfade und vollständige End-to-End-Flows sind noch nicht ausreichend automatisiert abgesichert | Gezielte Vitest-/Integrationstests für Route-, Session- und verbleibende Activity-Flows ergänzen |
| R7 | **Abhängigkeit von externen LLM-Anbietern**      | Verfügbarkeit und Preisänderungen der LLM-APIs liegen außerhalb der Kontrolle                                  | Fallback-Gateway, Caching, Retry-Strategien                  |
| R8 | **LocalStorage-Limit**                           | Client-Vault ist auf ~5-10 MB begrenzt; sehr große Datasets können das Limit erreichen                         | Gzip-Kompression (bereits implementiert); IndexedDB als Alternative |
| R9 | **Konfigurierte Modelle nicht im Vault persistiert** | `ConfiguredModel`-Objekte (inkl. Kosten) werden nur im In-Memory-Store gehalten und gehen bei Session-Ablauf oder Server-Neustart verloren; sie sind nicht Teil des verschlüsselten Client-Vaults | ConfiguredModels in `VaultData` aufnehmen und beim Session-Sync mit übertragen |
| R10 | **Fallback-Kosten bei fehlender Konfiguration** | Wenn keine modellspezifischen Kosten hinterlegt sind, greift ein fester Fallback ($1/M Input, $2/M Output). Dieser Wert ist für teure Modelle (z.B. GPT-4, Claude Opus) deutlich zu niedrig und für günstige Modelle zu hoch — die Kostenauswertung wird dadurch verzerrt. | Pflichtfeld für Kosten bei Modellkonfiguration; oder automatisches Abrufen von Pricing-Daten aus der Gateway-API |

---

## SonarCloud Quality-Gate – Behobene Probleme (Branch `fix/optimization`)

Das Quality Gate war auf `ERROR` gesetzt, da `new_reliability_rating` den Schwellwert A nicht erreichte (Ist-Wert C). Alle Issues wurden in zwei Fix-Zyklen behoben:

### Erledigte Maßnahmen

| Maßnahme | Datei | Regel | Schwere | Datum |
|---|---|---|---|---|
| ~~M-1~~ | `artifacts/llm-championship/src/components/TriangleChart.tsx` | S6443 – React-`setState` Antipattern (`setHoveredIdx(hoveredIdx)`) | MAJOR | 07.04.2026 |
| ~~M-2~~ | `artifacts/llm-championship/src/lib/utils.test.ts` | S6638 – Konstant wahrer Ausdruck auf linker Seite von `&&` | MAJOR | 07.04.2026 |
| ~~M-3~~ | `artifacts/llm-championship/src/pages/competition/DetailsTab.tsx` | S6853 – `<label>` ohne `htmlFor`-Zuordnung | MAJOR | 07.04.2026 |
| ~~M-4~~ | `artifacts/llm-championship/src/pages/competition/WinnersTab.tsx` | S6853 – `<label>` ohne `htmlFor`-Zuordnung | MAJOR | 07.04.2026 |
| ~~M-5–M-7~~ | `artifacts/llm-championship/src/pages/NewCompetition.tsx` | S6853 – `<label>` ohne `htmlFor`-Zuordnung (3×) | MAJOR | 07.04.2026 |
| ~~M-8~~ | `artifacts/llm-championship/src/components/TopMenu.tsx` | S6772 – Mehrdeutiges Whitespace nach `<span>` (JSX) | MAJOR | 07.04.2026 |
| ~~M-9–M-13~~ | `artifacts/llm-championship/src/components/retro.tsx` | S6848/S1082 – Nicht-native interaktive Elemente ohne `role`/Keyboard-Listener (bereits zuvor behoben, stale) | MINOR | – |
| ~~M-14–M-18~~ | `artifacts/llm-championship/src/pages/Datasets.tsx` | S6848/S1082 – Nicht-native interaktive Elemente ohne `role`/Keyboard-Listener (bereits zuvor behoben, stale) | MINOR | – |
| ~~M-19~~ | `artifacts/api-server/src/routes/activities.ts` | S7773 – `isNaN()` → `Number.isNaN()` | MINOR | 07.04.2026 |
| ~~M-20~~ | `artifacts/llm-championship/src/lib/vault/crypto.ts` | S7758 – `String.fromCharCode()` → `String.fromCodePoint()`, `charCodeAt()` → `codePointAt()` | MINOR | 07.04.2026 |

### Quality-Gate-Bedingungen (aktuell)

| Bedingung | Schwellwert | Ist-Wert | Status |
|---|---|---|---|
| `new_reliability_rating` | A (1) | A (1) | ✅ |
| `new_security_rating` | A (1) | A (1) | ✅ |
| `new_maintainability_rating` | A (1) | A (1) | ✅ |
| `new_duplicated_lines_density` | < 3 % | 2,2 % | ✅ |
| `new_security_hotspots_reviewed` | 100 % | 100 % | ✅ |

### Verbleibende OpenAPI-Schema-Duplikationen (deferred)

Folgende Duplikationen in `lib/api-spec/openapi.yaml` wurden noch nicht als `$ref`-Schemas extrahiert. Sie erhöhen die Zeilenzahl der generierten Dateien, haben aber keinen Laufzeit-Einfluss:

| ID | Schema | Vorkommen | Maßnahme |
|----|--------|-----------|----------|
| DUP-4 | `ModelSelection` (Inline-Objekt mit `gatewayId`, `modelId`, `modelName`, `inputCostPerMillionTokens`, `outputCostPerMillionTokens`) | 4× in `openapi.yaml` | Als `$ref: "#/components/schemas/ModelSelection"` extrahieren, dann `pnpm run codegen` |
| DUP-5 | Dataset-Response-Felder (`id`, `name`, `content`, `privacyStatus`, `privacyReport`, `createdAt`) | 4× in `openapi.yaml` | Als `DatasetResponse`-Schema extrahieren |
| DUP-7 | `{ message: string }` als DELETE-Response | 5× in `openapi.yaml` | Als `SuccessMessage`-Schema extrahieren |

---