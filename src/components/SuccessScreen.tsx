import { CheckCircle2, MessageCircle } from "lucide-react";

interface SuccessScreenProps {
  onHome: () => void;
}

const SuccessScreen = ({ onHome }: SuccessScreenProps) => {
  return (
    <section className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in space-y-6">
        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-gold" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Agendamento Confirmado!
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Você receberá uma confirmação via WhatsApp e um lembrete 24h antes do procedimento.
          </p>
        </div>

        <div className="space-y-3 w-full max-w-sm pt-4">
          <a
            href="https://wa.me/5500000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-lg bg-charcoal text-primary-foreground font-body font-medium text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 hover:brightness-110"
          >
            <MessageCircle className="w-4 h-4" />
            Falar pelo WhatsApp
          </a>
          <button
            onClick={onHome}
            className="w-full py-3.5 rounded-lg border border-border text-muted-foreground font-body text-sm tracking-wide transition-all duration-300 hover:border-gold/50 hover:text-foreground"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </section>
  );
};

export default SuccessScreen;
