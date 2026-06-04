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
 CreditCard,
 Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/contexts/ConfirmContext";

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
 whatsapp: string | null;
}

const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const formatDateShort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const DividasTab = () => {
 const { confirm } = useConfirm();
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
 const [newDataCriacao, setNewDataCriacao] = useState(() => new Date().toISOString().split('T')[0]);

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
 supabase.from("profiles").select("id, nome, whatsapp")
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
 status: "pendente",
 data_criacao: newDataCriacao
 }).select().single();

 if (error) throw error;

 toast.success("Dívida registrada com sucesso!");
 setDividas([data, ...dividas]);
 setIsNovaDividaOpen(false);
 setNewClienteId("");
 setNewClienteNome("");
 setNewDescricao("");
 setNewValorTotal("");
 setNewDataCriacao(new Date().toISOString().split('T')[0]);
 } catch (error: any) {
 console.error(error);
 toast.error(error.message || "Erro ao criar dívida.");
 }
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
 observacao: `divida_id:${selectedDivida.id} | Baixa de dívida no valor de ${formatCurrency(valorPagar)}`
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

 const handleDeleteDivida = (id: string, descricao: string) => {
 confirm({
 title: "Excluir Dívida",
 description: "Tem certeza que deseja excluir esta dívida? O histórico de pagamentos vinculado também será apagado.",
 variant: "destructive",
 onConfirm: async () => {
 try {
 // 1. Buscar todos os agendamentos vinculados a esta dívida (pelo divida_id na observacao)
 const { data: agsVinculados } = await supabase
 .from("agendamentos")
 .select("id, observacao")
 .like("observacao", `divida_id:${id}%`);

 // 2. Também buscar pela chave antiga (sem divida_id) para compatibilidade
 const { data: agsAntigos } = await supabase
 .from("agendamentos")
 .select("id")
 .eq("servico", `Pagamento de Dívida - ${descricao}`)
 .ilike("observacao", "%Baixa de dívida%");

 const idsParaExcluir = [
 ...(agsVinculados?.map(a => a.id) || []),
 ...(agsAntigos?.map(a => a.id) || [])
 ].filter((v, i, arr) => arr.indexOf(v) === i); // deduplicar

 if (idsParaExcluir.length > 0) {
 await supabase.from("agendamentos").delete().in("id", idsParaExcluir);
 }

 // 3. Excluir a dívida em si
 const { error } = await supabase.from("dividas").delete().eq("id", id);
 if (error) throw error;

 toast.success("Dívida e pagamentos vinculados excluídos com sucesso.");
 setDividas(dividas.filter(d => d.id !== id));
 } catch (error: any) {
 console.error(error);
 toast.error(error.message || "Erro ao excluir dívida.");
 }
 }
 });
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
 <p className="font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em] flex items-center gap-1.5">
 <AlertCircle className="w-3.5 h-3.5 text-rose" /> Total a Receber
 </p>
 <p className="font-heading text-3xl font-bold text-rose mt-2 tabular-nums">
 {formatCurrency(totalDevendo)}
 </p>
 </div>

 <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-green-500/[0.1] via-primary-foreground/[0.02] to-transparent border border-green-500/20">
 <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-green-500/10 blur-3xl" />
 <p className="font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em] flex items-center gap-1.5">
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
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/75" />
 <input
 type="text"
 placeholder="Buscar por cliente ou descrição..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] text-primary-foreground placeholder:text-primary-foreground/95 font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
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
 <p className="text-center py-10 text-primary-foreground/75 font-body text-sm">Carregando dívidas...</p>
 ) : filteredDividas.length === 0 ? (
 <div className="text-center py-12 rounded-2xl border border-dashed border-primary-foreground/[0.08] bg-primary-foreground/[0.01]">
 <BadgeDollarSign className="w-8 h-8 text-primary-foreground/85 mx-auto mb-3" />
 <p className="text-primary-foreground/75 font-body text-sm">Nenhuma dívida encontrada.</p>
 </div>
 ) : (
 filteredDividas.map(divida => {
 const restante = divida.valor_total - divida.valor_pago;
 const isPaga = divida.status === 'paga';

 return (
 <div 
 key={divida.id}
 onClick={() => {
 if (!isPaga) {
 setSelectedDivida(divida);
 setValorBaixa(restante.toFixed(2).replace('.', ','));
 setIsBaixaOpen(true);
 }
 }}
 className={`p-4 rounded-2xl border transition-all ${
 isPaga 
 ? "bg-green-500/[0.02] border-green-500/10 opacity-70" 
 : "bg-primary-foreground/[0.03] border-primary-foreground/[0.06] hover:border-gold/20 hover:bg-primary-foreground/[0.05] cursor-pointer"
 }`}
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1 relative pr-8">
 <h3 className={`font-heading text-lg font-bold truncate ${isPaga ? "text-primary-foreground/100" : "text-primary-foreground"}`}>
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
 
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteDivida(divida.id, divida.descricao);
 }}
 className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-primary-foreground/85 hover:bg-rose/10 hover:text-rose transition-colors"
 title="Excluir Dívida"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 <p className="font-body text-sm text-primary-foreground/95">{divida.descricao}</p>
 <p className="font-body text-[11px] text-primary-foreground/75 mt-1">
 Registrado em {formatDateShort(divida.data_criacao)}
 </p>
 </div>
 
 <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 shrink-0">
 <div className="text-left sm:text-right">
 {isPaga ? (
 <>
 <p className="font-heading text-lg font-bold text-green-400">{formatCurrency(divida.valor_pago)}</p>
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-widest">Quitado</p>
 </>
 ) : (
 <>
 <p className="font-heading text-xl font-bold text-rose">{formatCurrency(restante)}</p>
 <p className="font-body text-[10px] text-primary-foreground/85 uppercase tracking-widest flex items-center gap-1">
 De {formatCurrency(divida.valor_total)}
 </p>
 </>
 )}
 </div>
 
 {!isPaga && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedDivida(divida);
 setValorBaixa(restante.toFixed(2).replace('.', ','));
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
 <DialogContent className="max-w-md border-gold/20 p-6 [&>button]:text-primary-foreground/95 [&>button]:hover:text-primary-foreground">
 <DialogHeader className="mb-4">
 <DialogTitle className="font-heading text-xl font-bold text-primary-foreground flex items-center gap-2">
 <Plus className="w-5 h-5 text-gold" /> Registrar Dívida
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <label className="font-body text-xs font-semibold text-primary-foreground/100 uppercase tracking-wider">Cliente (Cadastrado)</label>
 <select
 value={newClienteId}
 onChange={(e) => {
 setNewClienteId(e.target.value);
 if (e.target.value) setNewClienteNome(""); // Clear manual name if selected
 }}
 className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground font-body focus:outline-none focus:border-gold/40 transition-colors"
 >
 <option value="" className="bg-charcoal text-primary-foreground/85">Selecione um cliente (opcional)</option>
 {profiles.map(p => (
 <option key={p.id} value={p.id} className="bg-charcoal">
 {p.nome || 'Cliente Sem Nome'} {p.whatsapp ? `(${p.whatsapp})` : ''}
 </option>
 ))}
 </select>
 </div>

 {!newClienteId && (
 <div className="space-y-1.5">
 <label className="font-body text-xs font-semibold text-primary-foreground/100 uppercase tracking-wider">Ou Nome do Cliente Manual</label>
 <input
 type="text"
 placeholder="Ex: Maria José"
 value={newClienteNome}
 onChange={(e) => setNewClienteNome(e.target.value)}
 className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground placeholder:text-primary-foreground/95 font-body focus:outline-none focus:border-gold/40 transition-colors"
 />
 </div>
 )}

 <div className="space-y-1.5">
 <label className="font-body text-xs font-semibold text-primary-foreground/100 uppercase tracking-wider">Descrição / Motivo</label>
 <input
 type="text"
 placeholder="Ex: Ficou devendo o procedimento X..."
 value={newDescricao}
 onChange={(e) => setNewDescricao(e.target.value)}
 className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground placeholder:text-primary-foreground/95 font-body focus:outline-none focus:border-gold/40 transition-colors"
 />
 </div>

 <div className="space-y-1.5">
 <label className="font-body text-xs font-semibold text-primary-foreground/100 uppercase tracking-wider">Valor da Dívida (R$)</label>
 <input
 type="text"
 placeholder="0,00"
 value={newValorTotal}
 onChange={(e) => setNewValorTotal(e.target.value.replace(/[^0-9.,]/g, ''))}
 className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground placeholder:text-primary-foreground/95 font-heading text-lg focus:outline-none focus:border-gold/40 transition-colors"
 />
 </div>

 <div className="space-y-1.5">
 <label className="font-body text-xs font-semibold text-primary-foreground/100 uppercase tracking-wider">Data da Dívida / Serviço</label>
 <input
 type="date"
 value={newDataCriacao}
 onChange={(e) => setNewDataCriacao(e.target.value)}
 className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.1] text-primary-foreground font-body focus:outline-none focus:border-gold/40 transition-colors"
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
 <DialogContent className="max-w-md border-gold/20 p-0 overflow-hidden [&>button]:text-primary-foreground/95 [&>button]:hover:text-primary-foreground">
 <div className="relative p-6 border-b border-primary-foreground/[0.06]">
 <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/10 blur-3xl" />
 <DialogHeader>
 <DialogTitle className="font-heading text-xl font-bold text-primary-foreground flex items-center gap-3">
 <span className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20 shadow-[0_0_15px_-3px_hsl(40_70%_60%/0.3)]">
 <CreditCard className="w-5 h-5 text-gold" />
 </span>
 Receber Pagamento
 </DialogTitle>
 </DialogHeader>
 </div>

 {selectedDivida && (
 <div className="p-6 pt-5 space-y-6">
 {/* Detalhes da Dívida */}
 <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-foreground/[0.04] to-primary-foreground/[0.01] border border-primary-foreground/[0.08] shadow-inner">
 <div className="flex justify-between items-start mb-4 pb-4 border-b border-primary-foreground/[0.05]">
 <div>
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
 <span className="w-1 h-1 rounded-full bg-primary-foreground/30" /> Cliente
 </p>
 <p className="font-heading text-lg font-bold text-primary-foreground/90 leading-none">
 {selectedDivida.cliente_nome}
 </p>
 </div>
 <div className="text-right">
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-widest mb-1.5 flex items-center justify-end gap-1.5">
 Data <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
 </p>
 <p className="font-body text-[12px] font-medium text-primary-foreground/100 bg-primary-foreground/[0.05] px-2 py-0.5 rounded-md border border-primary-foreground/[0.05]">
 {formatDateShort(selectedDivida.data_criacao)}
 </p>
 </div>
 </div>
 
 <div className="mb-5">
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-widest mb-1.5">Referente a</p>
 <p className="font-body text-sm text-primary-foreground/80 leading-relaxed bg-primary-foreground/[0.02] p-3 rounded-xl border border-primary-foreground/[0.04]">
 {selectedDivida.descricao}
 </p>
 </div>

 <div className="grid grid-cols-3 gap-2">
 <div className="p-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.04] text-center">
 <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-widest mb-1">Total</p>
 <p className="font-heading text-[13px] font-bold text-primary-foreground/100">{formatCurrency(selectedDivida.valor_total)}</p>
 </div>
 <div className="p-2.5 rounded-xl bg-green-500/[0.05] border border-green-500/10 text-center">
 <p className="font-body text-[9px] text-green-400/60 uppercase tracking-widest mb-1">Já Pago</p>
 <p className="font-heading text-[13px] font-bold text-green-400/80">{formatCurrency(selectedDivida.valor_pago)}</p>
 </div>
 <div className="p-2.5 rounded-xl bg-gradient-to-b from-rose/[0.08] to-rose/[0.02] border border-rose/15 text-center shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] relative overflow-hidden">
 <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose/30 to-transparent" />
 <p className="font-body text-[9px] text-rose/70 uppercase tracking-widest mb-1">Restante</p>
 <p className="font-heading text-[15px] font-bold text-rose drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">{formatCurrency(selectedDivida.valor_total - selectedDivida.valor_pago)}</p>
 </div>
 </div>
 </div>

 {/* Input de Pagamento */}
 <div className="space-y-2.5">
 <label className="font-body text-[11px] font-bold text-gold uppercase tracking-[0.15em] flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shadow-[0_0_8px_hsl(40_70%_50%)]" />
 Valor a receber agora
 </label>
 <div className="relative group">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading text-xl text-primary-foreground/95 group-focus-within:text-gold transition-colors">
 R$
 </span>
 <input
 type="text"
 placeholder="0,00"
 value={valorBaixa}
 onChange={(e) => setValorBaixa(e.target.value.replace(/[^0-9.,]/g, ''))}
 className="w-full pl-12 pr-4 py-4 rounded-2xl bg-charcoal border border-primary-foreground/[0.15] text-primary-foreground font-heading text-3xl font-bold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 focus:bg-primary-foreground/[0.02] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all"
 autoFocus
 />
 {/* Botão flutuante "TUDO" no input */}
 <button 
 type="button"
 onClick={() => setValorBaixa((selectedDivida.valor_total - selectedDivida.valor_pago).toFixed(2).replace('.', ','))}
 className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold font-body text-[10px] font-bold uppercase tracking-wider transition-all"
 >
 Restante
 </button>
 </div>
 <div className="flex items-center justify-between px-1">
 <p className="font-body text-[10px] text-primary-foreground/75 flex items-center gap-1.5">
 <span className="w-1 h-1 rounded-full bg-primary-foreground/20" />
 Valor será adicionado ao Caixa de hoje
 </p>
 </div>
 </div>

 <div className="pt-2 flex gap-3">
 <button
 onClick={() => setIsBaixaOpen(false)}
 className="flex-1 py-3.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/100 hover:text-primary-foreground font-heading text-sm font-bold uppercase tracking-widest hover:bg-primary-foreground/[0.08] transition-all border border-transparent hover:border-primary-foreground/[0.1]"
 >
 Cancelar
 </button>
 <button
 onClick={handleDarBaixa}
 className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-charcoal font-heading text-sm font-bold uppercase tracking-widest shadow-[0_0_20px_hsl(142_70%_50%/0.25)] hover:shadow-[0_0_25px_hsl(142_70%_50%/0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
 >
 Confirmar Pagamento
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
