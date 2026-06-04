import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Agendar from "./pages/Agendar";
import Agendamento from "./pages/Agendamento";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Confirmar from "./pages/Confirmar";
import Sucesso from "./pages/Sucesso";
import Cuidados from "./pages/Cuidados";
import Instalar from "./pages/Instalar";
import AdminBotWpp from "./pages/AdminBotWpp";
import Avaliar from "./pages/Avaliar";
import AnamnesePdfView from "./pages/AnamnesePdfView";
import NotFound from "./pages/NotFound";
import PushPromptModal from "./components/PushPromptModal";
import InstallAppBanner from "./components/InstallAppBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfirmProvider>
      <TooltipProvider>
        <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/simplificada" element={<Agendamento />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/confirmar" element={<Confirmar />} />
          <Route path="/sucesso" element={<Sucesso />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/cuidados" element={<Cuidados />} />
          <Route path="/instalar" element={<Instalar />} />
          <Route path="/admin-bot-wpp" element={<AdminBotWpp />} />
          <Route path="/avaliar" element={<Avaliar />} />
          <Route path="/anamnese/:id/pdf" element={<AnamnesePdfView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <PushPromptModal excludePaths={["/admin", "/auth"]} />
        <InstallAppBanner />
      </BrowserRouter>
      </TooltipProvider>
    </ConfirmProvider>
  </QueryClientProvider>
);

export default App;
