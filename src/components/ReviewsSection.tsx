import { Star } from "lucide-react";

interface Review {
  name: string;
  city: string;
  rating: number;
  text: string;
}

const reviews: Review[] = [
  {
    name: "Mariana S.",
    city: "Goiânia",
    rating: 5,
    text: "Resultado impecável! Sobrancelhas naturais e perfeitas. Super profissional.",
  },
  {
    name: "Camila R.",
    city: "Aparecida",
    rating: 5,
    text: "Ambiente higienizado e atendimento maravilhoso. Cicatrização tranquila.",
  },
  {
    name: "Juliana M.",
    city: "Goiânia",
    rating: 5,
    text: "Apaixonada pelo resultado! Cor linda e técnica perfeita. Me senti segura.",
  },
  {
    name: "Beatriz A.",
    city: "Anápolis",
    rating: 5,
    text: "Estúdio aconchegante e resultado que superou minhas expectativas.",
  },
  {
    name: "Larissa C.",
    city: "Goiânia",
    rating: 5,
    text: "Atendimento humanizado, atenciosa e cuidadosa. Sem complicações.",
  },
  {
    name: "Patrícia S.",
    city: "Trindade",
    rating: 4,
    text: "Trabalho de altíssima qualidade. Naturalidade e durabilidade excelentes.",
  },
];

const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

const ReviewsSection = () => {
  return (
    <section className="relative w-full py-10 bg-charcoal">
      {/* Header */}
      <div className="px-6 mb-4 lg:px-16 flex items-end justify-between">
        <div>
          <p className="font-body text-[10px] text-gold/70 tracking-[0.25em] uppercase">
            Avaliações
          </p>
          <p className="font-heading text-xl font-semibold text-primary-foreground tracking-wide mt-1 lg:text-2xl">
            {avgRating} · {reviews.length * 40}+ clientes
          </p>
        </div>
        <p className="font-body text-[11px] text-primary-foreground/50 tracking-wide italic">
          deslize →
        </p>
      </div>

      {/* Cards horizontal scroll */}
      <div
        className="flex gap-3 overflow-x-auto scrollbar-hide px-6 lg:px-16 pb-4 snap-x snap-mandatory"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          scrollPaddingLeft: "1.5rem",
        }}
      >
        {reviews.map((review, idx) => (
          <article
            key={idx}
            className="snap-start shrink-0 w-[72vw] max-w-[280px] lg:w-[300px] rounded-xl bg-primary-foreground/[0.03] border border-gold/[0.15] p-4"
          >
            {/* Header: avatar + nome/cidade + stars */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center">
                  <span className="font-body text-[13px] font-bold text-charcoal">
                    {review.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-body text-[13px] font-semibold text-primary-foreground truncate">
                    {review.name}
                  </p>
                  <p className="font-body text-[10px] text-primary-foreground/50 truncate">
                    {review.city}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < review.rating
                        ? "fill-gold text-gold"
                        : "fill-primary-foreground/10 text-primary-foreground/10"
                    }`}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            </div>

            {/* Text */}
            <p className="font-body text-[12.5px] leading-relaxed text-primary-foreground/75">
              {review.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ReviewsSection;
