import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DirectorGuard } from "@/components/auth/DirectorGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { SGUAccessGuard } from "@/components/auth/SGUAccessGuard";
import { CRMOnlyGuard } from "@/components/auth/CRMOnlyGuard";
import { PostLoginRedirect } from "@/components/auth/PostLoginRedirect";
import { LayoutModeProvider } from "@/store/layoutMode";
import { AppLayout } from "@/components/layout/AppLayout";
import { SGULayout } from "@/components/layout/SGULayout";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeatureFlagGate } from "@/components/common/FeatureFlagGate";

// Static imports (login page - fast loading)
import Login from "./pages/Login";

// Lazy-loaded pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const SetupSGU = lazy(() => import("./pages/SetupSGU"));
const SGURepresentatives = lazy(() => import("./pages/sgu/SGURepresentatives"));
const SGUAssignments = lazy(() => import("./pages/sgu/SGUAssignments"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const ContactDetailV2 = lazy(() => import("./pages/ContactDetailV2"));
const Consultations = lazy(() => import("./pages/Consultations"));
const ConsultationDetail = lazy(() => import("./pages/ConsultationDetail"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const Matches = lazy(() => import("./pages/Matches"));
const Settings = lazy(() => import("./pages/Settings"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Owner = lazy(() => import("./pages/Owner"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const BugReports = lazy(() => import("./pages/BugReports"));
const Representatives = lazy(() => import("./pages/Representatives"));
const PolicyPipeline = lazy(() => import("./pages/PolicyPipeline"));
const Network = lazy(() => import("./pages/Network"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const DealsTeamDashboard = lazy(() => import("./pages/DealsTeamDashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Sovra = lazy(() => import("./pages/Sovra"));
const WantedContacts = lazy(() => import("./pages/WantedContacts"));
const TaskAnalytics = lazy(() => import("./pages/TaskAnalytics"));
const TeamProductivityReport = lazy(() => import("./pages/TeamProductivityReport"));
const Workspace = lazy(() => import("./pages/Workspace"));
const AICosts = lazy(() => import("./pages/owner/AICosts"));
const Inbox = lazy(() => import("./pages/Inbox"));

// SGU pages (lazy)
const SGUDashboard = lazy(() => import("./pages/sgu/SGUDashboard"));
const SGUTeam = lazy(() => import("./pages/sgu/SGUTeam"));
const SGUReports = lazy(() => import("./pages/sgu/SGUReports"));
const SGUAdmin = lazy(() => import("./pages/sgu/SGUAdmin"));
const SGUSettings = lazy(() => import("./pages/sgu/SGUSettings"));
const SGUCaseD = lazy(() => import("./pages/sgu/SGUCaseD"));
const SGUPipelineRoute = lazy(() => import("./pages/sgu/SGUPipelineRoute"));
const SGUTasks = lazy(() => import("./pages/sgu/SGUTasks"));
const SGUClients = lazy(() => import("./pages/sgu/SGUClients"));
const SGURedirect = lazy(() => import("./pages/sgu/SGURedirect"));
const SGUOdprawa = lazy(() => import("./pages/sgu/SGUOdprawa"));
const SGUOdprawaHistoria = lazy(() => import("./pages/sgu/SGUOdprawaHistoria"));

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
            <LayoutModeProvider>
              <PostLoginRedirect />
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/setup-sgu" element={<AuthGuard><SetupSGU /></AuthGuard>} />
                
                {/* Protected routes */}
                <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
                  {/* Director-only routes */}
                  <Route path="/" element={<DirectorGuard><Dashboard /></DirectorGuard>} />
                  <Route path="/calendar" element={<DirectorGuard><Calendar /></DirectorGuard>} />
                  <Route path="/inbox" element={<DirectorGuard><Inbox /></DirectorGuard>} />
                  <Route path="/workspace" element={<DirectorGuard><Workspace /></DirectorGuard>} />
                  <Route path="/consultations" element={<DirectorGuard><Consultations /></DirectorGuard>} />
                  <Route path="/consultations/:id" element={<DirectorGuard><ConsultationDetail /></DirectorGuard>} />
                  <Route path="/meetings" element={<DirectorGuard><Meetings /></DirectorGuard>} />
                  <Route path="/meetings/:id" element={<DirectorGuard><MeetingDetail /></DirectorGuard>} />
                  <Route path="/matches" element={<AdminGuard><Matches /></AdminGuard>} />
                  <Route 
                    path="/network" 
                    element={
                      <AdminGuard>
                        <ErrorBoundary>
                          <Suspense fallback={<NetworkFallback />}>
                            <Network />
                          </Suspense>
                        </ErrorBoundary>
                      </AdminGuard>
                    } 
                  />
                  <Route path="/tasks/analytics" element={<DirectorGuard><TaskAnalytics /></DirectorGuard>} />
                  <Route path="/tasks/team-report" element={<DirectorGuard><TeamProductivityReport /></DirectorGuard>} />
                  <Route path="/pipeline" element={<AdminGuard><PolicyPipeline /></AdminGuard>} />
                  <Route path="/projects" element={<DirectorGuard><Projects /></DirectorGuard>} />
                  <Route path="/projects/:id" element={<DirectorGuard><ProjectDetail /></DirectorGuard>} />
                  <Route path="/deals-team" element={<DirectorGuard><DealsTeamDashboard /></DirectorGuard>} />
                  <Route path="/wanted" element={<DirectorGuard><WantedContacts /></DirectorGuard>} />
                  <Route path="/bug-reports" element={<DirectorGuard><BugReports /></DirectorGuard>} />
                  <Route path="/representatives" element={<DirectorGuard><Representatives /></DirectorGuard>} />
                  <Route path="/search" element={<DirectorGuard><Search /></DirectorGuard>} />
                  <Route path="/notifications" element={<DirectorGuard><Notifications /></DirectorGuard>} />
                  <Route path="/analytics" element={<DirectorGuard><Analytics /></DirectorGuard>} />
                  <Route path="/sovra" element={<DirectorGuard><Sovra /></DirectorGuard>} />
                  <Route path="/owner" element={<DirectorGuard><Owner /></DirectorGuard>} />
                  <Route path="/owner/ai-costs" element={<AdminGuard><AICosts /></AdminGuard>} />
                  
                  {/* Routes accessible by both directors and assistants — but blocked for SGU-only users */}
                  <Route path="/contacts" element={<CRMOnlyGuard><Contacts /></CRMOnlyGuard>} />
                  <Route path="/contacts/:id" element={<CRMOnlyGuard><FeatureFlagGate flag="contact_detail_v2" fallback={<ContactDetail />}><ContactDetailV2 /></FeatureFlagGate></CRMOnlyGuard>} />
                  <Route path="/contacts-v2/:id" element={<CRMOnlyGuard><ContactDetailV2 /></CRMOnlyGuard>} />
                  <Route path="/companies/:id" element={<CRMOnlyGuard><DirectorGuard><CompanyDetail /></DirectorGuard></CRMOnlyGuard>} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* SGU routes — separate layout, gated by SGUAccessGuard */}
                <Route element={<AuthGuard><SGUAccessGuard><SGULayout /></SGUAccessGuard></AuthGuard>}>
                  {/* New Polish-named routes (SGU-REFACTOR-IA) */}
                  <Route path="/sgu" element={<SGUDashboard />} />
                  <Route path="/sgu/sprzedaz" element={<SGUPipelineRoute />} />
                  {/* Alias EN → PL (CLEANUP-BUGS-01 #25) */}
                  <Route path="/sgu/clients" element={<Navigate to="/sgu/klienci" replace />} />
                  <Route path="/sgu/klienci" element={<SGUClients />} />
                  <Route path="/sgu/zadania" element={<SGUTasks />} />
                  <Route path="/sgu/odprawa" element={<SGUOdprawa />} />
                  <Route path="/sgu/odprawa/historia" element={<SGUOdprawaHistoria />} />
                  <Route path="/sgu/raporty" element={<SGUReports />} />
                  <Route path="/sgu/raporty/:period" element={<SGUReports />} />
                  <Route path="/sgu/team" element={<SGUTeam />} />
                  <Route path="/sgu/admin" element={<SGUAdmin />} />
                  <Route path="/sgu/admin/representatives" element={<SGURepresentatives />} />
                  <Route path="/sgu/admin/assignments" element={<SGUAssignments />} />
                  <Route path="/sgu/admin/commissions/case-d" element={<SGUCaseD />} />
                  <Route path="/sgu/admin/:section" element={<SGUAdmin />} />
                  <Route path="/sgu/settings" element={<SGUSettings />} />

                  {/* Legacy redirects (rename) */}
                  <Route path="/sgu/dashboard" element={<SGURedirect to="/sgu" message="Dashboard SGU ma nowy adres" />} />
                  <Route path="/sgu/pipeline" element={<SGURedirect to="/sgu/sprzedaz" message="Lejek przeniesiony do /sgu/sprzedaz" />} />
                  <Route path="/sgu/tasks" element={<SGURedirect to="/sgu/zadania" message="Zadania przeniesione do /sgu/zadania" />} />
                  <Route path="/sgu/reports" element={<SGURedirect to="/sgu/raporty" message="Raporty przeniesione do /sgu/raporty" />} />
                  <Route path="/sgu/reports/:period" element={<SGURedirect to="/sgu/raporty" message="Raporty przeniesione do /sgu/raporty" />} />
                </Route>
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </LayoutModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
