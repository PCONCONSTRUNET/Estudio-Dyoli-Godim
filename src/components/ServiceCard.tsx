import { ChevronRight } from "lucide-react";

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
    <div className="bg-card/80 backdrop-blur-sm rounded-3xl border border-border/60 p-6 space-y-5 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="space-y-1.5">
        <h3 className="font-heading text-2xl font-semibold text-foreground">{title}</h3>
        <p className="font-body text-[13px] text-rose font-medium">{shortDescription}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full text-[11px] font-body font-medium bg-secondary/60 text-muted-foreground border border-border/50 backdrop-blur-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Full description */}
      <p className="font-body text-[13px] text-muted-foreground leading-relaxed">{fullDescription}</p>

      {/* Variations */}
      {variations && (
        <div className="space-y-2.5">
          <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">Opções</p>
          <div className="space-y-2">
            {variations.map((v) => (
              <button
                key={v.label}
                onClick={() => onSchedule(v.label)}
                className="ios-press w-full flex items-center justify-between p-4 rounded-2xl border border-border/60 bg-background/60 backdrop-blur-sm hover:border-gold/40 hover:bg-background/80 transition-all duration-200 group"
              >
                <span className="font-body text-[14px] font-medium text-foreground">{v.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-body text-[14px] font-semibold text-gold">{v.price}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-gold/50 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Retouches */}
      {retouches && (
        <div className="space-y-2.5 pt-3 border-t border-border/40">
          <p className="font-body text-[11px] tracking-widest uppercase text-muted-foreground font-medium">Retoque</p>
          <div className="space-y-1.5">
            {retouches.map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="font-body text-[13px] text-muted-foreground">{r.label}</span>
                <span className="font-body text-[13px] font-medium text-foreground">{r.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      {note && (
        <div className="p-3.5 rounded-2xl bg-secondary/30 backdrop-blur-sm border border-border/30">
          <p className="font-body text-[12px] text-muted-foreground italic leading-relaxed">{note}</p>
        </div>
      )}

      {/* Price & CTA */}
      {!variations && (
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="font-body text-[11px] text-muted-foreground">A partir de</p>
            <p className="font-heading text-2xl font-bold text-foreground">{price}</p>
          </div>
          <button
            onClick={() => onSchedule()}
            className="ios-press px-7 py-3 rounded-2xl bg-rose text-primary-foreground font-body text-[14px] font-semibold tracking-wide shadow-[0_4px_16px_-4px_hsl(340_30%_50%/0.35)] transition-all duration-200"
          >
            Agendar
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;