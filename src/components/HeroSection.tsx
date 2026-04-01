import professionalImg from "@/assets/professional.png";

interface HeroSectionProps {
  onSchedule: () => void;
  onLogin: () => void;
}

const HeroSection = ({ onSchedule, onLogin }: HeroSectionProps) => {
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

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-12">
        {/* 1. IMAGEM (impacto) */}
        <div className="relative w-56 h-56 mb-6 animate-fade-in">
          {/* Glow behind image */}
          <div className="absolute inset-0 rounded-full bg-gold/[0.08] blur-[60px] scale-125 animate-hero-glow" />
          <img
            src={professionalImg}
            alt="Dyoli Godim - Profissional de Micropigmentação e Piercing"
            className="relative w-full h-full object-cover object-top"
          />
        </div>

        {/* 2. NOME (marca) */}
        <div className="text-center space-y-3 max-w-sm animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <h1 className="font-heading text-3xl font-semibold text-primary-foreground tracking-wide">
            Estúdio Dyoli Godim
          </h1>
          <p className="font-body text-xs text-gold/70 tracking-[0.25em] uppercase">
            Agende seu procedimento com segurança e resultado profissional
          </p>
        </div>

        {/* 3. BOTÃO (ação) */}
        <div className="w-full max-w-sm mt-8 space-y-3 px-4 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <button
            onClick={onLogin}
            className="group flex items-center justify-center gap-2 w-full py-3 rounded-full bg-rose text-primary-foreground font-body font-medium text-[17px] tracking-wider transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-rose/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={22} viewBox="0 0 24 24" height={22} fill="none" className="group-hover:animate-flicker">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Entrar</span>
          </button>
          <button
            onClick={onSchedule}
            className="group flex items-center justify-center gap-2 w-full py-3 rounded-full border border-primary-foreground/20 text-primary-foreground/70 font-body text-[17px] tracking-wider transition-all duration-300 hover:border-gold/50 hover:text-gold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={22} viewBox="0 0 24 24" height={22} fill="none" className="group-hover:animate-flicker">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
            </svg>
            <span>Cadastrar</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
