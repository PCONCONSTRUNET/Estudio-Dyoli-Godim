import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Agendar from "./pages/Agendar";
import Agendamento from "./pages/Agendamento";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Confirmar from "./pages/Confirmar";
import Sucesso from "./pages/Sucesso";
import Cuidados from "./pages/Cuidados";
import NotFound from "./pages/NotFound";
import PushPromptModal from "./components/PushPromptModal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/agendamento" element={<Agendamento />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/confirmar" element={<Confirmar />} />
          <Route path="/sucesso" element={<Sucesso />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/cuidados" element={<Cuidados />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <PushPromptModal excludePaths={["/admin", "/auth"]} />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
