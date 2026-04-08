# 12. Glossar

| Begriff                  | Definition                                                                                                        |
|--------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Gateway**              | Konfigurierte Verbindung zu einem LLM-Anbieter (OpenRouter, GitHub Copilot oder Custom-Endpunkt mit OpenAI-, Anthropic- oder Gemini-kompatibler API). Custom-Gateways unterstützen benutzerdefinierte HTTP-Headers und vollständige URL-Konfiguration mit `{model}`-Platzhalter |
| **Dataset**              | Markdown-formatierter Testdatensatz; optionale äußere Markdown-Code-Fences werden normalisiert, die Aufteilung in Items erfolgt konsistent über `##`-Überschriften oder Absatz-Fallback |
| **Competition**          | Wettbewerb, in dem mehrere Teilnehmer-Modelle (Contestants) von Richter-Modellen (Judges) bewertet werden           |
| **Configured Model**     | Vorkonfiguriertes Modell mit Gateway-Zuordnung, Anzeigename und optionalen Kosteninformationen (Input/Output $/M Tokens); wird bei der Wettbewerbs-Erstellung als Vorlage genutzt |
| **Contestant Model**     | LLM-Modell, das als Teilnehmer in einem Wettbewerb antworten generiert                                             |
| **Judge Model**          | LLM-Modell, das als Richter die Antworten der Teilnehmer mit einem Score (1-10) bewertet                           |
| **Privacy Check**        | KI-gestützte Analyse eines Datensatzes auf personenbezogene Informationen (PII)                                     |
| **Anonymisierung**       | KI-gestützter Prozess, PII in Datensätzen durch synthetische Daten zu ersetzen                                      |
| **System Prompt**        | Vorangestellte Anweisung an das LLM, die den Kontext und die gewünschte Verhaltensweise definiert                   |
| **SSRF**                 | Server-Side Request Forgery — Angriffsvektor, bei dem der Server zu Anfragen an interne Ressourcen verleitet wird    |
| **Client-Vault**         | Verschlüsselter Datenspeicher im Browser-LocalStorage; enthält Gateways (inkl. API-Keys) und Datasets; Verschlüsselung via AES-256-GCM mit nutzergewähltem Passwort |
| **In-Memory-Store**      | Session-scoped Datenspeicher im Server-RAM; ersetzt die externe Datenbank; Maps für Gateways, Datasets, Competitions |
| **Session-Sync**         | Prozess, bei dem der Client beim Vault-Entsperren die Daten an den Server sendet (`POST /api/session/sync`), um eine Server-Session zu erstellen |
| **Orval**                | Code-Generator, der aus OpenAPI-Specs TypeScript-Clients (React Query Hooks) und Zod-Schemas erzeugt               |
| **React Query**          | Bibliothek für serverseitigen Zustandsmanagement in React; Caching, Refetching, Mutations                           |
| **Wouter**               | Minimalistischer React-Router (~1.5kB); Alternative zu React Router                                                 |
| **Retro-UI**             | UI-Designsystem im Stil des Macintosh System 5 (ca. 1985): 1-bit Monochrom, Pixel-Fonts, Dithering                 |
| **JudgesScoreReveal**    | Animiertes Overlay-Fenster, das während laufender Wettbewerbe Richter-Wertungen visualisiert: Roboter halten Wertungskarten hoch; Queue-basierte State-Machine-Animation (entering→revealing→holding→exiting→idle) |
| **Relative Normalisierung** | Bewertungsmethode im Dreiecksdiagramm: Scores werden relativ zum besten/schlechtesten Modell auf 1–10 skaliert (statt absoluter Werte); Speed und Cost invertiert |
| **Activity**             | Background-Job-Tracking-Objekt mit Status (`running`/`completed`/`error`), Fortschritt und Ergebnis-Referenz         |
| **Background Job**       | Langläufige Operation (Wettbewerb-Evaluation, Datensatz-Generierung), die asynchron im Backend läuft und über eine Activity getrackt wird |

---