import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/useNotifications";
import NotFound from "@/pages/not-found";
import Calendar from "@/pages/calendar";
import Tasks from "@/pages/tasks";
import Materials from "@/pages/materials";
import Reports from "@/pages/reports";

function Router() {
  // Initialize notifications system
  useNotifications();
  
  return (
    <Switch>
      <Route path="/" component={Calendar} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/materials" component={Materials} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
