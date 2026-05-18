import { useEffect, useState } from "react";
import { Star, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  cliente_nome: string | null;
  user_id: string | null;
  agendamento_id: string | null;
  created_at: string;
  _profile_nome?: string;
}

const AvaliacoesTab = () => {
  const [list, setList] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("avaliacoes")
      .select("id, nota, comentario, cliente_nome, user_id, agendamento_id, created_at")
      .order("created_at", { ascending: false });

    const rows = (data || []) as Avaliacao[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.id, p.nome]));
      rows.forEach((r) => { r._profile_nome = r.user_id ? map.get(r.user_id) : undefined; });
    }
    setList(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta avaliação? Ela sairá da Home.")) return;
    setDeleting(id);
    const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
    setDeleting(null);
    if (error) {
      alert("Não foi possível excluir: " + error.message);
      return;
    }
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
        " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary-foreground">Avaliações dos clientes</h2>
          <p className="font-body text-[12px] text-primary-foreground/50 mt-0.5">
            {list.length} {list.length === 1 ? "avaliação" : "avaliações"} · aparecem na Home (nota ≥ 4 com comentário)
          </p>
        </div>
        <button
          onClick={load}
          className="ios-press flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-foreground/[0.06] border border-primary-foreground/[0.08] text-primary-foreground/70 font-body text-[12px]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {loading ? (
        <p className="font-body text-[13px] text-primary-foreground/50">Carregando...</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] p-8 text-center">
          <p className="font-body text-[13px] text-primary-foreground/60">Nenhuma avaliação ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((r) => {
            const nome = r._profile_nome || r.cliente_nome || "Cliente";
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-[13px] font-semibold text-primary-foreground">{nome}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < r.nota ? "fill-gold text-gold" : "text-primary-foreground/20"}`}
                            strokeWidth={1.5}
                          />
                        ))}
                      </span>
                      {!r.agendamento_id && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary-foreground/[0.08] font-body text-[9px] uppercase tracking-wider text-primary-foreground/50">
                          Avulsa
                        </span>
                      )}
                    </div>
                    <p className="font-body text-[11px] text-primary-foreground/40 mt-0.5">{formatDate(r.created_at)}</p>
                    {r.comentario && (
                      <p className="font-body text-[13px] text-primary-foreground/80 mt-2 leading-relaxed whitespace-pre-wrap">
                        {r.comentario}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    className="ios-press shrink-0 w-9 h-9 rounded-full bg-rose/10 border border-rose/20 text-rose flex items-center justify-center disabled:opacity-40"
                    aria-label="Excluir avaliação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvaliacoesTab;
