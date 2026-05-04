import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, User, Loader2, Folder, Sparkles, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GuidedFlowProps {
  onSelectService: (serviceName: string) => void;
  onBack: () => void;
  onProfile?: () => void;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  categoria: string;
}

const GuidedFlow = ({ onSelectService, onBack, onProfile }: GuidedFlowProps) => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("servicos_app")
        .select("id, nome, preco, duracao_minutos, categoria")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (!active) return;
      setServicos((data as Servico[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("servicos_app-realtime-agendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servicos_app" },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    servicos.forEach((s) => {
      const cat = s.categoria || "Outros";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nome, count]) => ({ nome, count }));
  }, [servicos]);

  const servicosDaCategoria = useMemo(() => {
    if (!categoriaSelecionada) return [];
    const lista = servicos.filter((s) => (s.categoria || "Outros") === categoriaSelecionada);
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter((s) => s.nome.toLowerCase().includes(termo));
  }, [servicos, categoriaSelecionada, busca]);

  const OptionCard = ({
    title,
    description,
    onClick,
  }: {
    title: string;
    description: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="ios-press relative w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_12px_32px_-10px_rgba(0,0,0,0.18)] hover:border-gold/40 hover:bg-card transition-all duration-300 group overflow-hidden"
    >
      <span className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-gold/0 to-transparent group-hover:via-gold/60 transition-all duration-300" />
      <div className="text-left min-w-0">
        <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground group-hover:text-rose transition-colors duration-200">
          {title}
        </h3>
        <p className="font-body text-[13px] leading-relaxed text-muted-foreground mt-1">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-gold group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
    </button>
  );

  return (
    <section className="relative min-h-screen w-full overflow-x-hidden bg-nude px-5 py-8 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-8">
      {onProfile && (
        <button
          onClick={onProfile}
          className="ios-press absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-secondary border border-border shadow-[0_2px_12px_-3px_rgba(0,0,0,0.1)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all"
        >
          <User className="w-5 h-5" />
        </button>
      )}

      <div className="w-full max-w-md lg:max-w-xl">
        <button
          onClick={categoriaSelecionada ? () => { setCategoriaSelecionada(null); setBusca(""); } : onBack}
          className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-[14px]">Voltar</span>
        </button>

        <div className="animate-fade-in">
          {!categoriaSelecionada ? (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <p className="font-body text-[11px] tracking-[0.2em] uppercase text-gold font-medium">Passo 1</p>
                <h2 className="font-heading text-[1.625rem] sm:text-[2rem] leading-[1.15] font-semibold tracking-tight text-foreground lg:text-4xl break-words hyphens-auto">
                  O que você deseja melhorar?
                </h2>
                <p className="font-body text-[14px] text-muted-foreground/80 max-w-md">
                  Escolha um serviço para ver detalhes e horários disponíveis.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gold" />
                  </div>
                ) : categorias.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                    <Folder className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-body text-[14px] text-muted-foreground">
                      Nenhum serviço disponível no momento.
                    </p>
                  </div>
                ) : (
                  categorias.map((c) => (
                    <OptionCard
                      key={c.nome}
                      title={c.nome}
                      description={`${c.count} ${c.count === 1 ? "serviço disponível" : "serviços disponíveis"}`}
                      onClick={() => setCategoriaSelecionada(c.nome)}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <p className="font-body text-[11px] tracking-[0.2em] uppercase text-gold font-medium">Passo 2</p>
                <h2 className="font-heading text-[1.625rem] sm:text-[2rem] leading-[1.15] font-semibold tracking-tight text-foreground lg:text-4xl break-words hyphens-auto">
                  {categoriaSelecionada}
                </h2>
                <p className="font-body text-[14px] text-muted-foreground/80 max-w-md">
                  Escolha o serviço desejado.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {servicosDaCategoria.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectService(s.nome)}
                    className="ios-press relative w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_12px_32px_-10px_rgba(0,0,0,0.18)] hover:border-gold/40 hover:bg-card transition-all duration-300 group overflow-hidden"
                  >
                    <span className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-gold/0 to-transparent group-hover:via-gold/60 transition-all duration-300" />
                    <div className="text-left min-w-0 flex-1">
                      <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground group-hover:text-rose transition-colors duration-200">
                        {s.nome}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="font-body text-[13px] font-medium text-gold">
                          R$ {Number(s.preco).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="font-body text-[12px] text-muted-foreground">
                          {s.duracao_minutos} min
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-gold group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GuidedFlow;
