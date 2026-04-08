# 9. Architekturentscheidungen

| # | Entscheidung                           | Kontext & Alternativen                                                                                   | Begründung                                                                           |
|---|----------------------------------------|----------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| 1 | **Express 5** als Backend-Framework    | Alternativen: Fastify, Hono, NestJS                                                                     | Weit verbreiteter Standard; minimaler Overhead; gute Middleware-Ökosystem             |
| 2 | **Wouter** statt React Router          | Alternative: React Router v6, TanStack Router                                                             | Minimalistische API (~1.5kB); ausreichend für die benötigte Routing-Komplexität       |
| 3 | **React Query + Polling** statt WebSockets | Alternative: Socket.io, Server-Sent Events                                                            | Einfacher zu implementieren; zustandsloses Backend; ausreichend für 2s-Updates        |
| 4 | **Orval Codegenerierung**             | Alternativen: openapi-typescript, swagger-codegen                                                         | Generiert React-Query-Hooks + Zod-Schemas direkt aus OpenAPI-Spec                    |
| 5 | **pnpm-Workspaces** als Monorepo-Tool | Alternativen: Nx, Turborepo, Lerna                                                                       | Leichtgewichtig; native Workspace-Unterstützung; schnelle Installation via Hardlinks  |
| 6 | **esbuild** für Backend-Build          | Alternativen: tsc, swc, tsx                                                                              | Extrem schnelle Builds; CJS-Bundles für Node.js-Kompatibilität                       |
| 7 | **Web Crypto API** für Vault           | Alternativen: Stanford JS Crypto Library, TweetNaCl                                                      | Native Browser-API; kein zusätzliches Bundle; AES-256-GCM + PBKDF2 nativ unterstützt  |
| 8 | **HttpOnly-Session-Cookie**            | Alternativen: JWT in Authorization-Header, Bearer-Token in LocalStorage                                   | Automatisch bei jedem Request; kein JavaScript-Zugriff; SameSite-Schutz gegen CSRF   |
| 10 | **Dreiecksdiagramm statt Radar-Chart** | Alternative: Recharts RadarChart                                                                          | Ternary-Plot bildet das Spannungsfeld Speed/Cost/Quality direkt ab; reines SVG ohne externe Lib; klarere Positionierung der Modelle via baryzentrische Koordinaten |
| 11 | **Tab-basierte Competition-Results** | Alternative: Einzelseite mit Scroll-Sektionen, Multi-Page-Routing                                          | 3 Tabs (Übersicht/Gewinner & Judges/Detail-Antworten) reduzieren kognitive Last; alle Daten aus einem API-Call (`useGetCompetition`); Tab-State als lokaler React-State statt URL-Routing |
| 12 | **Drei Custom-Gateway-Typen** statt eines generischen | Alternative: Einzelner `custom`-Typ mit manueller Format-Konfiguration                          | Explizite Typen (`custom_openai`, `custom_anthropic`, `custom_gemini`) ermöglichen automatische Request/Response-Transformation; weniger Fehlkonfiguration; klare UI-Führung mit typ-spezifischen URL-Platzhaltern |

| 13 | **`@theme inline` + CSS Custom Properties als Theme-Interface** | Alternative: Tailwind-Konfigurationsdatei mit statischen Werten (`tailwind.config.js`) | `@theme inline` in Tailwind v4 erzeugt Utilities mit `var(--color-mac-black)` statt Literalen. Ermöglicht Runtime-Theme-Switching ohne Rebuild; Theme-Tokens bleiben in einer einzigen CSS-Datei (`theme.css`) und sind per Env-Variable oder JavaScript überschreibbar |
| 14 | **Dithering-Muster statt Opacity** | Alternative: Tailwind Opacity-Modifier (`bg-black/50`, `text-mac-black/60`) | Opacity verletzt die 1-Bit-Restriktion (Antialiasing, Browser-Compositing erzeugt Halbtöne). CSS-Gradienten-Muster (`radial-gradient`, `repeating-linear-gradient`) liefern echte Schwarz-Weiß-Pixel. `visibility` statt `opacity` für Animationen und Show/Hide-States |

<a id="adr-9"></a>

## ADR-9: In-Memory-Store + Client-Vault statt PostgreSQL

### Status

Akzeptiert (März 2026)

### Kontext

Die ursprüngliche Architektur verwendete **PostgreSQL** mit **Drizzle ORM** als persistente Datenbank. Alle Gateways, Datasets und Competitions wurden serverseitig in relationalen Tabellen gespeichert. API-Keys wurden im Klartext in der `gateways`-Tabelle persistiert.

Diese Architektur brachte folgende Herausforderungen:

1. **Infrastruktur-Abhängigkeit:** PostgreSQL musste als zusätzlicher Dienst bereitgestellt, konfiguriert und gewartet werden. In Entwicklungsumgebungen (Codespaces, Dev Container) erhöhte dies die Komplexität.
2. **API-Key-Sicherheit:** API-Keys lagen im Klartext in der Datenbank — ein Single Point of Compromise. Jeder, der Zugriff auf die DB oder ein Backup hatte, konnte alle Keys lesen.
3. **Überflüssige Persistenz:** Die Anwendung ist ein Einzel-Nutzer-Werkzeug zur LLM-Evaluation. Langfristige Datenpersistenz über Server-Neustarts hinaus hat geringen Mehrwert, da Wettbewerbsergebnisse kurzlebig und reproduzierbar sind.
4. **Deployment-Vereinfachung:** Ohne externe Datenbank kann die Anwendung als einzelner Node.js-Prozess deployt werden.

### Entscheidung

PostgreSQL und Drizzle ORM wurden vollständig entfernt. Stattdessen:

- **Backend:** Ein leichtgewichtiger **In-Memory-Store** (`@workspace/store`) ersetzt die Datenbank. Daten werden in session-scoped `Map`-Objekten gehalten. Sessions werden über HttpOnly-Cookies identifiziert und nach 2 Stunden Inaktivität automatisch bereinigt.
- **Frontend:** Ein verschlüsselter **Client-Vault** im Browser-LocalStorage speichert Gateways (inkl. API-Keys) und Datasets. Verschlüsselung via Web Crypto API (PBKDF2 → AES-256-GCM) mit nutzergewähltem Passwort. Der Vault kann als `.vault`-Datei exportiert/importiert werden.
- **Synchronisation:** Beim Entsperren des Vaults sendet der Client die Daten via `POST /api/session/sync` an den Server. Der Server erstellt eine Session und importiert die Daten in den In-Memory-Store.

### Konsequenzen

**Positiv:**
- Kein externer Datenbank-Server nötig → vereinfachtes Deployment und Entwicklung
- API-Keys nur client-seitig verschlüsselt gespeichert → deutlich bessere Sicherheitspostur
- Schnellere Datenzugriffe (RAM statt SQL-Queries)
- Kein ORM, keine Migrationen, kein Connection-Pool-Management

**Negativ:**
- Datenverlust bei Server-Neustart → Client-Vault ist primäre Quelle; Re-Sync nötig
- Kein Multi-User-Support → jede Session hat eigene isolierte Daten
- Keine Volltextsuche oder komplexe Queries auf den Daten
- LocalStorage-Limit (~5-10 MB) begrenzt die Vault-Größe → gzip-Kompression mildert das

**Entfernte Komponenten:** `lib/db/` (Drizzle ORM, pg Pool, Schema-Definitionen), `drizzle-orm`, `drizzle-zod`, `pg`, `drizzle-kit`, `DATABASE_URL` Umgebungsvariable.

---