import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Search, Plus, Minus, User, Calendar, DollarSign, Wallet } from "lucide-react";

interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  imagens: string[];
  ativo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtosDisponiveis: Produto[];
  onSuccess: () => void;
}

export default function NovaVendaModal({ open, onOpenChange, produtosDisponiveis, onSuccess }: Props) {
  const [step, setStep] = useState<"produtos" | "pagamento">("produtos");
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ produto: Produto; qtd: number }[]>([]);
  
  // Pagamento form
  const [clienteNome, setClienteNome] = useState("");
  const [clientesSugeridos, setClientesSugeridos] = useState<{ id: string; nome: string }[]>([]);
  const [valorSugerido, setValorSugerido] = useState(0);
  const [valorFinal, setValorFinal] = useState("");
  const [pago, setPago] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [data, setData] = useState(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("produtos");
      setSearch("");
      setSelectedItems([]);
      setClienteNome("");
      setPago(true);
      setFormaPagamento("pix");
      setData(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
      setSaving(false);
      fetchClientes();
    }
  }, [open]);

  useEffect(() => {
    const total = selectedItems.reduce((acc, item) => acc + item.produto.preco * item.qtd, 0);
    setValorSugerido(total);
    setValorFinal(total.toFixed(2));
  }, [selectedItems]);

  const fetchClientes = async () => {
    const { data } = await supabase.from("profiles").select("id, nome").order("nome");
    if (data) {
      setClientesSugeridos(data);
    }
  };

  const activeProducts = useMemo(() => {
    return produtosDisponiveis.filter((p) => p.ativo && p.estoque > 0);
  }, [produtosDisponiveis]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return activeProducts;
    const lower = search.toLowerCase();
    return activeProducts.filter((p) => p.nome.toLowerCase().includes(lower));
  }, [activeProducts, search]);

  const handleToggleProduct = (produto: Produto) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.produto.id === produto.id);
      if (exists) {
        return prev.filter((i) => i.produto.id !== produto.id);
      } else {
        return [...prev, { produto, qtd: 1 }];
      }
    });
  };

  const handleUpdateQtd = (produtoId: string, delta: number) => {
    setSelectedItems((prev) => {
      return prev.map((item) => {
        if (item.produto.id === produtoId) {
          const newQtd = Math.max(1, Math.min(item.produto.estoque, item.qtd + delta));
          return { ...item, qtd: newQtd };
        }
        return item;
      });
    });
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const handleAvancar = () => {
    if (selectedItems.length === 0) {
      return toast.error("Selecione pelo menos um produto para vender.");
    }
    setStep("pagamento");
  };

  const handleSave = async () => {
    if (!clienteNome.trim()) return toast.error("Informe o nome do cliente");
    const valNum = parseFloat(valorFinal.replace(/,/g, "."));
    if (isNaN(valNum) || valNum <= 0) return toast.error("Informe um valor válido");

    setSaving(true);
    try {
      // 1. Inserir no Agendamento (Caixa)
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null; // Usuário logado
      const now = new Date();
      const horario = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const variacaoText = selectedItems.map(i => `${i.qtd}x ${i.produto.nome}`).join(", ");

      const payload = {
        user_id: userId, 
        cliente_nome: clienteNome.trim(),
        servico: "Venda de Produtos",
        variacao: variacaoText,
        valor: valNum,
        valor_pago: pago ? valNum : 0,
        data_agendamento: data,
        horario: horario,
        status: "concluido",
        forma_pagamento: formaPagamento,
        observacao: "", // Conta para comissão
        duracao_minutos: 0,
        origem: "manual",
      };

      const { error: errorAgendamento } = await supabase.from("agendamentos").insert([payload]);
      if (errorAgendamento) throw errorAgendamento;

      // 2. Abater Estoque
      for (const item of selectedItems) {
        const estoqueAtual = Number(item.produto.estoque) || 0;
        const novoEstoque = Math.max(0, estoqueAtual - item.qtd);
        const { error: errorEstoque } = await supabase
          .from("produtos")
          .update({ estoque: novoEstoque })
          .eq("id", item.produto.id);
        if (errorEstoque) throw errorEstoque;
      }

      toast.success("Venda registrada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao registrar venda: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] w-[calc(100vw-2rem)] p-0 border-primary-foreground/[0.08] overflow-hidden rounded-2xl bg-[#0a0a0a]">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-12 w-48 h-48 rounded-full blur-3xl bg-gold/15" />
          
          <DialogHeader className="relative px-4 pt-4 pb-2 border-b border-primary-foreground/[0.06]">
            <DialogTitle className="font-heading text-[16px] font-bold text-primary-foreground">
              Nova Venda
            </DialogTitle>
          </DialogHeader>
        </div>

        {step === "produtos" ? (
          <div className="flex flex-col max-h-[70vh]">
            <div className="p-4 border-b border-primary-foreground/[0.06]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/50" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-2 pl-9 pr-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-[12px] text-primary-foreground/50 py-4">Nenhum produto em estoque encontrado.</p>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedItems.find((i) => i.produto.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-gold/5 border-gold/30"
                          : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06]"
                      }`}
                    >
                      <div
                        className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
                        onClick={() => handleToggleProduct(p)}
                      >
                        <div className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ${isSelected ? "border-gold bg-gold text-[#0a0a0a]" : "border-primary-foreground/30"}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-body text-[13px] font-semibold text-primary-foreground truncate">{p.nome}</p>
                          <p className="font-body text-[11px] text-primary-foreground/60">{formatCurrency(p.preco)} • {p.estoque} em estoque</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => handleUpdateQtd(p.id, -1)}
                            className="w-7 h-7 rounded-lg bg-primary-foreground/[0.05] flex items-center justify-center hover:bg-primary-foreground/[0.1] transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-body text-[13px] font-semibold w-4 text-center">{isSelected.qtd}</span>
                          <button
                            onClick={() => handleUpdateQtd(p.id, 1)}
                            disabled={isSelected.qtd >= p.estoque}
                            className="w-7 h-7 rounded-lg bg-primary-foreground/[0.05] flex items-center justify-center hover:bg-primary-foreground/[0.1] transition-all disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-primary-foreground/[0.06] bg-primary-foreground/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-[12px] text-primary-foreground/70">Total Parcial:</span>
                <span className="font-heading text-lg font-bold text-gold">{formatCurrency(valorSugerido)}</span>
              </div>
              <button
                onClick={handleAvancar}
                className="w-full py-2.5 rounded-xl font-body text-[12px] font-bold uppercase tracking-wider transition-all bg-gold text-[#0a0a0a] hover:bg-gold/90 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                Avançar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
            <div className="space-y-1">
              <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Cliente</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/50" />
                <input
                  type="text"
                  list="clientes-list"
                  placeholder="Nome do cliente"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-2 pl-8 pr-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/30"
                />
                <datalist id="clientes-list">
                  {clientesSugeridos.map(c => <option key={c.id} value={c.nome} />)}
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Data da Venda</label>
              <div className="relative">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full appearance-none block max-w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-2 px-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/30 [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Valor Total (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold" />
                <input
                  type="text"
                  value={valorFinal}
                  onChange={(e) => setValorFinal(e.target.value.replace(/[^0-9.,]/g, ""))}
                  className="w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-2 pl-8 pr-3 text-primary-foreground font-heading text-[15px] font-bold focus:outline-none focus:border-gold/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Status do Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPago(true)}
                  className={`py-2 rounded-xl text-[12px] font-semibold transition-all border ${
                    pago
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06] text-primary-foreground/60 hover:text-primary-foreground/90"
                  }`}
                >
                  Pago
                </button>
                <button
                  onClick={() => setPago(false)}
                  className={`py-2 rounded-xl text-[12px] font-semibold transition-all border ${
                    !pago
                      ? "bg-rose/10 border-rose/30 text-rose"
                      : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06] text-primary-foreground/60 hover:text-primary-foreground/90"
                  }`}
                >
                  Pendente
                </button>
              </div>
            </div>

            {pago && (
              <div className="space-y-1 pt-2 border-t border-primary-foreground/[0.06]">
                <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "pix", label: "PIX" },
                    { id: "cartao", label: "Cartão" },
                    { id: "dinheiro", label: "Dinheiro" },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormaPagamento(f.id)}
                      className={`py-1.5 px-2 text-[11px] font-body rounded-xl border transition-all ${
                        formaPagamento === f.id
                          ? "bg-gold/10 border-gold/30 text-gold font-semibold"
                          : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06] text-primary-foreground/70"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => setStep("produtos")}
                className="flex-1 py-2.5 rounded-xl border border-primary-foreground/[0.1] hover:bg-primary-foreground/[0.05] text-[12px] font-bold font-body uppercase tracking-wider transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-[2] py-2.5 rounded-xl font-body text-[12px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  saving ? "opacity-50 bg-gold/50 cursor-not-allowed" : "bg-gold text-[#0a0a0a] hover:bg-gold/90 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                }`}
              >
                {saving ? "Registrando..." : "Confirmar Venda"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
