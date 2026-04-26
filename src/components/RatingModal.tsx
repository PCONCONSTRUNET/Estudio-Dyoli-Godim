import { useState } from "react";
import { Star, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendPush } from "@/lib/push-notify";

interface RatingModalProps {
  agendamentoId: string;
  userId: string;
  servico: string;
  clienteNome: string;
  existingNota?: number;
  existingComentario?: string;
  onClose: () => void;
  onSaved: (nota: number, comentario: string) => void;
}

const RatingModal = ({
  agendamentoId,
  userId,
  servico,
  clienteNome,
  existingNota,
  existingComentario,
  onClose,
  onSaved,
}: RatingModalProps) => {
  const [nota, setNota] = useState<number>(existingNota || 0);
  const [hover, setHover] = useState<number>(0);
  const [comentario, setComentario] = useState<string>(existingComentario || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(existingNota);

  const handleSubmit = async () => {
    if (nota < 1) {
      setError("Selecione pelo menos 1 estrela");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      agendamento_id: agendamentoId,
      user_id: userId,
      nota,
      comentario: comentario.trim().slice(0, 500),
    };

    const { error: upsertError } = await supabase
      .from("avaliacoes")
      .upsert(payload, { onConflict: "agendamento_id" });

    if (upsertError) {
      setError("Não foi possível salvar. Tente novamente.");
      setSaving(false);
      return;
    }

    // Notifica admin (silencioso em caso de erro)
    if (!isEditing) {
      try {
        const stars = "⭐".repeat(nota);
        await sendPush({
          role: "admin",
          title: `${stars} Nova avaliação ${nota}/5`,
          message: `${clienteNome} avaliou ${servico}${comentario ? `: "${comentario.slice(0, 80)}"` : ""}`,
          url: "/admin",
          data: { agendamento_id: agendamentoId, tipo: "avaliacao" },
        });
      } catch (e) {
        console.warn("Push de avaliação falhou:", e);
      }
    }

    onSaved(nota, comentario);
    setSaving(false);
  };

  const labels = ["", "Ruim", "Regular", "Bom", "Ótimo", "Excelente"];
  const displayNota = hover || nota;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/90 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)] animate-scale-in p-6">
        <button
          onClick={onClose}
          className="ios-press absolute top-4 right-4 w-8 h-8 rounded-full bg-primary-foreground/[0.08] flex items-center justify-center text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/[0.12] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="font-body text-[10px] uppercase tracking-widest text-gold/80 font-medium">
            {isEditing ? "Editar avaliação" : "Como foi seu atendimento?"}
          </span>
        </div>
        <h3 className="font-heading text-lg font-semibold text-primary-foreground leading-tight pr-8">
          {servico}
        </h3>
        <p className="font-body text-[12px] text-primary-foreground/45 mt-1">
          Sua opinião nos ajuda a melhorar ✨
        </p>

        {/* Stars */}
        <div className="flex justify-center gap-1.5 my-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="ios-press p-1 transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-9 h-9 transition-all ${
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

        {/* Comentário */}
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value.slice(0, 500))}
          placeholder="Conte como foi (opcional)..."
          rows={3}
          className="w-full px-4 py-3 rounded-2xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/30 outline-none focus:border-gold/40 resize-none"
        />
        <p className="text-right font-body text-[10px] text-primary-foreground/30 mt-1">
          {comentario.length}/500
        </p>

        {error && (
          <p className="text-center font-body text-[12px] text-rose mt-2">{error}</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="ios-press flex-1 py-3 rounded-full bg-primary-foreground/[0.06] border border-primary-foreground/[0.08] text-primary-foreground/70 font-body text-[14px] font-medium transition-all hover:bg-primary-foreground/[0.1]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || nota < 1}
            className="ios-press flex-1 py-3 rounded-full bg-gradient-to-r from-gold to-nude text-charcoal font-body text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Enviando..." : isEditing ? "Atualizar" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
