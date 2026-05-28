import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  BadgeDollarSign, 
  Search, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  X,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Divida {
  id: string;
  user_id: string | null;
  cliente_nome: string;
  descricao: string;
  valor_total: number;
  valor_pago: number;
  status: string;
  data_criacao: string;
}

interface Profile {
  id: string;
  nome: string | null;
  telefone: string | null;
}

const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const formatDateShort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const DividasTab = () => {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modais
  const [isNovaDividaOpen, setIsNovaDividaOpen] = useState(false);
  const [isBaixaOpen, setIsBaixaOpen] = useState(false);
  
  // States para Nova Dívida
  const [newClienteId, setNewClienteId] = useState("");
  const [newClienteNome, setNewClienteNome] = useState("");
  const [newDescricao, setNewDescricao] = useState("");
  const [newValorTotal, setNewValorTotal] = useState("");

  // States para Baixa
  const [selectedDivida, setSelectedDivida] = useState<Divida | null>(null);
  const [valorBaixa, setValorBaixa] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dividasRes, profilesRes] = await Promise.all([
        supabase.from("dividas").select("*").order("data_criacao", { ascending: false }),
        supabase.from("profiles").select("id, nome, telefone")
      ]);
      
      if (dividasRes.data) setDividas(dividasRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDividas = dividas.filter(d => 
    d.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
    d.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateDivida = async () => {
    if (!newClienteNome && !newClienteId) {
      toast.error("Selecione um cliente ou digite um nome.");
      return;
    }
    if (!newDescricao) {
      toast.error("Digite uma descrição para a dívida.");
      return;
    }
    const valor = parseFloat(newValorTotal.replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      toast.error("Digite um valor válido.");
      return;
    }

    try {
      let nomeFinal = newClienteNome;
      if (newClienteId) {
        const p = profiles.find(p => p.id === newClienteId);
        if (p?.nome) nomeFinal = p.nome;
      }

      const { data, error } = await supabase.from("dividas").insert({
        user_id: newClienteId || null,
        cliente_nome: nomeFinal,
        descricao: newDescricao,
        valor_total: valor,
        valor_pago: 0,
        status: "pendente"
      }).select().single();

      if (error) throw error;

      toast.success("Dívida registrada com sucesso!");
      setDividas([data, ...dividas]);
      setIsNovaDividaOpen(false);
      setNewClienteId("");
      setNewClienteNome("");
      setNewDescricao("");
      setNewValorTotal("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao criar dívida.");
    }
  };

  const handleDarBaixa = async () => {
    if (!selectedDivida) return;
    
    const valorPagar = parseFloat(valorBaixa.replace(",", "."));
    if (isNaN(valorPagar) || valorPagar <= 0) {
      toast.error("Digite um valor válido.");
      return;
    }

    const valorRestante = selectedDivida.valor_total - selectedDivida.valor_pago;
    if (valorPagar > valorRestante) {
      toast.error(`O valor não pode ser maior que o restante (${formatCurrency(valorRestante)})`);
      return;
    }

    const novoValorPago = selectedDivida.valor_pago + valorPagar;
    const novoStatus = novoValorPago >= selectedDivida.valor_total ? "paga" : "parcial";

    try {
      // 1. Atualizar a dívida
      const { error: errorDivida } = await supabase.from("dividas").update({
        valor_pago: novoValorPago,
        status: novoStatus
      }).eq("id", selectedDivida.id);

      if (errorDivida) throw errorDivida;

      // 2. Lançar o pagamento como serviço no Caixa (Agendamentos)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      
      const { error: errorAgendamento } = await supabase.from("agendamentos").insert({
        user_id: selectedDivida.user_id, // Pode ser nulo se for cliente sem cadastro
        cliente_nome: selectedDivida.cliente_nome,
        servico: `Pagamento de Dívida - ${selectedDivida.descricao}`,
        valor: valorPagar, // O valor cobrado é o que ele tá pagando
        valor_pago: valorPagar, // O valor pago é o que ele tá pagando
        data_agendamento: now.toISOString().split('T')[0],
        horario: timeStr,
        status: "concluido",
        observacao: `Baixa de dívida no valor de ${formatCurrency(valorPagar)}`
      });

      if (errorAgendamento) throw errorAgendamento;

      toast.success("Baixa realizada com sucesso!");
      
      // Atualizar lista local
      setDividas(dividas.map(d => 
        d.id === selectedDivida.id 
          ? { ...d, valor_pago: novoValorPago, status: novoStatus } 
          : d
      ));
      
      setIsBaixaOpen(false);
      setSelectedDivida(null);
      setValorBaixa("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao registrar o pagamento.");
    }
  };

  const totalDevendo = dividas
    .filter(d => d.status !== 'paga')
    .reduce((acc, curr) => acc + (curr.valor_total - curr.valor_pago), 0);

  const totalRecebido = dividas
    .reduce((acc, curr) => acc + curr.valor_pago, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER E MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-rose/[0.1] via-primary-foreground/[0.02] to-transparent border border-rose/20">
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-rose/10 blur-3xl" />
          <p className="font-body text-[11px] font-medium text-primary-foreground/60 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose" /> Total a Receber
          </p>
          <p className="font-heading text-3xl font-bold text-rose mt-2 tabular-nums">
            {formatCurrency(totalDevendo)}
          </p>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-green-500/[0.1] via-primary-foreground/[0.02] to-transparent border border-green-500/20">
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-green-500/10 blur-3xl" />
          <p className="font-body text-[11px] font-medium text-primary-foreground/60 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Dívidas Recebidas
          </p>
          <p className="font-heading text-3xl font-bold text-green-400 mt-2 tabular-nums">
            {formatCurrency(totalRecebido)}
          </p>
        </div>
      </div>

      {/* AÇÕES E FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/40" />
          <input
            type="text"
            placeholder="Buscar por cliente ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] text-primary-foreground placeholder:text-primary-foreground/30 font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          />
        </div>
        <button
          onClick={() => setIsNovaDividaOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gold/15 text-gold font-body text-[13px] font-bold uppercase tracking-wider hover:bg-gold/25 transition-all border border-gold/20 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Nova Dívida
        </button>
      </div>

      {/* LISTAGEM DE DÍVIDAS */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-10 text-primary-foreground/40 font-body text-sm">Carregando dívidas...</p>
        ) : filteredDividas.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-primary-foreground/[0.08] bg-primary-foreground/[0.01]">
            <BadgeDollarSign className="w-8 h-8 text-primary-foreground/20 mx-auto mb-3" />
            <p className="text-primary-foreground/40 font-body text-sm">Nenhuma dívida encontrada.</p>
          </div>
        ) : (
          filteredDividas.map(divida => {
            const restante = divida.valor_total - divida.valor_pago;
            const isPaga = divida.status === 'paga';

            return (
              <div 
                key={divida.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isPaga 
                    ? "bg-green-500/[0.02] border-green-500/10 opacity-70" 
                    : "bg-primary-foreground/[0.03] border-primary-foreground/[0.06] hover:border-gold/20 hover:bg-primary-foreground/[0.05]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-heading text-lg font-bold truncate ${isPaga ? "text-primary-foreground/70" : "text-primary-foreground"}`}>
                        {divida.cliente_nome}
                      </h3>
                      {isPaga ? (
                        <span className="px-2 py-0.5 rounded-md bg-green-500/15 text-green-400 font-body text-[9px] font-bold uppercase tracking-widest">
                          Paga
                        </span>
                      ) : divida.status === 'parcial' ? (
                        <span className="px-2 py-0.5 rounded-md bg-gold/15 text-gold font-body text-[9px] font-bold uppercase tracking-widest">
                          Parcial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose/15 text-rose font-body text-[9px] font-bold uppercase tracking-widest">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="font-body text-sm text-primary-foreground/60">{divida.descricao}</p>
                    <p className="font-body text-[11px] text-primary-foreground/40 mt-1">
                      Registrado em {formatDateShort(divida.data_criacao)}
                    </p>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 shrink-0">
                    <div className="text-left sm:text-right">
                      {isPaga ? (
                        <>
                          <p className="font-heading text-lg font-bold text-green-400">{formatCurrency(divida.valor_pago)}</p>
                          <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-widest">Quitado</p>
                        </>
                      ) : (
                        <>
                          <p className="font-heading text-xl font-bold text-rose">{formatCurrency(restante)}</p>
                          <p className="font-body text-[10px] text-primary-foreground/50 uppercase tracking-widest flex items-center gap-1">
                            De {formatCurrency(divida.valor_total)}
                          </p>
                        </>
                      )}
                    </div>
                    
                    {!isPaga && (
                      <button
                        onClick={() => {
                          setSelectedDivida(divida);
                          setValorBaixa(restante.toFixed(2));
                          setIsBaixaOpen(true);
                        }}
                        className="px-4 py-2 mt-1 sm:mt-2 rounded-xl bg-gold text-charcoal font-heading text-sm font-bold shadow-[0_0_15px_hsl(40_70%_60%/0.3)] hover:scale-105 hover:bg-gold/90 transition-all flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" /> Dar Baixa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: NOVA DÍVIDA */}
      <Dialog open={isNovaDividaOpen} onOpenChange={setIsNovaDividaOpen}>
        <DialogContent className="max-w-md bg-charcoal border-gold/20 p-6 [&>button]:text-primary-foreground/60 [&>button]:hover:text-primary-foreground">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-heading text-xl font-bold text-primary-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-gold" /> Registrar Dívida
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-body text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Cliente (Cadastrado)</label>
              <select
                value={newClienteId}
                onChange={(e) => {
                  setNewClienteId(e.target.value);
                  if (e.target.value) setNewClienteNome(""); // Clear manual name if selected
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground font-body focus:outline-none focus:border-gold/40 transition-colors"
              >
                <option value="" className="bg-charcoal text-primary-foreground/50">Selecione um cliente (opcional)</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} className="bg-charcoal">
                    {p.nome || 'Cliente Sem Nome'} {p.telefone ? `(${p.telefone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!newClienteId && (
              <div className="space-y-1.5">
                <label className="font-body text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Ou Nome do Cliente Manual</label>
                <input
                  type="text"
                  placeholder="Ex: Maria José"
                  value={newClienteNome}
                  onChange={(e) => setNewClienteNome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground placeholder:text-primary-foreground/30 font-body focus:outline-none focus:border-gold/40 transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-body text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Descrição / Motivo</label>
              <input
                type="text"
                placeholder="Ex: Ficou devendo o procedimento X..."
                value={newDescricao}
                onChange={(e) => setNewDescricao(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground placeholder:text-primary-foreground/30 font-body focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-body text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Valor da Dívida (R$)</label>
              <input
                type="text"
                placeholder="0,00"
                value={newValorTotal}
                onChange={(e) => setNewValorTotal(e.target.value.replace(/[^0-9.,]/g, ''))}
                className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground placeholder:text-primary-foreground/30 font-heading text-lg focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleCreateDivida}
                className="w-full py-3 rounded-xl bg-gold text-charcoal font-heading font-bold uppercase tracking-widest shadow-[0_0_15px_hsl(40_70%_60%/0.3)] hover:bg-gold/90 transition-all"
              >
                Salvar Dívida
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: DAR BAIXA */}
      <Dialog open={isBaixaOpen} onOpenChange={setIsBaixaOpen}>
        <DialogContent className="max-w-sm bg-charcoal border-gold/20 p-6 [&>button]:text-primary-foreground/60 [&>button]:hover:text-primary-foreground">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-heading text-xl font-bold text-primary-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gold" /> Receber Pagamento
            </DialogTitle>
          </DialogHeader>

          {selectedDivida && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06] text-center">
                <p className="font-body text-sm text-primary-foreground/60 mb-1">Valor restante da dívida</p>
                <p className="font-heading text-2xl font-bold text-rose">
                  {formatCurrency(selectedDivida.valor_total - selectedDivida.valor_pago)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-body text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Valor Sendo Pago Agora (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={valorBaixa}
                  onChange={(e) => setValorBaixa(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full px-3 py-3 rounded-xl bg-primary-foreground/[0.05] border border-gold/30 text-primary-foreground text-center font-heading text-2xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                  autoFocus
                />
                <p className="font-body text-[10px] text-primary-foreground/40 text-center mt-2">
                  Esse valor será adicionado no Caixa de hoje como receita recebida.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setIsBaixaOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground font-heading font-bold uppercase tracking-widest hover:bg-primary-foreground/[0.1] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDarBaixa}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-charcoal font-heading font-bold uppercase tracking-widest shadow-[0_0_15px_hsl(142_70%_50%/0.3)] hover:bg-green-400 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DividasTab;
