import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import NotFound from "@/pages/not-found";
import { TopMenu } from "@/components/TopMenu";
import { VaultProvider } from "@/lib/vault/vault-store";
import { VaultGuard } from "@/components/VaultGuard";
import { BackgroundActivityProvider } from "@/lib/background-activities";

import ArenaDashboard from "@/pages/ArenaDashboard";
import Datasets from "@/pages/Datasets";
import Gateways from "@/pages/Gateways";
import NewCompetition from "@/pages/NewCompetition";
import CompetitionResults from "@/pages/CompetitionResults";
import Logs from "@/pages/Logs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={ArenaDashboard} />
      <Route path="/datasets" component={Datasets} />
      <Route path="/gateways" component={Gateways} />
      <Route path="/competitions/new" component={NewCompetition} />
      <Route path="/competitions/:id" component={CompetitionResults} />
      <Route path="/logs" component={Logs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <VaultProvider>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <VaultGuard>
            <BackgroundActivityProvider>
              <TopMenu />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  className: "border-[3px] border-mac-black font-display text-sm bg-mac-white text-mac-black retro-shadow-sm",
                }}
              />
              <div className="pt-16 px-4 md:px-8 min-h-screen">
                <Router />
              </div>
            </BackgroundActivityProvider>
          </VaultGuard>
        </WouterRouter>
      </QueryClientProvider>
    </VaultProvider>
  );
}

export default App;
