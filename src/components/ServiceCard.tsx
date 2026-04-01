interface ServiceCardProps {
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  tags: string[];
  retouches?: { label: string; price: string }[];
  variations?: { label: string; price: string }[];
  note?: string;
  onSchedule: (variation?: string) => void;
}

const ServiceCard = ({
  title,
  shortDescription,
  fullDescription,
  price,
  tags,
  retouches,
  variations,
  note,
  onSchedule,
}: ServiceCardProps) => {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm animate-slide-up">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="font-heading text-2xl font-semibold text-foreground">{title}</h3>
        <p className="font-body text-sm text-rose font-medium">{shortDescription}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full text-xs font-body font-medium bg-secondary text-muted-foreground border border-border"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Full description */}
      <p className="font-body text-sm text-muted-foreground leading-relaxed">{fullDescription}</p>

      {/* Variations */}
      {variations && (
        <div className="space-y-2">
          <p className="font-body text-xs tracking-widest uppercase text-gold">Opções</p>
          <div className="space-y-2">
            {variations.map((v) => (
              <button
                key={v.label}
                onClick={() => onSchedule(v.label)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-gold/50 bg-background transition-all duration-300"
              >
                <span className="font-body text-sm font-medium text-foreground">{v.label}</span>
                <span className="font-body text-sm font-semibold text-gold">{v.price}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Retouches */}
      {retouches && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="font-body text-xs tracking-widest uppercase text-muted-foreground">Retoque</p>
          <div className="space-y-1">
            {retouches.map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="font-body text-sm text-muted-foreground">{r.label}</span>
                <span className="font-body text-sm font-medium text-foreground">{r.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      {note && (
        <p className="font-body text-xs text-muted-foreground italic bg-secondary/50 p-3 rounded-lg">
          {note}
        </p>
      )}

      {/* Price & CTA */}
      {!variations && (
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="font-body text-xs text-muted-foreground">A partir de</p>
            <p className="font-heading text-2xl font-bold text-foreground">{price}</p>
          </div>
          <button
            onClick={() => onSchedule()}
            className="px-6 py-3 rounded-lg bg-rose text-primary-foreground font-body text-sm font-medium tracking-wide uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          >
            Agendar
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;
