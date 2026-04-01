import professionalImg from "@/assets/professional.png";


interface HeroSectionProps {
  onSchedule: () => void;
  onLogin: () => void;
}

const HeroSection = ({ onSchedule, onLogin }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex flex-col bg-charcoal overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal/90 to-charcoal" />


      {/* Professional photo */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="relative w-64 h-64 mb-8 rounded-full overflow-hidden border-2 border-gold/30 shadow-2xl">
          <img
            src={professionalImg}
            alt="Dyoli Godim - Profissional de Micropigmentação e Piercing"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Text content */}
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="font-heading text-3xl font-semibold text-primary-foreground tracking-wide">
            Studio Dyoli Godim
          </h1>
          <p className="font-body text-sm text-primary-foreground/60 tracking-widest uppercase">
            Micropigmentação · Tatoo · Piercing
          </p>
          <p className="font-body text-base text-primary-foreground/80 leading-relaxed pt-2">
            Procedimentos estéticos com segurança e precisão
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm mt-10 space-y-3 px-4">
          <button
            onClick={onSchedule}
            className="w-full py-4 rounded-lg bg-rose text-primary-foreground font-body font-medium text-sm tracking-wide uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-rose/20"
          >
            Agendar Procedimento
          </button>
          <button
            onClick={onLogin}
            className="w-full py-3.5 rounded-lg border border-primary-foreground/20 text-primary-foreground/70 font-body text-sm tracking-wide transition-all duration-300 hover:border-gold/50 hover:text-gold"
          >
            Já tenho cadastro
          </button>
        </div>

        {/* Bottom accent */}
        <div className="mt-auto pt-8">
          <div className="w-12 h-0.5 bg-gold/40 mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
