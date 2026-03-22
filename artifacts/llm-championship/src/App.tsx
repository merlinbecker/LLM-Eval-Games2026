import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { TopMenu } from "@/components/TopMenu";

// Pages
import ArenaDashboard from "@/pages/ArenaDashboard";
import Datasets from "@/pages/Datasets";
import Gateways from "@/pages/Gateways";
import NewCompetition from "@/pages/NewCompetition";
import CompetitionResults from "@/pages/CompetitionResults";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <TopMenu />
          <div className="pt-16 px-4 md:px-8 min-h-screen">
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
