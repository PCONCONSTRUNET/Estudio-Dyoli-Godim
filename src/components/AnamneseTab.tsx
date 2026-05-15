import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Search, FileText, CheckCircle2, XCircle, Clock, Download, ExternalLink, User, Calendar, RotateCcw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

type Status = "pendente" | "aprovada" | "negada";

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
  status: Status;
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
  const [filter, setFilter] = useState<"todas" | "pendentes" | "aprovadas" | "negadas">("todas");
  const [selected, setSelected] = useState<Anamnese | null>(null);
  const [live, setLive] = useState(false);
  const [toDelete, setToDelete] = useState<Anamnese | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
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
      .channel("anamneses-realtime-v3")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "anamneses" },
        (payload) => {
          setItems((prev) => {
            const novo = payload.new as Anamnese;
            if (prev.find((p) => p.id === novo.id)) return prev;
            toast.success(`Nova ficha: ${novo.cliente_nome || "Cliente"}`);
            try {
              if (typeof window !== "undefined" && "Audio" in window) {
                // beep curto opcional, ignora se bloqueado
                new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(()=>{});
              }
            } catch {}
            return [novo, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "anamneses" },
        (payload) => {
          const novo = payload.new as Anamnese;
          setItems((prev) => prev.map((p) => (p.id === novo.id ? novo : p)));
          setSelected((cur) => (cur && cur.id === novo.id ? novo : cur));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "anamneses" },
        (payload) => {
          const old = payload.old as Anamnese;
          setItems((prev) => prev.filter((p) => p.id !== old.id));
        }
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    // Resync ao voltar foco/online (websocket pode dormir em mobile)
    const resync = () => load();
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", resync);
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", onVisibility);

    // safety net leve a cada 10s caso o websocket caia
    const poll = setInterval(load, 10000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((a) => {
      const st = a.status || (a.revisada ? "aprovada" : "pendente");
      if (filter === "pendentes" && st !== "pendente") return false;
      if (filter === "aprovadas" && st !== "aprovada") return false;
      if (filter === "negadas" && st !== "negada") return false;
      if (!term) return true;
      const hay = `${a.cliente_nome} ${a.whatsapp}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, search, filter]);

  const setStatus = async (a: Anamnese, status: Status) => {
    const { error } = await supabase
      .from("anamneses")
      .update({
        status,
        revisada: status !== "pendente",
        revisada_at: status !== "pendente" ? new Date().toISOString() : null,
      })
      .eq("id", a.id);
    if (error) return toast.error("Erro ao atualizar");
    if (status === "aprovada") toast.success("Ficha aprovada");
    if (status === "negada") toast.success("Ficha negada — atendimento bloqueado");
    if (status === "pendente") toast.success("Voltou para pendente");
  };

  const slugify = (s: string) =>
    (s || "ficha")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ficha";

  const openPdf = (a: Anamnese) => {
    if (!a.pdf_url && !a.pdf_path) {
      toast.error("Esta ficha não possui PDF anexado");
      return;
    }
    const slug = slugify(a.cliente_nome);
    const shortId = a.id.slice(0, 8);
    window.open(`/anamnese/${slug}-${shortId}/pdf`, "_blank");
  };

  const removerFicha = (a: Anamnese) => setToDelete(a);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    if (toDelete.pdf_path) {
      try { await supabase.storage.from("anamneses").remove([toDelete.pdf_path]); } catch {}
    }
    const { error } = await supabase.from("anamneses").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) return toast.error("Erro ao excluir ficha");
    setItems((prev) => prev.filter((p) => p.id !== toDelete.id));
    if (selected?.id === toDelete.id) setSelected(null);
    setToDelete(null);
    toast.success("Ficha excluída");
  };

  const totalPendentes = items.filter((i) => (i.status || (i.revisada ? "aprovada" : "pendente")) === "pendente").length;

  const getStatus = (a: Anamnese): Status => a.status || (a.revisada ? "aprovada" : "pendente");

  const statusBadge = (st: Status) => {
    if (st === "aprovada") return { label: "Aprovada", cls: "bg-green-500/10 text-green-400 border-green-500/20" };
    if (st === "negada") return { label: "Negada", cls: "bg-red-500/10 text-red-400 border-red-500/20" };
    return { label: "Nova", cls: "bg-gold/15 text-gold border-gold/20" };
  };

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
          <div className="mt-1.5 inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-green-400 animate-pulse" : "bg-primary-foreground/30"}`} />
            <span className={`text-[9px] font-body uppercase tracking-wider ${live ? "text-green-400/80" : "text-primary-foreground/40"}`}>
              {live ? "Ao vivo" : "Conectando"}
            </span>
          </div>
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
        <div className="flex gap-1 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] p-1 overflow-x-auto">
          {([
            ["todas", "Todas"],
            ["pendentes", "Pendentes"],
            ["aprovadas", "Aprovadas"],
            ["negadas", "Negadas"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex-1 sm:flex-initial px-3 h-9 rounded-lg font-body text-[12px] font-medium transition-all whitespace-nowrap ${
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
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const st = getStatus(a);
            const badge = statusBadge(st);
            return (
              <div
                key={a.id}
                className={`rounded-2xl border p-4 transition-all ${
                  st === "pendente"
                    ? "border-gold/15 bg-gold/[0.04]"
                    : st === "negada"
                    ? "border-red-500/15 bg-red-500/[0.04]"
                    : "border-primary-foreground/[0.06] bg-primary-foreground/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body text-[14px] font-medium text-primary-foreground truncate flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary-foreground/40 shrink-0" />
                        {a.cliente_nome || "Sem nome"}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[10px] font-body font-medium">
                        <WhatsAppIcon className="w-3 h-3" />
                        WhatsApp
                      </span>
                    </div>
                    <p className="font-body text-[12px] text-primary-foreground/50 truncate mt-1 flex items-center gap-1.5">
                      <WhatsAppIcon className="w-3 h-3 text-[#25D366] shrink-0" />
                      {formatWhatsapp(a.whatsapp) || "—"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-primary-foreground/45">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-body font-bold border uppercase tracking-wider ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Ações */}
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

                  {st === "pendente" && (
                    <>
                      <button
                        onClick={() => setStatus(a, "aprovada")}
                        className="h-9 px-3 rounded-lg bg-green-500/10 hover:bg-green-500/15 border border-green-500/25 text-green-400 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => setStatus(a, "negada")}
                        className="h-9 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-400 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Negar
                      </button>
                    </>
                  )}
                  {st !== "pendente" && (
                    <button
                      onClick={() => setStatus(a, "pendente")}
                      className="h-9 px-3 rounded-lg bg-primary-foreground/[0.04] hover:bg-primary-foreground/[0.08] border border-primary-foreground/[0.08] text-primary-foreground/70 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                    </button>
                  )}
                  {st === "aprovada" && (
                    <button
                      onClick={() => setStatus(a, "negada")}
                      className="h-9 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-400 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Negar
                    </button>
                  )}
                  {st === "negada" && (
                    <button
                      onClick={() => setStatus(a, "aprovada")}
                      className="h-9 px-3 rounded-lg bg-green-500/10 hover:bg-green-500/15 border border-green-500/25 text-green-400 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => removerFicha(a)}
                    className="h-9 px-3 rounded-lg bg-red-500/[0.06] hover:bg-red-500/15 border border-red-500/15 text-red-400/80 hover:text-red-400 text-[12px] font-body font-medium flex items-center gap-1.5 active:scale-95 transition-all ml-auto"
                    title="Excluir ficha"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>

                {st === "negada" && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-400/80">
                    <XCircle className="w-3 h-3" />
                    Atendimento bloqueado por anamnese negada
                  </div>
                )}
              </div>
            );
          })}
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
                <p className="font-body text-[13px] text-primary-foreground flex items-center gap-1.5">
                  <span className="text-primary-foreground/50">WhatsApp:</span>
                  <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                  {formatWhatsapp(selected.whatsapp)}
                </p>
                <p className="font-body text-[12px] text-primary-foreground/60"><span className="text-primary-foreground/40">Recebida em:</span> {formatDate(selected.created_at)}</p>
                <p className="font-body text-[12px] mt-1">
                  <span className="text-primary-foreground/40">Status: </span>
                  <span className={
                    getStatus(selected) === "aprovada" ? "text-green-400" :
                    getStatus(selected) === "negada" ? "text-red-400" : "text-gold"
                  }>
                    {statusBadge(getStatus(selected)).label}
                  </span>
                </p>
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
                  onClick={() => setStatus(selected, "aprovada")}
                  className="h-10 px-4 rounded-xl bg-green-500/15 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-[13px] font-body font-medium flex items-center gap-2 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprovar
                </button>
                <button
                  onClick={() => setStatus(selected, "negada")}
                  className="h-10 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[13px] font-body font-medium flex items-center gap-2 active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" /> Negar
                </button>
                {getStatus(selected) !== "pendente" && (
                  <button
                    onClick={() => setStatus(selected, "pendente")}
                    className="h-10 px-4 rounded-xl bg-primary-foreground/[0.06] hover:bg-primary-foreground/[0.10] border border-primary-foreground/[0.08] text-primary-foreground text-[13px] font-body font-medium flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Clock className="w-4 h-4" /> Reabrir
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <DialogContent className="max-w-sm bg-charcoal border-red-500/20">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-primary-foreground flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
              </span>
              Excluir ficha?
            </DialogTitle>
          </DialogHeader>

          {toDelete && (
            <div className="space-y-4">
              <p className="font-body text-[13px] text-primary-foreground/70 leading-relaxed">
                Você está prestes a excluir permanentemente a ficha de anamnese de{" "}
                <span className="text-primary-foreground font-medium">{toDelete.cliente_nome || "este cliente"}</span>.
                Esta ação não pode ser desfeita.
              </p>

              <div className="rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-[12px] text-primary-foreground/70">
                  <User className="w-3.5 h-3.5 text-primary-foreground/40" />
                  {toDelete.cliente_nome || "Sem nome"}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-primary-foreground/70">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                  {formatWhatsapp(toDelete.whatsapp) || "—"}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-primary-foreground/70">
                  <Calendar className="w-3.5 h-3.5 text-primary-foreground/40" />
                  {formatDate(toDelete.created_at)}
                </div>
                {(toDelete.pdf_url || toDelete.pdf_path) && (
                  <div className="flex items-center gap-2 text-[11px] text-red-400/80 pt-1">
                    <FileText className="w-3.5 h-3.5" />
                    O PDF anexado também será removido
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setToDelete(null)}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-primary-foreground/[0.06] hover:bg-primary-foreground/[0.10] border border-primary-foreground/[0.10] text-primary-foreground/80 text-[13px] font-body font-medium active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 h-11 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 text-[13px] font-body font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Excluindo..." : "Excluir ficha"}
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
