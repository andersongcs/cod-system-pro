import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import SettingsShopify from "./pages/SettingsShopify";
import SettingsWhatsApp from "./pages/SettingsWhatsApp";
import SettingsMessages from "./pages/SettingsMessages";
import SettingsAutomation from "./pages/SettingsAutomation";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoginRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/settings/shopify" element={<ProtectedRoute><SettingsShopify /></ProtectedRoute>} />
            <Route path="/settings/whatsapp" element={<ProtectedRoute><SettingsWhatsApp /></ProtectedRoute>} />
            <Route path="/settings/messages" element={<ProtectedRoute><SettingsMessages /></ProtectedRoute>} />
            <Route path="/settings/automation" element={<ProtectedRoute><SettingsAutomation /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
