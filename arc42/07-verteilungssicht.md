# 7. Verteilungssicht

## 7.1 Infrastruktur Ebene 1

```mermaid
C4Deployment
    title Deployment-Diagramm — LLM Championship

    Deployment_Node(devEnv, "Entwicklungsumgebung", "GitHub Codespace / Docker Dev Container") {
        Deployment_Node(nodeRuntime, "Node.js 24 Runtime") {
            Container(frontendDev, "Frontend Dev Server", "Vite", "HMR, Port 5173")
            Container(apiDev, "API Server", "Express 5", "Port konfigurierbar via PORT env; In-Memory-Store (kein externer Datenbankserver)")
        }
    }

    Deployment_Node(browser, "Browser des Benutzers") {
        Container(clientVault, "Client-Vault", "LocalStorage + AES-256-GCM", "Verschlüsselter Datenspeicher für Gateways, Datasets und Einstellungen")
    }

    Deployment_Node(extCloud, "Externe Cloud-Dienste") {
        Deployment_Node(llmProvider, "LLM-Anbieter") {
            Container(openrouterSvc, "OpenRouter API", "HTTPS")
            Container(githubSvc, "GitHub Copilot API", "HTTPS")
            Container(customSvc, "Custom LLM API", "HTTPS")
        }
    }

    Rel(frontendDev, apiDev, "HTTP", "/api/*")
    Rel(apiDev, openrouterSvc, "HTTPS", "/chat/completions")
    Rel(apiDev, githubSvc, "HTTPS", "/chat/completions")
    Rel(apiDev, customSvc, "HTTPS", "/chat/completions")
    Rel(frontendDev, clientVault, "LocalStorage API", "Vault lesen/schreiben")
```

**Zuordnung von Bausteinen zu Infrastruktur:**

| Baustein               | Deployment-Ziel                | Konfiguration                              |
|------------------------|-------------------------------|--------------------------------------------|
| Frontend SPA           | Vite Dev Server (Port 5173)   | `BASE_URL`, `PORT` Umgebungsvariablen       |
| API Server             | Node.js-Prozess               | `PORT` Umgebungsvariable                    |
| Client-Vault           | Browser LocalStorage          | Passwortgeschützt (AES-256-GCM)            |
| LLM Gateway APIs       | Externe Cloud-Dienste         | Gateway-spezifische Base-URLs und API-Keys  |

---