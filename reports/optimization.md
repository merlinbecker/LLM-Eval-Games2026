# Optimization Report — LLM Championship

> Generated: 2026-03-24  
> Scope: Full-project analysis (API server, frontend, shared libraries, scripts, config)  
> Branch: `copilot/update-competition-process`

---

## Executive Summary

| Category                     | Findings | Severity |
|------------------------------|----------|----------|
| Unused npm dependencies      | **35+** packages | 🔴 CRITICAL |
| Code duplication (frontend)  | 3 functions replicated across files | 🟡 MEDIUM |
| Code duplication (cross-pkg) | 1 function duplicated between FE & BE | 🟡 MEDIUM |
| Oversized files (>300 LOC)   | 5 files | 🟡 MEDIUM |
| Git hygiene                  | coverage/ committed to repo | 🟡 MEDIUM |
| Obsolete files               | 1 planning doc | 🟢 LOW |
| API inconsistencies          | Error response format, naming | 🟢 LOW |
| Unused feature code          | `collapsible` prop never used in consumers | 🟢 LOW |

**Estimated line savings: ~200–300 lines** through deduplication, plus **~5,700 lines** of unused mockup-sandbox UI components (if removed) and **35+ dependencies** (~40 MB install size).

---

## 1. Unused Dependencies (🔴 CRITICAL)

### `artifacts/llm-championship/package.json` — 35+ packages never imported

The frontend `package.json` contains a large set of **shadcn/ui** dependencies (Radix UI primitives + helpers) that are **never imported anywhere in `src/`**. The project uses a custom `retro.tsx` component library instead.

**Packages to remove (zero imports in `src/`):**

| Package | Purpose | Status |
|---------|---------|--------|
| `@radix-ui/react-accordion` | Accordion | ❌ not imported |
| `@radix-ui/react-alert-dialog` | Alert dialog | ❌ not imported |
| `@radix-ui/react-aspect-ratio` | Aspect ratio | ❌ not imported |
| `@radix-ui/react-avatar` | Avatar | ❌ not imported |
| `@radix-ui/react-checkbox` | Checkbox | ❌ not imported |
| `@radix-ui/react-collapsible` | Collapsible | ❌ not imported |
| `@radix-ui/react-context-menu` | Context menu | ❌ not imported |
| `@radix-ui/react-dialog` | Dialog | ❌ not imported |
| `@radix-ui/react-dropdown-menu` | Dropdown | ❌ not imported |
| `@radix-ui/react-hover-card` | Hover card | ❌ not imported |
| `@radix-ui/react-label` | Label | ❌ not imported |
| `@radix-ui/react-menubar` | Menubar | ❌ not imported |
| `@radix-ui/react-navigation-menu` | Nav menu | ❌ not imported |
| `@radix-ui/react-popover` | Popover | ❌ not imported |
| `@radix-ui/react-progress` | Progress | ❌ not imported |
| `@radix-ui/react-radio-group` | Radio group | ❌ not imported |
| `@radix-ui/react-scroll-area` | Scroll area | ❌ not imported |
| `@radix-ui/react-select` | Select | ❌ not imported |
| `@radix-ui/react-separator` | Separator | ❌ not imported |
| `@radix-ui/react-slider` | Slider | ❌ not imported |
| `@radix-ui/react-slot` | Slot | ❌ not imported |
| `@radix-ui/react-switch` | Switch | ❌ not imported |
| `@radix-ui/react-tabs` | Tabs | ❌ not imported |
| `@radix-ui/react-toast` | Toast | ❌ not imported |
| `@radix-ui/react-toggle` | Toggle | ❌ not imported |
| `@radix-ui/react-toggle-group` | Toggle group | ❌ not imported |
| `@radix-ui/react-tooltip` | Tooltip | ❌ not imported |
| `embla-carousel-react` | Carousel | ❌ not imported |
| `next-themes` | Theme switching | ❌ not imported |
| `input-otp` | OTP input | ❌ not imported |
| `cmdk` | Command palette | ❌ not imported |
| `vaul` | Drawer | ❌ not imported |
| `recharts` | Charts | ❌ not imported (custom SVG used) |
| `react-hook-form` | Form management | ❌ not imported |
| `react-resizable-panels` | Panels | ❌ not imported |
| `react-day-picker` | Date picker | ❌ not imported |
| `class-variance-authority` | CVA variants | ❌ not imported |

**Impact:** Removing these saves ~40 MB install size, cleans up `pnpm-lock.yaml`, and reduces attack surface.

**Note:** These dependencies **are** used by the `mockup-sandbox` artifact's `src/components/ui/` folder (55 shadcn/ui wrapper components, ~5,700 lines). However, the sandbox has its **own `package.json`** and these deps should only be listed there, not in `llm-championship`.

