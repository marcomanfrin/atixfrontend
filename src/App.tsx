import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import LoginPage from "./pages/LoginPage";
import { Sentry } from "./lib/sentry";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TicketsPage = lazy(() => import("./pages/TicketsPage"));
const TicketDetailPage = lazy(() => import("./pages/TicketDetailPage"));
const WorksPage = lazy(() => import("./pages/WorksPage"));
const WorkDetailPage = lazy(() => import("./pages/WorkDetailPage"));
const CreateWorkPage = lazy(() => import("./pages/CreateWorkPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const PlantsPage = lazy(() => import("./pages/PlantsPage"));
const PlantDetailPage = lazy(() => import("./pages/PlantDetailPage"));
const WorksiteReferencesPage = lazy(() => import("./pages/WorksiteReferencesPage"));
const WorksiteReferenceDetailPage = lazy(() => import("./pages/WorksiteReferenceDetailPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AccessLogsPage = lazy(() => import("./pages/AccessLogsPage"));
const RapportiniPage = lazy(() => import("./pages/RapportiniPage"));
const RapportinoDetailPage = lazy(() => import("./pages/RapportinoDetailPage"));
const RapportinoWizardPage = lazy(() => import("./pages/RapportinoWizardPage"));
const PublicSignPage = lazy(() => import("./pages/PublicSignPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <Sentry.ErrorBoundary
    fallback={({ error, resetError }) => (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-destructive">Si è verificato un errore</h2>
          <p className="text-sm text-muted-foreground">
            Ci scusiamo per l'inconveniente. L'errore è stato registrato e verrà esaminato.
          </p>
          <details className="rounded bg-muted p-3">
            <summary className="cursor-pointer font-medium">Dettagli tecnici</summary>
            <pre className="mt-2 overflow-auto text-xs">{error.toString()}</pre>
          </details>
          <button
            onClick={resetError}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Riprova
          </button>
        </div>
      </div>
    )}
    showDialog={false}
  >
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Customer signing link: outside AuthProvider, so no session logic (and no /login redirect) runs here */}
              <Route
                path="/sign/:token"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <PublicSignPage />
                  </Suspense>
                }
              />
              <Route
                path="/*"
                element={
                  <AuthProvider>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <AppLayout>
                              <Suspense fallback={<LoadingSpinner />}>
                                <Routes>
                                  <Route path="/" element={<Dashboard />} />
                                  <Route path="/calendar" element={<CalendarPage />} />
                                  <Route path="/tickets" element={<TicketsPage />} />
                                  <Route path="/tickets/:id" element={<TicketDetailPage />} />
                                  <Route path="/works" element={<WorksPage />} />
                                  <Route path="/works/new" element={<CreateWorkPage />} />
                                  <Route path="/works/:id" element={<WorkDetailPage />} />
                                  <Route path="/reports" element={<RapportiniPage />} />
                                  <Route path="/reports/:id" element={<RapportinoDetailPage />} />
                                  <Route path="/reports/:id/edit" element={<RapportinoWizardPage />} />
                                  <Route path="/users" element={<UsersPage />} />
                                  <Route path="/clients" element={<ClientsPage />} />
                                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                                  <Route path="/plants" element={<PlantsPage />} />
                                  <Route path="/plants/:id" element={<PlantDetailPage />} />
                                  <Route path="/worksite-references" element={<WorksiteReferencesPage />} />
                                  <Route path="/worksite-references/:id" element={<WorksiteReferenceDetailPage />} />
                                  <Route path="/profile" element={<ProfilePage />} />
                                  <Route path="/access-logs" element={<AccessLogsPage />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </Suspense>
                            </AppLayout>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </AuthProvider>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
