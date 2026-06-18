import { parseCurrencyStr } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, DollarSign, Calendar, FileText, Check, Settings, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialTab?: "entrada" | "saida";
}

const CATEGORIAS_SAIDA = [
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Materiais/Insumos",
  "Marketing/Anúncios",
  "Equipamentos",
  "Manutenção",
  "Limpeza",
  "Pessoal/Pró-labore",
  "Impostos/Taxas",
  "Outros",
];

const FORMAS_PAGAMENTO = [
  { id: "pix", label: "PIX" },
  { id: "cartao", label: "Cartão (Crédito/Débito)" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "boleto", label: "Boleto" },
];

export default function NovaTransacaoModal({ open, onOpenChange, onSuccess, initialTab = "entrada" }: Props) {
  const [tab, setTab] = useState<"entrada" | "saida">(initialTab);
  const [saving, setSaving] = useState(false);

  // Common
  const [data, setData] = useState(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  // Entrada specific
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [contabilizarComissao, setContabilizarComissao] = useState(false);

  // Saída specific
  const [categoria, setCategoria] = useState("Materiais/Insumos");

  useEffect(() => {
    if (open) {
      // Reset form
      setTab(initialTab);
      setData(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
      setValor("");
      setDescricao("");
      setFormaPagamento("pix");
      setContabilizarComissao(false);
      setCategoria("Materiais/Insumos");
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!descricao.trim()) return toast.error("Informe uma descrição");
    const valNum = parseCurrencyStr(valor);
    if (isNaN(valNum) || valNum <= 0) return toast.error("Informe um valor válido");

    setSaving(true);

    try {
      if (tab === "entrada") {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id || null;

        const now = new Date();
        const horario = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        const payload = {
          user_id: userId,
          cliente_nome: "Registro de Pagamento",
          servico: "Entrada Manual",
          variacao: descricao.trim(),
          valor: valNum,
          valor_pago: valNum,
          data_agendamento: data,
          horario: horario,
          status: "concluido",
          forma_pagamento: formaPagamento,
          observacao: contabilizarComissao ? "" : "SEM_COMISSAO",
          duracao_minutos: 0,
          origem: "manual",
        };

        const { error } = await supabase.from("agendamentos").insert([payload]);
        if (error) throw error;
        toast.success("Entrada registrada com sucesso!");

      } else {
        // Saída — despesa do estúdio, não precisa de user_id
        const payload = {
          descricao: "Registro de Gasto",
          observacao: descricao.trim(),
          valor: valNum,
          categoria: categoria,
          data_vencimento: data,
          pago: true,
          data_pagamento: data,
          tipo: "estudio",
        };

        const { error } = await supabase.from("despesas").insert([payload]);
        if (error) throw error;
        toast.success("Saída registrada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar transação: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] w-[calc(100vw-2rem)] p-0 border-primary-foreground/[0.08] overflow-hidden rounded-2xl bg-[#0a0a0a]">
        <div className="relative overflow-hidden">
          <div className={`pointer-events-none absolute -top-24 -right-12 w-48 h-48 rounded-full blur-3xl ${tab === "entrada" ? "bg-green-500/15" : "bg-red-500/15"}`} />
          
          <DialogHeader className="relative px-4 pt-4 pb-2 border-b border-primary-foreground/[0.06]">
            <DialogTitle className="font-heading text-[16px] font-bold text-primary-foreground">
              Nova Transação
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="flex p-1 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
            <button
              onClick={() => setTab("entrada")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-body text-[12px] font-semibold transition-all ${
                tab === "entrada" ? "bg-green-500/15 text-green-400 border border-green-500/30 shadow-sm" : "text-primary-foreground/60 hover:text-primary-foreground"
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" /> Entrada
            </button>
            <button
              onClick={() => setTab("saida")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-body text-[12px] font-semibold transition-all ${
                tab === "saida" ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm" : "text-primary-foreground/60 hover:text-primary-foreground"
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" /> Saída (Gasto)
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-4 space-y-3 max-h-[65vh] overflow-y-auto scrollbar-thin">
          <div className="space-y-1">
            <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Valor (R$)</label>
            <div className="relative">
              <DollarSign className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${tab === "entrada" ? "text-green-400" : "text-red-400"}`} />
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-2 pl-8 pr-3 text-primary-foreground font-heading text-[15px] focus:outline-none focus:border-gold/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">
              {tab === "entrada" ? "Título / Origem" : "Descrição do Gasto"}
            </label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/50" />
              <input
                type="text"
                placeholder={tab === "entrada" ? "Ex: Venda de Produto" : "Ex: Compra de materiais"}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-1.5 pl-8 pr-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Data</label>
            <div className="relative">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full appearance-none block max-w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-1.5 px-2.5 text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/30 [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
              />
            </div>
          </div>

          {tab === "entrada" && (
            <>
              <div className="space-y-1">
                <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FORMAS_PAGAMENTO.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormaPagamento(f.id)}
                      className={`py-1.5 px-2 text-[11px] font-body rounded-xl border transition-all ${
                        formaPagamento === f.id
                          ? "bg-green-500/10 border-green-500/30 text-green-400 font-semibold"
                          : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06] text-primary-foreground/70"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/[0.05] border border-purple-500/15 flex items-center justify-between gap-3 mt-1">
                <div>
                  <p className="font-body text-[12px] font-medium text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Contabilizar Comissão
                  </p>
                  <p className="font-body text-[9px] text-purple-300/60 leading-tight mt-0.5">
                    Ative se esse valor deve somar na sua comissão.
                  </p>
                </div>
                <Switch checked={contabilizarComissao} onCheckedChange={setContabilizarComissao} className="scale-75 origin-right" />
              </div>
            </>
          )}

          {tab === "saida" && (
            <>
              <div className="space-y-1">
                <label className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-wider">Categoria</label>
                <input
                  type="text"
                  list="categorias-saida-list"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Selecione ou digite"
                  className="w-full bg-primary-foreground/[0.03] border border-primary-foreground/[0.08] rounded-xl py-1.5 px-2.5 text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/30"
                />
                <datalist id="categorias-saida-list">
                  {CATEGORIAS_SAIDA.map(c => <option key={c} value={c}>{c}</option>)}
                </datalist>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-primary-foreground/[0.06] bg-primary-foreground/[0.02]">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-2.5 rounded-xl font-body text-[12px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              saving ? "opacity-50 cursor-not-allowed bg-primary-foreground/10 text-primary-foreground/50" 
                     : tab === "entrada" 
                        ? "bg-green-500 text-green-950 hover:bg-green-400 shadow-[0_0_10px_rgb(34_197_94_/_0.15)]" 
                        : "bg-red-500 text-red-950 hover:bg-red-400 shadow-[0_0_10px_rgb(239_68_68_/_0.15)]"
            }`}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> {tab === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
