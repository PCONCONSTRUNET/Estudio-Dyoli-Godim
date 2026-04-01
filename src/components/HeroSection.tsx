import professionalImg from "@/assets/professional.png";

interface HeroSectionProps {
  onSchedule: () => void;
  onLogin: () => void;
}

const HeroSection = ({ onSchedule, onLogin }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col bg-charcoal overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Slow radial glow - gold */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.03] blur-[120px] animate-hero-glow" />
        {/* Rose accent glow */}
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full bg-rose/[0.04] blur-[100px] animate-hero-glow-alt" />
        {/* Floating particles */}
        <div className="absolute top-[20%] left-[15%] w-1 h-1 rounded-full bg-gold/20 animate-float-particle" />
        <div className="absolute top-[40%] right-[20%] w-0.5 h-0.5 rounded-full bg-gold/30 animate-float-particle-delayed" />
        <div className="absolute bottom-[35%] left-[25%] w-0.5 h-0.5 rounded-full bg-rose/20 animate-float-particle-slow" />
        <div className="absolute top-[60%] right-[30%] w-1 h-1 rounded-full bg-gold/15 animate-float-particle-delayed" />
        {/* Subtle line accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-gold/10 to-transparent animate-line-fade" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-t from-transparent via-gold/10 to-transparent animate-line-fade-alt" />
      </div>

      {/* Professional photo */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-12">
        <div className="relative w-56 h-56 mb-8 animate-fade-in">
          <img
            src={professionalImg}
            alt="Dyoli Godim - Profissional de Micropigmentação e Piercing"
            className="w-full h-full object-cover object-top rounded-2xl shadow-2xl shadow-charcoal/80"
          />
          {/* Soft gold border glow */}
          <div className="absolute -inset-px rounded-2xl border border-gold/15" />
          <div className="absolute -inset-1 rounded-2xl bg-gold/[0.03] blur-sm -z-10" />
        </div>

        {/* Text content */}
        <div className="text-center space-y-4 max-w-sm animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <h1 className="font-heading text-3xl font-semibold text-primary-foreground tracking-wide">
            Studio Dyoli Godim
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-px bg-gold/40" />
            <p className="font-body text-xs text-gold/70 tracking-[0.25em] uppercase">
              Micropigmentação · Tatoo · Piercing
            </p>
            <div className="w-8 h-px bg-gold/40" />
          </div>
          <p className="font-body text-base text-primary-foreground/70 leading-relaxed pt-2">
            Procedimentos estéticos com segurança e precisão
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm mt-10 space-y-3 px-4 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <button
            onClick={onSchedule}
            className="w-full py-4 rounded-lg bg-rose text-primary-foreground font-body font-medium text-sm tracking-wide uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-rose/20"
          >
            Agendar Procedimento
          </button>
          <button
            onClick={onLogin}
            className="w-full py-3.5 rounded-lg border border-primary-foreground/15 text-primary-foreground/60 font-body text-sm tracking-wide transition-all duration-300 hover:border-gold/40 hover:text-gold"
          >
            Já tenho cadastro
          </button>
        </div>

        {/* Bottom accent */}
        <div className="mt-auto pt-8">
          <div className="w-12 h-0.5 bg-gold/30 mx-auto animate-line-fade" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