---

## 2. Code Duplication — Frontend (🟡 MEDIUM)

### 2.1 `shortName()` — 3 identical copies

Exact same function defined independently in 3 files:

```typescript
function shortName(name: string): string {
  return name.split("/").pop() || name;
}
```

| File | Line |
|------|------|
| `src/components/Commentator.tsx` | L20 |
| `src/components/JudgesScoreReveal.tsx` | L7 |
| `src/pages/CompetitionResults.tsx` | L22 |

**Fix:** Move to `src/lib/utils.ts` and import everywhere. Saves ~6 lines + prevents drift.

### 2.2 `formatMs()` — 2 identical copies

```typescript
function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}
```

| File | Line |
|------|------|
| `src/components/Commentator.tsx` | L24 |
| `src/pages/CompetitionResults.tsx` | L26 |

**Fix:** Move to `src/lib/utils.ts` (already contains `formatCost()`). Saves ~4 lines.

### 2.3 `parseDatasetItems()` / `parseMarkdownItems()` — cross-package duplication

Identical Markdown-splitting logic exists in both:

| File | Function name | Line |
|------|---------------|------|
| `artifacts/llm-championship/src/pages/CompetitionResults.tsx` | `parseDatasetItems()` | L31 |
| `artifacts/api-server/src/routes/competitions.ts` | `parseMarkdownItems()` | L321 |

**Fix:** Extract to `lib/store/src/index.ts` (both packages already import from `@workspace/store`). Saves ~12 lines and ensures consistent parsing.

---

## 3. Oversized Files (🟡 MEDIUM)

Files that exceed 300 LOC and should be considered for splitting:

| File | Lines | Sub-components | Recommendation |
|------|-------|----------------|----------------|
| `CompetitionResults.tsx` | **902** | RunProgressView, CeremonyHeader, OverviewTab, WinnersTab, DetailsTab, main | Split tabs into `pages/competition/OverviewTab.tsx` etc. |
| `Gateways.tsx` | **479** | ModelSelector, CustomHeaderEditor, GatewayForm, TestResult | Extract `ModelConfigPanel.tsx` |
| `Commentator.tsx` | **478** | Commentary logic + UI + event detection | Extract hook `useCommentaryEvents()` |
| `Datasets.tsx` | **427** | 3 tabs, upload form, generate form, edit dialog | Extract `DatasetEditDialog.tsx`, `GenerateDatasetForm.tsx` |
| `retro.tsx` | **364** | 10+ Retro components | OK — design-system convention, single import point |

**Priority:** `CompetitionResults.tsx` (902 LOC) is the most critical candidate — it contains 5 distinct sub-components that should be separate files.

---

## 4. Backend: `runCompetitionAsync()` (🟡 MEDIUM)

`artifacts/api-server/src/routes/competitions.ts` lines 147–291 (**145 LOC**):

- 5+ nesting levels deep
- Handles: gateway loading, contestant processing, judge scoring, result aggregation, partial saves, error handling
- Violates Single Responsibility Principle
- Hard to unit-test individual steps

**Recommended split:**

| Extracted function | Lines | Responsibility |
|-------------------|-------|----------------|
| `loadGatewayMap()` | ~15 | Build gateway lookup from competition models |
| `evaluateContestant()` | ~40 | Run all items for one model |
| `scoreResponse()` | ~25 | Run all judges for one item response |
| `buildResultEntry()` | ~25 | Already exists — aggregate model results |

---

## 5. Backend: Request/Response Pattern Duplication (🟢 LOW)

### 5.1 Resource lookup pattern repeated 8+ times

```typescript
const item = store.getItem(req.sessionId!, id);
if (!item) {
  res.status(404).json({ error: "Item not found" });
  return;
}
```

Appears in: `datasets.ts` (3×), `competitions.ts` (2×), `gateways.ts` (2×), `activities.ts` (1×)

