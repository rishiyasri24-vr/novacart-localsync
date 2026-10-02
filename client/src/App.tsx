import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocalSyncProvider } from "./contexts/LocalSyncContext";
import { useAuth } from "./_core/hooks/useAuth";
import Home from "./pages/Home";

type AuthUser = { role?: string | null } | null;

function AccessDenied() {
  return <main className="access-denied"><div className="access-denied-card"><div className="access-denied-icon">!</div><span className="mini-label">ADMIN FEATURE LOCKED</span><h1>Admin access required.</h1><p>This operations workspace is restricted to users with the <strong>admin</strong> role. Ask an account administrator to grant access.</p><a className="primary-button" href="/">Return to customer workspace</a></div></main>;
}

function Router({ user }: { user: AuthUser }) {
  const isAdmin = user?.role === "admin";
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/customer" component={Home} />
      <Route path="/store" component={Home} />
      <Route path="/operations" component={isAdmin ? Home : AccessDenied} />
      <Route path="/product/:id" component={Home} />
      <Route path="/orders/:id" component={Home} />
      <Route path="/support" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { loading, user } = useAuth();
  if (loading) return <div className="auth-loading"><span className="live-dot" /> Restoring your connected account…</div>;
  if (!user) return <LoginPage />;
  return <Router user={user} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LocalSyncProvider>
          <TooltipProvider>
            <Toaster />
            <AuthenticatedApp />
          </TooltipProvider>
        </LocalSyncProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
