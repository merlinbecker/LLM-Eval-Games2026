# 2. Randbedingungen

| Kategorie         | Randbedingung                                                                                  |
|-------------------|------------------------------------------------------------------------------------------------|
| **Technisch**     | Node.js 24+, TypeScript 5.9, pnpm-Monorepo                                                    |
| **Technisch**     | In-Memory-Storage (session-scoped) + verschlüsselter Client-Vault (LocalStorage, AES-256-GCM)  |
| **Technisch**     | Alle LLM-Gateway-URLs müssen HTTPS verwenden; lokale/private IPs sind blockiert (SSRF-Schutz)  |
| **Organisatorisch** | OpenAPI-Spec (3.1) als Single Source of Truth für API-Kontrakte                              |
| **Organisatorisch** | Code-Generierung via Orval für API-Client, Zod-Schemas und React-Query-Hooks               |
| **Design**        | Retro-UI im Macintosh System 5 Stil (1-bit, Silkscreen-Font, Dithering)                       |

---