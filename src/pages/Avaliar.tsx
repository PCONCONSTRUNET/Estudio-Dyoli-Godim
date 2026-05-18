import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Avaliar = () => {
  const { id: agendamentoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [agendamento, setAgendamento] = useState<{
    servico: string;
    cliente_nome: string | null;
    user_id: string;
  } | null>(null);

  const [nome, setNome] = useState("");
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    if (!agendamentoId) return;
    (async () => {
      const { data: ag } = await supabase
        .from("agendamentos")
        .select("servico, cliente_nome, user_id")
        .eq("id", agendamentoId)
        .maybeSingle();

      if (ag) {
        setAgendamento(ag as any);
        let nomeInicial = ag.cliente_nome || "";
        if (!nomeInicial && ag.user_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("nome")
            .eq("id", ag.user_id)
            .maybeSingle();
          nomeInicial = prof?.nome || "";
        }
        setNome(nomeInicial);

        const { data: existente } = await supabase
          .from("avaliacoes")
          .select("id")
          .eq("agendamento_id", agendamentoId)
          .maybeSingle();
        if (existente) setAlreadyRated(true);
      }
      setLoading(false);
    })();
  }, [agendamentoId]);

  const handleSubmit = async () => {
    if (nota < 1) { setError("Selecione pelo menos 1 estrela"); return; }
    if (!nome.trim()) { setError("Informe seu nome"); return; }
    setSaving(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("submit-avaliacao", {
        body: {
          agendamento_id: agendamentoId,
          nota,
          comentario: comentario.trim(),
          nome: nome.trim(),
        },
      });
      if (fnErr || (data as any)?.error) {
        setError((data as any)?.error || "Não foi possível enviar. Tente novamente.");
        setSaving(false);
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/"), 2200);
    } catch (e: any) {
      setError(e?.message || "Erro ao enviar avaliação");
      setSaving(false);
    }
  };

  const labels = ["", "Ruim", "Regular", "Bom", "Ótimo", "Excelente"];
  const displayNota = hover || nota;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="font-body text-primary-foreground/60 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!agendamento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-charcoal px-6 text-center">
        <p className="font-heading text-xl text-primary-foreground mb-2">Link inválido</p>
        <p className="font-body text-primary-foreground/60 text-sm">
          Não encontramos esse atendimento.
        </p>
      </div>
    );
  }

  if (done || alreadyRated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-charcoal px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-gold" />
        </div>
        <p className="font-heading text-xl text-primary-foreground mb-2">
          {alreadyRated && !done ? "Você já avaliou ✨" : "Obrigada pela avaliação!"}
        </p>
        <p className="font-body text-primary-foreground/60 text-sm mb-6">
          Sua opinião nos ajuda a evoluir 💛
        </p>
        <button
          onClick={() => navigate("/")}
          className="ios-press px-6 py-3 rounded-full bg-gradient-to-r from-gold to-nude text-charcoal font-body text-[14px] font-semibold"
        >
          Ir para o app
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] backdrop-blur-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="font-body text-[10px] uppercase tracking-widest text-gold/80 font-medium">
            Como foi seu atendimento?
          </span>
        </div>
        <h1 className="font-heading text-xl font-semibold text-primary-foreground leading-tight">
          {agendamento.servico}
        </h1>
        <p className="font-body text-[12px] text-primary-foreground/45 mt-1">
          Sua avaliação aparece na home do app ✨
        </p>

        <label className="block mt-5 mb-1 font-body text-[11px] uppercase tracking-wider text-primary-foreground/50">
          Seu nome
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value.slice(0, 100))}
          placeholder="Digite seu nome"
          className="w-full px-4 py-3 rounded-2xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] text-primary-foreground font-body text-[14px] placeholder:text-primary-foreground/30 outline-none focus:border-gold/40"
        />

        <div className="flex justify-center gap-1.5 my-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="ios-press p-1 transition-transform active:scale-95"
            >
              <Star
                className={`w-10 h-10 transition-all ${
                  n <= displayNota
                    ? "fill-gold text-gold drop-shadow-[0_0_8px_hsl(40_40%_55%/0.5)]"
                    : "text-primary-foreground/20"
                }`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {displayNota > 0 && (
          <p className="text-center font-body text-[13px] text-gold font-medium -mt-3 mb-4">
            {labels[displayNota]}
          </p>
        )}

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value.slice(0, 500))}
          placeholder="Conte como foi (opcional)..."
          rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/30 outline-none focus:border-gold/40 resize-none"
        />
        <p className="text-right font-body text-[10px] text-primary-foreground/30 mt-1">
          {comentario.length}/500
        </p>

        {error && (
          <p className="text-center font-body text-[12px] text-rose mt-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || nota < 1 || !nome.trim()}
          className="ios-press w-full mt-4 py-3.5 rounded-full bg-gradient-to-r from-gold to-nude text-charcoal font-body text-[15px] font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Enviando..." : "Enviar avaliação"}
        </button>
      </div>
    </div>
  );
};

export default Avaliar;
