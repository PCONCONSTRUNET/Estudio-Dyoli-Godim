import { useEffect, useRef } from "react";
import { CheckCircle2, User, Home } from "lucide-react";
import professionalImg from "@/assets/professional.png";

interface SuccessScreenProps {
  onHome: () => void;
  onProfile?: () => void;
}

const SuccessScreen = ({ onHome, onProfile }: SuccessScreenProps) => {
  const audioPlayed = useRef(false);

  useEffect(() => {
    if (audioPlayed.current) return;
    audioPlayed.current = true;

    // Play success chime
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (freq: number, start: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // Pleasant 3-note chime (C5, E5, G5)
    playNote(523, 0, 0.3, 0.15);
    playNote(659, 0.12, 0.3, 0.12);
    playNote(784, 0.24, 0.5, 0.1);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in overflow-hidden">
      {/* Background matching hero */}
      <div className="absolute inset-0 animate-bg-drift" style={{
        background: 'linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(30 15% 12%) 25%, hsl(20 10% 10%) 50%, hsl(0 0% 9%) 75%, hsl(30 20% 11%) 100%)',
        backgroundSize: '400% 400%',
      }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.025] blur-[150px] animate-hero-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-nude/[0.03] blur-[130px] animate-hero-glow-alt" />
      <div className="absolute inset-0 bg-black/40" />

      {/* Glass modal */}
      <div className="relative w-full max-w-sm lg:max-w-md rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] px-7 py-8 animate-scale-in">
        {/* Photo */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gold/15 shadow-[0_8px_30px_-8px_hsl(40_40%_55%/0.15)]">
              <img src={professionalImg} alt="Dyoli Godim" className="w-full h-full object-cover object-top" />
            </div>
            {/* Check badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold/20 border-2 border-charcoal flex items-center justify-center backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4 text-gold" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="font-heading text-2xl font-semibold text-primary-foreground tracking-wide">
            Agendamento Confirmado!
          </h2>
          <p className="font-body text-[13px] text-primary-foreground/45 font-light max-w-[260px] mx-auto leading-relaxed">
            Você receberá uma confirmação via WhatsApp e um lembrete 24h antes do procedimento.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {onProfile && (
            <button
              onClick={onProfile}
              className="ios-press w-full py-3.5 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              <User className="w-5 h-5" />
              Meu Perfil
            </button>
          )}
          <button
            onClick={onHome}
            className="ios-press w-full py-3.5 rounded-2xl bg-primary-foreground/[0.08] backdrop-blur-md border border-primary-foreground/[0.12] text-primary-foreground/80 font-body font-medium text-[15px] tracking-wide transition-all duration-200 hover:bg-primary-foreground/[0.12] flex items-center justify-center gap-2.5"
          >
            <Home className="w-5 h-5" />
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessScreen;