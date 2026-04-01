import { User, ShoppingBag } from "lucide-react";
import professionalImg from "@/assets/professional.png";

interface HeroSectionProps {
  onSchedule: () => void;
  onLogin: () => void;
  onProfile?: () => void;
  onProdutos?: () => void;
  isAuthenticated?: boolean;
}

const HeroSection = ({ onSchedule, onLogin, onProfile, onProdutos, isAuthenticated }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col bg-charcoal overflow-hidden">
      {/* Animated premium gradient background */}
      <div className="absolute inset-0 animate-bg-drift" style={{
        background: 'linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(30 15% 12%) 25%, hsl(20 10% 10%) 50%, hsl(0 0% 9%) 75%, hsl(30 20% 11%) 100%)',
        backgroundSize: '400% 400%',
      }} />
      {/* Soft ambient glow - nude/warm */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.025] blur-[150px] animate-hero-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-nude/[0.03] blur-[130px] animate-hero-glow-alt" />

      {/* Profile button (top-right) */}
      {isAuthenticated && onProfile && (
        <button
          onClick={onProfile}
          className="ios-press absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-primary-foreground/[0.1] backdrop-blur-md border border-primary-foreground/[0.12] flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/[0.15] transition-all"
        >
          <User className="w-5 h-5" />
        </button>
      )}

      {/* Content — mobile: vertical / desktop: side-by-side */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-12 lg:flex-row lg:justify-center lg:gap-16 lg:px-16">
        {/* 1. IMAGEM */}
        <div className="relative w-56 h-56 mb-6 animate-fade-in lg:w-72 lg:h-72 lg:mb-0 lg:shrink-0">
          <div className="absolute inset-0 rounded-full bg-gold/[0.08] blur-[60px] scale-125 animate-hero-glow" />
          <img
            src={professionalImg}
            alt="Dyoli Godim - Profissional de Micropigmentação e Piercing"
            className="relative w-full h-full object-cover object-top"
          />
        </div>

        {/* 2. NOME + BOTÕES */}
        <div className="flex flex-col items-center lg:items-start">
          <div className="text-center space-y-3 max-w-sm animate-fade-in lg:text-left" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            <h1 className="font-heading text-3xl font-semibold text-primary-foreground tracking-wide lg:text-5xl">
              Estúdio Dyoli Godim
            </h1>
            <p className="font-body text-xs text-gold/70 tracking-[0.25em] uppercase lg:text-sm">
              Agende seu procedimento com segurança e resultado profissional
            </p>
          </div>

          {/* 3. BOTÕES */}
          <div className="w-full max-w-sm mt-10 space-y-3 px-4 animate-fade-in lg:px-0 lg:max-w-xs" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            {isAuthenticated ? (
              <>
                <button
                  onClick={onSchedule}
                  className="ios-press group flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[16px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] backdrop-blur-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} viewBox="0 0 24 24" height={20} fill="none" strokeWidth="2.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                  </svg>
                  <span>Agendar</span>
                </button>
                <button
                  onClick={onProfile}
                  className="ios-press group flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-primary-foreground/[0.08] backdrop-blur-md border border-primary-foreground/[0.12] text-primary-foreground/80 font-body font-medium text-[16px] tracking-wide hover:bg-primary-foreground/[0.12] hover:border-primary-foreground/[0.18]"
                >
                  <User className="w-5 h-5" />
                  <span>Meu Perfil</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="ios-press group flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[16px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] backdrop-blur-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} viewBox="0 0 24 24" height={20} fill="none" strokeWidth="2.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M5 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6"/>
                  </svg>
                  <span>Entrar</span>
                </button>
                <button
                  onClick={onSchedule}
                  className="ios-press group flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-primary-foreground/[0.08] backdrop-blur-md border border-primary-foreground/[0.12] text-primary-foreground/80 font-body font-medium text-[16px] tracking-wide hover:bg-primary-foreground/[0.12] hover:border-primary-foreground/[0.18]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} viewBox="0 0 24 24" height={20} fill="none" strokeWidth="2.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                  </svg>
                  <span>Cadastrar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
