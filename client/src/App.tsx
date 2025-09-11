import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/useNotifications";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import LandingPage from "@/components/landing-page";
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
  const { isAuthenticated, isLoading } = useAuth();
  
  // Initialize notifications system only when authenticated
  if (isAuthenticated) {
    useNotifications();
  }
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show landing page if not authenticated
  if (!isAuthenticated) {
    return <LandingPage />;
  }
  
  // Show full app if authenticated
  return (
    <Switch>
      <Route path="/" component={Calendar} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/log" component={Log} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/materials" component={Materials} />
      <Route path="/reports" component={Reports} />
      <Route path="/admin" component={AdminPanel} />
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
