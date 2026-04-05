# 1. Einführung und Ziele

## 1.1 Aufgabenstellung

Die **LLM Championship** ist eine gamifizierte Webanwendung zur systematischen Evaluation und zum Vergleich von Large Language Models (LLMs). Die Anwendung ermöglicht es Nutzern:

- **LLM-Gateway-Verbindungen** zu konfigurieren (OpenRouter, GitHub Copilot, Custom-Endpunkte mit OpenAI-, Anthropic- oder Gemini-kompatibler API)
- **Test-Datensätze** zu verwalten (Markdown-Upload, KI-Generierung, automatische Datenschutz-Prüfung und Anonymisierung)
- **Wettbewerbe** anzulegen, in denen ausgewählte Modelle als Teilnehmer und Richter gegeneinander antreten
- **Evaluationsergebnisse** über Podium-Darstellungen, Dreiecksdiagramme (Ternary-Plots: Speed / Cost / Quality) und detaillierte Bewertungsprotokolle zu visualisieren

Das Design folgt einer **Retro-Ästhetik** im Stil eines Macintosh System 5 (1-bit Monochrom, Pixel-Fonts, Dithering) — inspiriert von den *Winterolympischen Spielen 1985*.

## 1.2 Qualitätsziele

| Priorität | Qualitätsziel       | Beschreibung                                                                                       |
|-----------|---------------------|-----------------------------------------------------------------------------------------------------|
| 1         | **Erweiterbarkeit** | Neue LLM-Anbieter (Gateways) können ohne Code-Änderungen hinzugefügt werden                        |
| 2         | **Sicherheit**      | API-Keys werden im verschlüsselten Client-Vault gespeichert und nur bei Session-Sync übertragen; SSRF-Schutz bei Gateway-URLs |
| 3         | **Benutzbarkeit**   | Einheitliche Retro-UI mit klarer Navigation; Live-Updates während laufender Wettbewerbe              |
| 4         | **Typsicherheit**   | End-to-End-Typsicherheit durch OpenAPI-Spec → Orval-Codegenerierung → Zod-Validierung              |
| 5         | **Wartbarkeit**     | Monorepo mit klarer Paketstruktur und TypeScript-Projektverweisen                                   |

## 1.3 Stakeholder

| Rolle                     | Erwartungshaltung                                                                      |
|---------------------------|----------------------------------------------------------------------------------------|
| ML-/KI-Ingenieure         | Objektiver, wiederholbarer Vergleich verschiedener LLMs anhand standardisierter Metriken |
| Prompt-Entwickler         | Testen verschiedener System-Prompts gegen mehrere Modelle mit Richter-Bewertung         |
| Datenschutzbeauftragte    | Automatische PII-Erkennung und Anonymisierung in Test-Datensätzen                       |
| Entwickler (Maintainer)   | Saubere Architektur, Typsicherheit, einfache Erweiterbarkeit                           |
| Projektleitung            | Transparente Kostenschätzung und Qualitätsmessung für LLM-Einsatzentscheidungen         |

---