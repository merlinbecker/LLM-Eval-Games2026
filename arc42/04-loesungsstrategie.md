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
| **1-Bit-CSS-Architektur**                | Strikte Trennung von Design-Tokens (`theme.css`), Dithering-Mustern (`patterns.css`), Basisstyles und Utilities; kein `opacity`, keine `rgba`; Grautöne ausschließlich als Dithering-CSS-Muster |
| **CSS Custom Properties als Theme-Interface** | `@theme inline` in Tailwind v4 belässt alle Utilities als `var(--color-mac-black)` — kein Literal-Wert. Runtime-Theme-Switch mit zwei CSS-Variablen, ohne Rebuild. Überschreibbar via `.env`-Datei (`VITE_COLOR_BLACK`, `VITE_COLOR_WHITE`) oder JavaScript |
| **React Query mit Polling**              | Automatisches Polling (2s) für laufende Wettbewerbe ermöglicht Live-Updates ohne WebSockets                      |
| **Background-Activity-System**           | Langläufige Operationen (Wettbewerbe, Dataset-Generierung) laufen async im Backend; Frontend pollt Activity-Status alle 3s und zeigt Toast-Notifications bei Abschluss; Nutzer kann frei navigieren |

---