import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

// Pages
import Home from "@/pages/home";
import Browse from "@/pages/browse";
import Search from "@/pages/search";
import AnimeDetail from "@/pages/anime-detail";
import Watch from "@/pages/watch";
import Profile from "@/pages/profile";
import Library from "@/pages/library";
import History from "@/pages/history";
import Collections from "@/pages/collections";
import CollectionDetail from "@/pages/collection-detail";
import Schedule from "@/pages/schedule";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 60_000,
      retry: 0,
    },
  },
});


function ScrollToTopOnRouteChange() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);

  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/browse" component={Browse} />
        <Route path="/search" component={Search} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/anime/:id" component={AnimeDetail} />
        <Route path="/watch/:kodikId/:episode/:translationId" component={Watch} />
        <Route path="/profile" component={Profile} />
        <Route path="/library" component={Library} />
        <Route path="/history" component={History} />
        <Route path="/collections" component={Collections} />
        <Route path="/collections/:id" component={CollectionDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ScrollToTopOnRouteChange />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
