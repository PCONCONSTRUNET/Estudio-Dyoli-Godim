import { useState } from "react";
import { ArrowLeft, ChevronRight, User } from "lucide-react";

interface GuidedFlowProps {
  onSelectService: (serviceId: string) => void;
  onBack: () => void;
  onProfile?: () => void;
}

type Step = "initial" | "sobrancelhas" | "perfuracao-confirm";

const GuidedFlow = ({ onSelectService, onBack, onProfile }: GuidedFlowProps) => {
  const [step, setStep] = useState<Step>("initial");

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
    <section className="relative min-h-screen bg-nude px-6 py-8 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-8">
      {/* Profile button */}
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
          onClick={step === "initial" ? onBack : () => setStep("initial")}
          className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-[14px]">Voltar</span>
        </button>

        <div className="animate-fade-in">
          {step === "initial" && (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <p className="font-body text-[11px] tracking-[0.2em] uppercase text-gold font-medium">Passo 1</p>
                <h2 className="font-heading text-[2rem] leading-[1.1] font-semibold tracking-tight text-foreground lg:text-4xl">
                  O que você deseja melhorar?
                </h2>
                <p className="font-body text-[14px] text-muted-foreground/80 max-w-md">
                  Escolha um serviço para ver detalhes e horários disponíveis.
                </p>
              </div>
              <div className="space-y-3 pt-1">
                <OptionCard
                  title="Sobrancelhas"
                  description="Micropigmentação para realçar o olhar"
                  onClick={() => setStep("sobrancelhas")}
                />
                <OptionCard
                  title="Lábios"
                  description="Contorno e cor natural para seus lábios"
                  onClick={() => onSelectService("labial")}
                />
                <OptionCard
                  title="Perfuração"
                  description="Piercings com joias em titânio premium"
                  onClick={() => setStep("perfuracao-confirm")}
                />
              </div>
            </div>
          )}

          {step === "sobrancelhas" && (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <p className="font-body text-[11px] tracking-[0.2em] uppercase text-gold font-medium">Passo 2</p>
                <h2 className="font-heading text-[2rem] leading-[1.1] font-semibold tracking-tight text-foreground lg:text-4xl">
                  Qual resultado você deseja?
                </h2>
              </div>
              <div className="space-y-3 pt-1">
                <OptionCard
                  title="Natural (Fio a Fio)"
                  description="Fios delicados e naturais que harmonizam com o rosto"
                  onClick={() => onSelectService("fio-a-fio")}
                />
              </div>
            </div>
          )}

          {step === "perfuracao-confirm" && (
            <div className="space-y-7">
              <div className="space-y-2.5">
                <p className="font-body text-[11px] tracking-[0.2em] uppercase text-gold font-medium">Passo 2</p>
                <h2 className="font-heading text-[2rem] leading-[1.1] font-semibold tracking-tight text-foreground lg:text-4xl">
                  Você já sabe qual tipo deseja?
                </h2>
              </div>
              <div className="space-y-3 pt-1">
                <OptionCard
                  title="Sim, quero escolher"
                  description="Ver opções de perfuração disponíveis"
                  onClick={() => onSelectService("perfuracao")}
                />
                <OptionCard
                  title="Não, quero saber mais"
                  description="Entenda os tipos e escolha com segurança"
                  onClick={() => onSelectService("perfuracao")}
                />
              </div>
              <div className="mt-4 p-5 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_20px_-12px_rgba(0,0,0,0.1)]">
                <p className="font-body text-[13px] text-muted-foreground leading-relaxed">
                  Todas as perfurações são realizadas com material esterilizado e joias em titânio grau implante, garantindo segurança e biocompatibilidade.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GuidedFlow;
