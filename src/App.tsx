import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";
import Workflows from "./pages/Workflows";
import AutomationsList from "./pages/automations/AutomationsList";
import AutomationBuilder from "./pages/automations/AutomationBuilder";
import AutomationRuns from "./pages/automations/AutomationRuns";
import Memory from "./pages/Memory";
import EmailPage from "./pages/Email";
import Documents from "./pages/Documents";
import Approvals from "./pages/Approvals";
import Logs from "./pages/Logs";
import SettingsPage from "./pages/SettingsPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { JwbaLayout } from "./jwba/JwbaLayout";
import DailyRedirect from "./jwba/pages/DailyRedirect";
import DailyPage from "./jwba/pages/DailyPage";
import PageRoute from "./jwba/pages/PageRoute";
import GraphView from "./jwba/pages/GraphView";
import MapPage from "./jwba/pages/MapPage";
import AgentsPage from "./jwba/pages/AgentsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/automations" element={<AutomationsList />} />
              <Route path="/automations/:id" element={<AutomationBuilder />} />
              <Route path="/automations/:id/runs" element={<AutomationRuns />} />
              <Route path="/memory" element={<Memory />} />
              <Route path="/email" element={<EmailPage />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route element={<ProtectedRoute><JwbaLayout /></ProtectedRoute>}>
              <Route path="/workspace" element={<DailyRedirect />} />
              <Route path="/workspace/daily/:date" element={<DailyPage />} />
              <Route path="/workspace/page/:id" element={<PageRoute />} />
              <Route path="/workspace/graph" element={<GraphView />} />
              <Route path="/workspace/map" element={<MapPage />} />
              <Route path="/workspace/agents" element={<AgentsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
