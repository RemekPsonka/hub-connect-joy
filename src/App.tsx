import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DirectorGuard } from "@/components/auth/DirectorGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

// Pages - static imports
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Consultations from "./pages/Consultations";
import ConsultationDetail from "./pages/ConsultationDetail";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
import Matches from "./pages/Matches";
import Tasks from "./pages/Tasks";
import AIChat from "./pages/AIChat";
import Settings from "./pages/Settings";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import Owner from "./pages/Owner";
import Superadmin from "./pages/Superadmin";
import NotFound from "./pages/NotFound";
import CompanyDetail from "./pages/CompanyDetail";
import BugReports from "./pages/BugReports";

// Lazy load Network page to isolate sigma library issues
const Network = lazy(() => import("./pages/Network"));

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
              {/* Director-only routes */}
              <Route path="/" element={<DirectorGuard><Dashboard /></DirectorGuard>} />
              <Route path="/consultations" element={<DirectorGuard><Consultations /></DirectorGuard>} />
              <Route path="/consultations/:id" element={<DirectorGuard><ConsultationDetail /></DirectorGuard>} />
              <Route path="/meetings" element={<DirectorGuard><Meetings /></DirectorGuard>} />
              <Route path="/meetings/:id" element={<DirectorGuard><MeetingDetail /></DirectorGuard>} />
              <Route path="/matches" element={<DirectorGuard><Matches /></DirectorGuard>} />
              <Route 
                path="/network" 
                element={
                  <DirectorGuard>
                    <Suspense fallback={<NetworkFallback />}>
                      <Network />
                    </Suspense>
                  </DirectorGuard>
                } 
              />
              <Route path="/tasks" element={<DirectorGuard><Tasks /></DirectorGuard>} />
              <Route path="/bug-reports" element={<DirectorGuard><BugReports /></DirectorGuard>} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
