import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RemekWidgetProvider } from "@/contexts/RemekWidgetContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DirectorGuard } from "@/components/auth/DirectorGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Static imports (login page - fast loading)
import Login from "./pages/Login";

// Lazy-loaded pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Consultations = lazy(() => import("./pages/Consultations"));
const ConsultationDetail = lazy(() => import("./pages/ConsultationDetail"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const Matches = lazy(() => import("./pages/Matches"));
const Tasks = lazy(() => import("./pages/Tasks"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Settings = lazy(() => import("./pages/Settings"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Owner = lazy(() => import("./pages/Owner"));
const Superadmin = lazy(() => import("./pages/Superadmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const BugReports = lazy(() => import("./pages/BugReports"));
const Representatives = lazy(() => import("./pages/Representatives"));
const PolicyPipeline = lazy(() => import("./pages/PolicyPipeline"));
const Network = lazy(() => import("./pages/Network"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Deals = lazy(() => import("./pages/Deals"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const DealsTeamDashboard = lazy(() => import("./pages/DealsTeamDashboard"));
const MyDay = lazy(() => import("./pages/MyDay"));
const Calendar = lazy(() => import("./pages/Calendar"));

const NetworkFallback = () => (
  <div className="flex h-full">
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>
      <Skeleton className="flex-1 rounded-lg" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minut - dane CRM nie zmieniają się co sekundę
      gcTime: 10 * 60 * 1000,   // 10 minut w cache przed garbage collection
      retry: 1,                  // 1 retry przy błędzie (nie bombardujemy API)
      refetchOnWindowFocus: false, // brak refetch przy powrocie do karty
    },
  },
});

const App = () => (
  <ErrorBoundary onReset={() => window.location.reload()}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RemekWidgetProvider>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Protected routes */}
                <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
                  {/* Director-only routes */}
                  <Route path="/" element={<DirectorGuard><Dashboard /></DirectorGuard>} />
                  <Route path="/my-day" element={<DirectorGuard><MyDay /></DirectorGuard>} />
                  <Route path="/calendar" element={<DirectorGuard><Calendar /></DirectorGuard>} />
                  <Route path="/consultations" element={<DirectorGuard><Consultations /></DirectorGuard>} />
                  <Route path="/consultations/:id" element={<DirectorGuard><ConsultationDetail /></DirectorGuard>} />
                  <Route path="/meetings" element={<DirectorGuard><Meetings /></DirectorGuard>} />
                  <Route path="/meetings/:id" element={<DirectorGuard><MeetingDetail /></DirectorGuard>} />
                  <Route path="/matches" element={<DirectorGuard><Matches /></DirectorGuard>} />
                  <Route 
                    path="/network" 
                    element={
                      <DirectorGuard>
                        <ErrorBoundary>
                          <Suspense fallback={<NetworkFallback />}>
                            <Network />
                          </Suspense>
                        </ErrorBoundary>
                      </DirectorGuard>
                    } 
                  />
                  <Route path="/tasks" element={<DirectorGuard><Tasks /></DirectorGuard>} />
                  <Route path="/pipeline" element={<DirectorGuard><PolicyPipeline /></DirectorGuard>} />
                  <Route path="/projects" element={<DirectorGuard><Projects /></DirectorGuard>} />
                  <Route path="/projects/:id" element={<DirectorGuard><ProjectDetail /></DirectorGuard>} />
                  <Route path="/deals" element={<DirectorGuard><Deals /></DirectorGuard>} />
                  <Route path="/deals/:id" element={<DirectorGuard><DealDetail /></DirectorGuard>} />
                  <Route path="/deals-team" element={<DirectorGuard><DealsTeamDashboard /></DirectorGuard>} />
                  <Route path="/bug-reports" element={<DirectorGuard><BugReports /></DirectorGuard>} />
                  <Route path="/representatives" element={<DirectorGuard><Representatives /></DirectorGuard>} />
                  <Route path="/search" element={<DirectorGuard><Search /></DirectorGuard>} />
                  <Route path="/notifications" element={<DirectorGuard><Notifications /></DirectorGuard>} />
                  <Route path="/analytics" element={<DirectorGuard><Analytics /></DirectorGuard>} />
                  <Route path="/ai" element={<DirectorGuard><AIChat /></DirectorGuard>} />
                  <Route path="/owner" element={<DirectorGuard><Owner /></DirectorGuard>} />
                  <Route path="/superadmin" element={<DirectorGuard><Superadmin /></DirectorGuard>} />
                  
                  {/* Routes accessible by both directors and assistants */}
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/contacts/:id" element={<ContactDetail />} />
                  <Route path="/companies/:id" element={<DirectorGuard><CompanyDetail /></DirectorGuard>} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </RemekWidgetProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
