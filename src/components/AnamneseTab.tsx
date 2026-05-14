import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Search, FileText, CheckCircle2, Circle, Download, ExternalLink, User, Phone, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Anamnese {
  id: string;
  user_id: string | null;
  cliente_nome: string;
  whatsapp: string;
  dados: Record<string, any>;
  pdf_url: string | null;
  pdf_path: string | null;
  revisada: boolean;
  revisada_at: string | null;
  observacao: string;
  origem: string;
  created_at: string;
}

const formatDate = (s: string) => {
  try {
    return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
};

const formatWhatsapp = (w: string) => {
  const d = (w || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) {
    return `+55 (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  }
  return w;
};

const AnamneseTab = () => {
  const [items, setItems] = useState<Anamnese[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todas" | "pendentes" | "revisadas">("todas");
  const [selected, setSelected] = useState<Anamnese | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("anamneses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar fichas");
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("anamneses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "anamneses" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((a) => {
      if (filter === "pendentes" && a.revisada) return false;
      if (filter === "revisadas" && !a.revisada) return false;
      if (!term) return true;
      const hay = `${a.cliente_nome} ${a.whatsapp}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, search, filter]);

  const toggleRevisada = async (a: Anamnese) => {
    const novo = !a.revisada;
    const { error } = await supabase
      .from("anamneses")
      .update({ revisada: novo, revisada_at: novo ? new Date().toISOString() : null })
      .eq("id", a.id);
    if (error) return toast.error("Erro ao atualizar");
    toast.success(novo ? "Marcada como revisada" : "Marcada como pendente");
  };

  const openPdf = async (a: Anamnese) => {
    if (a.pdf_url) {
      window.open(a.pdf_url, "_blank");
      return;
    }
    if (a.pdf_path) {
      const { data, error } = await supabase.storage
        .from("anamneses")
        .createSignedUrl(a.pdf_path, 60 * 10);
      if (error || !data) return toast.error("Erro ao gerar link do PDF");
      window.open(data.signedUrl, "_blank");
      return;
    }
    toast.error("Esta ficha não possui PDF anexado");
  };

  const totalPendentes = items.filter(i => !i.revisada).length;

  return (
    <div className="space-y-4 animate-fade-in pb-24 lg:pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-primary-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-gold" />
            Anamnese
          </h2>
          <p className="font-body text-[12px] text-primary-foreground/45 mt-0.5">
            Fichas enviadas pelo chatbot do WhatsApp
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading text-2xl font-bold text-gold tabular-nums leading-none">{totalPendentes}</p>
          <p className="font-body text-[9px] text-primary-foreground/40 uppercase tracking-wider mt-1">Pendentes</p>
        </div>
      </div>

      {/* Search + filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] text-primary-foreground text-[13px] font-body placeholder:text-primary-foreground/30 focus:border-gold/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] p-1">
          {([
            ["todas", "Todas"],
            ["pendentes", "Pendentes"],
            ["revisadas", "Revisadas"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex-1 sm:flex-initial px-3 h-9 rounded-lg font-body text-[12px] font-medium transition-all ${
                filter === k ? "bg-gold/15 text-gold" : "text-primary-foreground/55 hover:text-primary-foreground/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-8 text-center">
          <p className="font-body text-[13px] text-primary-foreground/40">Carregando fichas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-8 text-center">
          <FileText className="w-10 h-10 text-primary-foreground/15 mx-auto mb-3" />
          <p className="font-body text-[13px] text-primary-foreground/40">
            {items.length === 0 ? "Nenhuma ficha recebida ainda" : "Nenhuma ficha encontrada"}
          </p>
          {items.length === 0 && (
            <p className="font-body text-[11px] text-primary-foreground/30 mt-2">
              Configure o chatbot para enviar as fichas para esta aba.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 transition-all ${
                a.revisada
                  ? "border-primary-foreground/[0.06] bg-primary-foreground/[0.02]"
                  : "border-gold/15 bg-gold/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleRevisada(a)}
                  className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                    a.revisada
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/15"
                      : "bg-gold/15 text-gold hover:bg-gold/20"
                  }`}
                  aria-label={a.revisada ? "Marcar como pendente" : "Marcar como revisada"}
                >
                  {a.revisada ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body text-[14px] font-medium text-primary-foreground truncate flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary-foreground/40 shrink-0" />
                        {a.cliente_nome || "Sem nome"}
                      </p>
                      <p className="font-body text-[12px] text-primary-foreground/50 truncate mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 shrink-0" />
                        {formatWhatsapp(a.whatsapp) || "—"}
                      </p>
                    </div>
                    {!a.revisada && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-body font-bold bg-gold/15 text-gold border border-gold/20 uppercase tracking-wider">
                        Nova
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-primary-foreground/45">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(a.created_at)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setSelected(a)}
                      className="h-9 px-3 rounded-lg bg-primary-foreground/[0.06] hover:bg-primary-foreground/[0.10] border border-primary-foreground/[0.08] text-primary-foreground/80 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ver dados
                    </button>
                    {(a.pdf_url || a.pdf_path) && (
                      <button
                        onClick={() => openPdf(a)}
                        className="h-9 px-3 rounded-lg bg-gold/10 hover:bg-gold/15 border border-gold/20 text-gold text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-charcoal border-primary-foreground/10">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-primary-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              Ficha de Anamnese
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] p-3 space-y-1">
                <p className="font-body text-[13px] text-primary-foreground"><span className="text-primary-foreground/50">Cliente:</span> {selected.cliente_nome || "—"}</p>
                <p className="font-body text-[13px] text-primary-foreground"><span className="text-primary-foreground/50">WhatsApp:</span> {formatWhatsapp(selected.whatsapp)}</p>
                <p className="font-body text-[12px] text-primary-foreground/60"><span className="text-primary-foreground/40">Recebida em:</span> {formatDate(selected.created_at)}</p>
              </div>

              <div>
                <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-widest mb-2">Respostas</p>
                {Object.keys(selected.dados || {}).length === 0 ? (
                  <p className="font-body text-[12px] text-primary-foreground/40">Sem dados estruturados.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(selected.dados).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-primary-foreground/[0.03] border border-primary-foreground/[0.06] p-3">
                        <p className="font-body text-[10px] text-primary-foreground/45 uppercase tracking-wider">{k.replace(/_/g, " ")}</p>
                        <p className="font-body text-[13px] text-primary-foreground mt-1 whitespace-pre-wrap break-words">
                          {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selected.observacao && (
                <div>
                  <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-widest mb-1">Observação</p>
                  <p className="font-body text-[13px] text-primary-foreground/80 whitespace-pre-wrap">{selected.observacao}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {(selected.pdf_url || selected.pdf_path) && (
                  <button
                    onClick={() => openPdf(selected)}
                    className="h-10 px-4 rounded-xl bg-gold/15 hover:bg-gold/20 border border-gold/30 text-gold text-[13px] font-body font-medium flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" /> Baixar PDF
                  </button>
                )}
                <button
                  onClick={() => { toggleRevisada(selected); setSelected({ ...selected, revisada: !selected.revisada }); }}
                  className="h-10 px-4 rounded-xl bg-primary-foreground/[0.06] hover:bg-primary-foreground/[0.10] border border-primary-foreground/[0.08] text-primary-foreground text-[13px] font-body font-medium flex items-center gap-2 active:scale-95 transition-all"
                >
                  {selected.revisada ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {selected.revisada ? "Marcar como pendente" : "Marcar como revisada"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnamneseTab;
