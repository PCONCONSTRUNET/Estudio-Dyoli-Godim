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
  
  const SUPABASE_URL = "https://vlepenxinekoljxecomr.supabase.co";
  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MjQ0OSwiZXhwIjoyMDkwNjM4NDQ5fQ.n-vDPXUpnGZOEBpZJpzQ5TYEQSQwbWWPwAk3ShhYWnM";

  // Pagamento form
  const [manualCliente, setManualCliente] = useState("");
  const [manualClienteSearch, setManualClienteSearch] = useState("");
  const [manualClienteOpen, setManualClienteOpen] = useState(false);
  const [manualClienteNome, setManualClienteNome] = useState("");
  const [manualClienteTelefone, setManualClienteTelefone] = useState("");
  
  const [clientesSugeridos, setClientesSugeridos] = useState<{ id: string; nome: string; telefone?: string }[]>([]);
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
      setManualCliente("");
      setManualClienteSearch("");
      setManualClienteOpen(false);
      setManualClienteNome("");
      setManualClienteTelefone("");
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

  const adminFetch = async (path: string, method: string, body?: object) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || res.statusText);
    }
    return res.json().catch(() => null);
  };

  const fetchClientes = async () => {
    // Busca da tabela clientes (sem auth)
    const { data: fromClientes } = await supabase
      .from("clientes")
      .select("id, nome, telefone")
      .order("nome");

    // Busca de profiles (clientes com conta)
    const { data: fromProfiles } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");

    const map = new Map<string, { id: string; nome: string; telefone?: string }>();
    (fromClientes || []).forEach(c => map.set(c.nome.trim().toLowerCase(), { id: c.id, nome: c.nome.trim(), telefone: c.telefone }));
    (fromProfiles || []).forEach(p => { if (!map.has(p.nome.trim().toLowerCase())) map.set(p.nome.trim().toLowerCase(), { id: p.id, nome: p.nome.trim() }); });

    setClientesSugeridos([...map.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
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
    const nomeCliente = manualCliente 
      ? clientesSugeridos.find(c => c.id === manualCliente)?.nome || "" 
      : manualClienteNome.trim();
      
    if (!nomeCliente) return toast.error("Informe o nome do cliente");
    const valNum = parseFloat(valorFinal.replace(/,/g, "."));
    if (isNaN(valNum) || valNum <= 0) return toast.error("Informe um valor válido");

    setSaving(true);
    try {
      const telCliente = manualCliente 
        ? clientesSugeridos.find(c => c.id === manualCliente)?.telefone || "" 
        : manualClienteTelefone.trim();

      let clienteId = manualCliente || null;

      // Se for cliente novo, auto-registra
      if (!clienteId) {
        const novoCliente = await adminFetch("clientes", "POST", {
          nome: nomeCliente,
          telefone: telCliente,
        });
        clienteId = novoCliente?.[0]?.id || null;
        if (clienteId) {
          setClientesSugeridos(prev => [...prev, { id: clienteId!, nome: nomeCliente, telefone: telCliente }]);
        }
      }

      // 2. Registrar venda na tabela vendas
      const itens = selectedItems.map(i => ({
        produto_id: i.produto.id,
        nome: i.produto.nome,
        preco_unitario: i.produto.preco,
        qtd: i.qtd,
        subtotal: i.produto.preco * i.qtd,
      }));

      await adminFetch("vendas", "POST", {
        cliente_id: clienteId,
        cliente_nome: nomeCliente,
        telefone: telCliente,
        itens,
        valor_total: valNum,
        valor_pago: pago ? valNum : 0,
        forma_pagamento: formaPagamento,
        pago,
        data_venda: data,
      });

      // 3. Abater Estoque
      for (const item of selectedItems) {
        const estoqueAtual = Number(item.produto.estoque) || 0;
        const novoEstoque = Math.max(0, estoqueAtual - item.qtd);
        await adminFetch(`produtos?id=eq.${item.produto.id}`, "PATCH", { estoque: novoEstoque });
      }

      toast.success(manualCliente ? "Venda registrada com sucesso!" : `Venda registrada! ${nomeCliente} cadastrado(a) como novo cliente. ✓`);
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
                        <div className="flex items-center gap-1.5 ml-3">
                          <button
                            onClick={() => handleUpdateQtd(p.id, -1)}
                            className="w-7 h-7 rounded-lg bg-rose/20 border border-rose/40 flex items-center justify-center hover:bg-rose/30 transition-all text-rose"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-body text-[14px] font-bold w-5 text-center text-primary-foreground">{isSelected.qtd}</span>
                          <button
                            onClick={() => handleUpdateQtd(p.id, 1)}
                            disabled={isSelected.qtd >= p.estoque}
                            className="w-7 h-7 rounded-lg bg-gold/20 border border-gold/40 flex items-center justify-center hover:bg-gold/30 transition-all text-gold disabled:opacity-40"
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
                className="w-full py-3 rounded-xl font-body text-[13px] font-bold uppercase tracking-wider transition-all bg-gold text-[#0a0a0a] hover:bg-gold/90 shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-[0.98]"
              >
                Avançar →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
            <div className="relative space-y-2.5">
              <label className="font-body text-[11px] uppercase tracking-[0.2em] text-gold font-bold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)] px-1 block flex items-center gap-1.5">
                Cliente <span className="text-red-400">*</span>
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 group-focus-within:scale-110 group-focus-within:rotate-3 z-10">
                  <Search className="h-5 w-5 text-white stroke-[2.5px] drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
                </div>
                <input
                  type="text"
                  placeholder={manualCliente ? clientesSugeridos.find(c => c.id === manualCliente)?.nome || "Cliente selecionado" : "Buscar cliente..."}
                  value={manualClienteSearch}
                  onFocus={() => setManualClienteOpen(true)}
                  onChange={(e) => { setManualClienteSearch(e.target.value); setManualClienteOpen(true); }}
                  className={`w-full pl-12 pr-10 py-3.5 rounded-2xl border font-body text-[14px] focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 placeholder:text-primary-foreground/30 backdrop-blur-sm transition-all shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)] hover:bg-white/[0.06] ${
                    manualCliente ? "border-gold/60 text-gold font-medium bg-gold/[0.08]" : "border-gold/40 text-primary-foreground bg-white/[0.08]"
                  }`}
                />
                {manualCliente && (
                  <button
                    onClick={() => { setManualCliente(""); setManualClienteSearch(""); setManualClienteNome(""); setManualClienteTelefone(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-rose/10 hover:bg-rose/20 text-rose flex items-center justify-center transition-colors z-10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {manualClienteOpen && (
                <div className="absolute z-50 mt-1 left-0 right-0 rounded-2xl border border-gold/20 bg-charcoal/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <div className="max-h-52 overflow-y-auto">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setManualCliente(""); setManualClienteNome(""); setManualClienteTelefone(""); setManualClienteSearch(""); setManualClienteOpen(false); }}
                      className={`w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:bg-white/[0.04] ${
                        !manualCliente ? "bg-white/[0.04] text-primary-foreground/70" : "text-primary-foreground/40"
                      }`}
                    >
                      Sem cliente (cadastrar novo)
                    </button>
                    {clientesSugeridos
                      .filter(c => c.nome.toLowerCase().includes(manualClienteSearch.toLowerCase()) || (c.telefone && c.telefone.includes(manualClienteSearch)))
                      .length === 0 && manualClienteSearch ? (
                      <p className="px-4 py-3 font-body text-[12px] text-primary-foreground/30 text-center">Nenhum cliente encontrado</p>
                    ) : (
                      clientesSugeridos
                        .filter(c => c.nome.toLowerCase().includes(manualClienteSearch.toLowerCase()) || (c.telefone && c.telefone.includes(manualClienteSearch)))
                        .map(c => (
                          <button
                            key={c.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setManualCliente(c.id);
                              setManualClienteNome(c.nome);
                              setManualClienteSearch("");
                              setManualClienteOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:bg-gold/10 flex items-center justify-between gap-3 ${
                              manualCliente === c.id ? "bg-gold/10 text-gold" : "text-primary-foreground"
                            }`}
                          >
                            <span className="font-medium truncate">{c.nome}</span>
                            {c.telefone && <span className="text-[11px] text-primary-foreground/40 tabular-nums">{c.telefone}</span>}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
              {manualClienteOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setManualClienteOpen(false)} />
              )}
            </div>

            {!manualCliente && (
              <div className="space-y-4 mt-4 p-4 rounded-2xl border border-gold/30 bg-gold/[0.03] shadow-[inset_0_0_20px_rgba(212,175,55,0.05)] relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/40 via-white to-white/40 shadow-[0_0_12px_rgba(255,255,255,0.8)]"></div>
                <div className="space-y-2.5 z-10 relative">
                  <label className="font-body text-[11px] uppercase tracking-[0.2em] text-gold font-bold px-1 block flex items-center gap-1.5">
                    Nome do cliente (presencial) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maria Silva"
                    value={manualClienteNome}
                    onChange={(e) => setManualClienteNome(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.08] border border-gold/40 text-primary-foreground font-body text-[14px] focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/40 placeholder:text-primary-foreground/50 backdrop-blur-sm transition-all shadow-[0_2px_12px_-4px_rgba(0,0,0,0.5)]"
                  />
                </div>
                <div className="space-y-2.5 z-10 relative">
                  <label className="font-body text-[11px] uppercase tracking-[0.2em] text-gold font-bold px-1 block flex items-center gap-1.5">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: 51999999999"
                    value={manualClienteTelefone}
                    onChange={(e) => setManualClienteTelefone(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.08] border border-gold/40 text-primary-foreground font-body text-[14px] focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/40 placeholder:text-primary-foreground/50 backdrop-blur-sm transition-all shadow-[0_2px_12px_-4px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
            )}

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
                className="flex-1 py-2.5 rounded-xl border border-primary-foreground/20 hover:bg-primary-foreground/[0.08] text-primary-foreground/80 text-[12px] font-bold font-body uppercase tracking-wider transition-all"
              >
                ← Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-[2] py-2.5 rounded-xl font-body text-[13px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  saving ? "opacity-50 bg-gold/50 cursor-not-allowed" : "bg-gold text-[#0a0a0a] hover:bg-gold/90 shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-[0.98]"
                }`}
              >
                {saving ? "Registrando..." : "✓ Confirmar Venda"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
