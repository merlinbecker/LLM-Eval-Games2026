# 4. Lösungsstrategie

| Entwurfsentscheidung                     | Begründung                                                                                                     |
|------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| **pnpm-Monorepo mit Workspaces**         | Gemeinsame Typen und Schemas werden als Pakete geteilt; Build-Orchestrierung über TypeScript-Projektverweise     |
| **OpenAPI-Spec als Kontrakt**            | Single Source of Truth; daraus werden API-Client-Hooks (React Query), Zod-Validierungsschemas und TypeScript-Typen generiert |
| **In-Memory-Store + Client-Vault**      | Kein externer Datenbank-Server nötig; Session-scoped Maps im Backend; API-Keys nur client-seitig verschlüsselt gespeichert (siehe [ADR-9](09-architekturentscheidungen.md#adr-9)) |
| **JSON-Felder für Wettbewerbsergebnisse** | Flexible, variable Ergebnis-Strukturen; effiziente Speicherung verschachtelter Daten als Plain-Objects          |
| **Mehrfach-Richter-Bewertung**           | 3–5 LLM-Richter bewerten jeden Teilnehmer; Mittelwert reduziert Einzel-Bias                                     |
| **SSRF-Schutzschicht**                   | Gateway-URLs werden auf HTTPS und öffentliche IPs validiert; DNS-Auflösung wird auf private IP-Bereiche geprüft  |
| **Retro-UI-Komponentenbibliothek**       | Custom `Retro*`-Komponenten kapseln die Macintosh-System-5-Ästhetik einheitlich über alle Seiten                 |
| **React Query mit Polling**              | Automatisches Polling (2s) für laufende Wettbewerbe ermöglicht Live-Updates ohne WebSockets                      |
| **Background-Activity-System**           | Langläufige Operationen (Wettbewerbe, Dataset-Generierung) laufen async im Backend; Frontend pollt Activity-Status alle 3s und zeigt Toast-Notifications bei Abschluss; Nutzer kann frei navigieren |

---