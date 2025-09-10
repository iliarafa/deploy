import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/useNotifications";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Calendar from "@/pages/calendar";
import Tasks from "@/pages/tasks";
import Materials from "@/pages/materials";
import Reports from "@/pages/reports";
import AdminPanel from "@/pages/admin-panel";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Log from "@/pages/log";

function Router() {
  // Initialize notifications system
  useNotifications();
  
  return (
    <Switch>
      <Route path="/" component={Calendar} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/log" component={Log} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/materials" component={Materials} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
