import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface GuidedFlowProps {
  onSelectService: (serviceId: string) => void;
  onBack: () => void;
}

type Step = "initial" | "sobrancelhas" | "perfuracao-confirm";

const GuidedFlow = ({ onSelectService, onBack }: GuidedFlowProps) => {
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
      className="ios-press w-full flex items-center justify-between p-5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm hover:border-gold/40 hover:bg-card transition-all duration-200 group"
    >
      <div className="text-left">
        <h3 className="font-heading text-xl font-semibold text-foreground group-hover:text-rose transition-colors duration-200">
          {title}
        </h3>
        <p className="font-body text-[13px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-gold/60 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ml-3" />
    </button>
  );

  return (
    <section className="min-h-screen bg-background px-6 py-8">
      <button
        onClick={step === "initial" ? onBack : () => setStep("initial")}
        className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-body text-[14px]">Voltar</span>
      </button>

      <div className="animate-fade-in">
        {step === "initial" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">Passo 1</p>
              <h2 className="font-heading text-3xl font-semibold text-foreground">
                O que você deseja melhorar?
              </h2>
            </div>
            <div className="space-y-3 pt-2">
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
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">Passo 2</p>
              <h2 className="font-heading text-3xl font-semibold text-foreground">
                Qual resultado você deseja?
              </h2>
            </div>
            <div className="space-y-3 pt-2">
              <OptionCard
                title="Natural (Fio a Fio)"
                description="Fios delicados e naturais que harmonizam com o rosto"
                onClick={() => onSelectService("fio-a-fio")}
              />
            </div>
          </div>
        )}

        {step === "perfuracao-confirm" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">Passo 2</p>
              <h2 className="font-heading text-3xl font-semibold text-foreground">
                Você já sabe qual tipo deseja?
              </h2>
            </div>
            <div className="space-y-3 pt-2">
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
            <div className="mt-4 p-4 rounded-2xl bg-secondary/40 backdrop-blur-sm border border-border/50">
              <p className="font-body text-[13px] text-muted-foreground leading-relaxed">
                Todas as perfurações são realizadas com material esterilizado e joias em titânio grau implante, garantindo segurança e biocompatibilidade.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GuidedFlow;