**Fix option:** Extract middleware `findResource(store.getDataset, "Dataset")` or keep as-is (it's simple and explicit).

### 5.2 Inconsistent error response shapes

The API uses two different error shapes:
- `{ error: "..." }` — for 400/404/409 errors (most routes)
- `{ message: "..." }` — for both success (201/202) and some errors

**Fix:** Standardize: `{ error }` for errors, `{ message }` for success responses only.

---

## 6. Git Hygiene (🟡 MEDIUM)

### 6.1 Coverage folder committed to repository

`artifacts/llm-championship/coverage/` (31 files, 716 KB) is tracked by Git.

The root `.gitignore` has `/coverage` but this only matches root-level. The artifacts subfolder is not covered.

**Fix:** Add `**/coverage/` to `.gitignore` and remove from tracking:
```bash
echo "**/coverage/" >> .gitignore
git rm -r --cached artifacts/llm-championship/coverage/
```

### 6.2 Obsolete planning document

`plans/triangleVis.md` — explicitly marked as `"Diese Datei kann gelöscht werden"`. Content was consolidated into `arc42.md`.

**Fix:** Delete `plans/triangleVis.md`.

---

## 7. Unused Feature Code (🟢 LOW)

### 7.1 `RetroWindow` collapsible feature

`src/components/retro.tsx` implements `collapsible` and `defaultCollapsed` props (lines 10–47), but **no consumer currently passes these props**. The feature is fully functional but unused.

**Assessment:** Keep — it was recently implemented and may be used in upcoming UI changes. Only flag if still unused after 2+ sprints.

---

## 8. Backend: Magic Numbers (🟢 LOW)

| Value | File | Line | Suggestion |
|-------|------|------|------------|
| `5 * 1024 * 1024` | `datasets.ts` | L21 | → `const MAX_UPLOAD_SIZE = 5 * 1024 * 1024` |
| `4096` | `llm-gateway.ts` | L216 | → `const DEFAULT_MAX_TOKENS = 4096` |
| `500` (max logs) | `store/index.ts` | varies | Already a constant ✅ |
| `5` (max concurrency) | `competitions.ts` | L24 | Already `MAX_CONCURRENCY` ✅ |

---

## 9. Backend: `llm-gateway.ts` Complexity (🟢 LOW)

### 9.1 `buildRequestBody()` (L201–240) — 40 lines

Handles 3 provider formats in one switch statement. Could be cleaner with per-provider builders:

```typescript
const builders: Record<string, RequestBuilder> = {
  custom_anthropic: buildAnthropicRequest,
  custom_gemini: buildGeminiRequest,
  default: buildOpenAiRequest,
};
```

### 9.2 Unused interface field

`OpenRouterModelsResponse.pricing` (L45–47) is defined but the pricing data is never extracted from API responses. Either remove the field or implement pricing auto-fetch (related to Risk R1 in arc42).

---

## 10. `mockup-sandbox` Assessment (🟢 INFO)

The `artifacts/mockup-sandbox/` package contains:
- 55 shadcn/ui wrapper components (`src/components/ui/`) — **5,735 lines**
- 3 utility files (`hooks/`, `lib/`)
- 1 preview app (`App.tsx` — 146 lines)

**None of these components are imported by `llm-championship`.** The sandbox serves as a design prototyping tool and is independent.

**Assessment:** The sandbox is useful for rapid prototyping but should be documented as a dev-only tool. Its dependencies should not leak into `llm-championship/package.json`.

---

## Action Plan — Prioritized

### Quick Wins (< 30 min each)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Remove 35+ unused deps from `llm-championship/package.json` | ~40 MB saved, cleaner lockfile | 10 min |
| 2 | Move `shortName()` + `formatMs()` to `lib/utils.ts` | Eliminate 3+2 duplications | 10 min |
| 3 | Add `**/coverage/` to `.gitignore`, untrack coverage dir | Git hygiene | 5 min |
| 4 | Delete `plans/triangleVis.md` | Remove obsolete doc | 1 min |
| 5 | Extract constants for magic numbers in backend | Readability | 10 min |

### Medium Effort (1–2 hours each)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 6 | Split `CompetitionResults.tsx` into 5–6 files | Maintainability, 900→~150 LOC/file | 1.5 h |
| 7 | Extract `parseMarkdownItems()` to `@workspace/store` | Cross-package dedup | 30 min |
| 8 | Refactor `runCompetitionAsync()` into smaller functions | Testability | 1 h |
| 9 | Standardize API error response format | API consistency | 30 min |

### Larger Refactoring (optional, 2+ hours)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 10 | Split `Gateways.tsx`, `Datasets.tsx` into sub-components | Maintainability | 2 h |
| 11 | Extract `useCommentaryEvents()` hook from `Commentator.tsx` | Separation of concerns | 1.5 h |
| 12 | Split `llm-gateway.ts` provider builders | Extensibility | 1 h |

---

## Metrics Summary

| Metric | Current | After Quick Wins |
|--------|---------|-----------------|
| Total frontend LOC | ~3,982 | ~3,970 (−12) |
| Total backend LOC | ~1,408 | ~1,400 (−8) |
| npm dependencies (llm-championship) | ~80 | ~45 |
| Largest file | 902 LOC | 902 LOC (after #6: ~150) |
| Duplicated functions | 6 copies | 0 |
| Tracked coverage files | 31 | 0 |
