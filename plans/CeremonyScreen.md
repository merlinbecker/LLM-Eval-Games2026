# Plan: Ceremony Screen Redesign

## Status: ✅ Implementiert

## Ziel

Der Ceremony Screen (`CompetitionResults.tsx`) wird umgebaut zu einer übersichtlichen, tab-basierten Darstellung einer abgeschlossenen Competition. Die Hauptidee:

1. **Cheat Sheet / Übersicht** (Standard-Tab): Alle wichtigen Infos auf einen Blick
2. **Gewinner & Judge-Wertungen** (Tab): Podium + Roboter-Judges mit Tafeln + Zeiten/Kosten
3. **Detail-Antworten** (Tab): Vollständige Antworten und Einzelbewertungen pro Frage

---

## Datenmodell (Ist-Stand)

```typescript
CompetitionDetail {
  id, name, datasetId, systemPrompt, status, createdAt
  contestantModels: ModelSelection[]    // Teilnehmer
  judgeModels: ModelSelection[]         // Richter
  results: CompetitionResult[]          // Ergebnisse pro Teilnehmer
}

CompetitionResult {
  modelId, modelName, gatewayId
  avgSpeed (ms), avgCost ($), avgQuality (1-10), totalTokens
  responses: ModelResponse[]            // Pro Frage
}

ModelResponse {
  dataItemIndex, response, durationMs
  promptTokens, completionTokens, cost
  judgeScores: JudgeScore[]             // Pro Judge
}

JudgeScore {
  judgeModelId, judgeModelName
  score (1-10), reasoning
}
```

---

## Implementierungsschritte

### Schritt 1: Tab-Navigation einbauen ✅
- [x] State für aktiven Tab: `overview` | `winners` | `details`
- [x] Tab-Leiste mit RetroButton-Stil (toggle-artig)
- [x] Bestehenden Content in die jeweilien Tabs aufteilen
- [x] Header-Bar und Commentator bleiben AUSSERHALB der Tabs

### Schritt 2: Übersicht / Cheat Sheet Tab ✅
- [x] Kompakte Zusammenfassung der Competition
- [x] Statistik-Kacheln: Anzahl Teilnehmer, Anzahl Judges, Anzahl Fragen
- [x] Gewinner-Highlight (Platz 1) mit Qualitätsscore
- [x] Schnellste Antwort, günstigste Antwort
- [x] Performance Radar Chart (bestehend, kompakter)
- [x] Rangliste als kompakte Tabelle mit Quality, Speed, Cost

### Schritt 3: Gewinner & Judges Tab ✅
- [x] Podium-Darstellung (bestehend, verbessert)
- [x] Combobox/Tabs zum Durchschalten der einzelnen Modelle
- [x] Judge-Panel: Roboter-Icons die eine Tafel mit der Bewertungsnummer hochhalten
- [x] Große Darstellung von Zeit und Kosten pro Modell
- [x] Übersicht aller Judges und deren Einzelwertungen pro gewähltem Modell

### Schritt 4: Detail-Antworten Tab ✅
- [x] Pro Frage die Antworten aller Modelle
- [x] Judge-Bewertungen pro Antwort
- [x] Navigation zwischen Fragen (Combobox oder Tabs)

### Schritt 5: Feinschliff & Verifikation ✅
- [x] Responsive Design prüfen
- [x] TypeScript-Fehlerfreiheit sicherstellen
- [x] Build testen
- [x] Konsistenz mit Retro-Design-System

---

## Architektur-Entscheidungen

- **Keine neuen API-Aufrufe nötig**: Alle Daten kommen aus `useGetCompetition(id)` 
- **Tab-State als lokaler React-State**: URL-Routing nicht nötig für Sub-Tabs
- **Wiederverwendung bestehender Retro-Komponenten**: RetroWindow, RetroButton, RetroSelect, RobotIcon etc.
- **Neue UI-Elemente**: Judge-Roboter mit Tafeln (SVG/CSS), Tab-Navigation

---

## Datei-Änderungen

| Datei | Änderung |
|-------|----------|
| `artifacts/llm-championship/src/pages/CompetitionResults.tsx` | Hauptumbau: Tab-System, 3 Tabs |
| `artifacts/llm-championship/src/components/retro.tsx` | Ggf. neue RetroTabBar Komponente |

---

## Offene Fragen
- *(keine)*
