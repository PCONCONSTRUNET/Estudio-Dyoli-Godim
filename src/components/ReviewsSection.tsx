import { Star } from "lucide-react";

interface Review {
  name: string;
  rating: number;
  text: string;
  service: string;
}

const reviews: Review[] = [
  {
    name: "Mariana Silva",
    rating: 5,
    service: "Micropigmentação de Sobrancelhas",
    text: "Resultado impecável! A Dyoli é extremamente profissional e cuidadosa. Minhas sobrancelhas ficaram naturais e perfeitas.",
  },
  {
    name: "Camila Rocha",
    rating: 5,
    service: "Piercing na Orelha",
    text: "Ambiente super higienizado e atendimento maravilhoso. Cicatrização tranquila e sem dor. Recomendo demais!",
  },
  {
    name: "Juliana Mendes",
    rating: 5,
    service: "Lábios Aquarela",
    text: "Apaixonada pelo resultado! Cor linda, técnica perfeita. A Dyoli explica tudo no detalhe, me senti muito segura.",
  },
  {
    name: "Beatriz Almeida",
    rating: 5,
    service: "Micropigmentação",
    text: "Profissional excepcional. Estúdio aconchegante e o resultado superou minhas expectativas. Voltarei sempre!",
  },
  {
    name: "Larissa Costa",
    rating: 5,
    service: "Piercing no Nariz",
    text: "Atendimento humanizado, muito atenciosa e cuidadosa. Procedimento rápido e sem complicações. Adorei!",
  },
  {
    name: "Patrícia Souza",
    rating: 5,
    service: "Sobrancelhas Fio a Fio",
    text: "Trabalho de altíssima qualidade. Naturalidade incrível e durabilidade excelente. Indico de olhos fechados.",
  },
];

const ReviewsSection = () => {
  return (
    <section className="relative w-full py-10 bg-charcoal">
      <div className="px-6 mb-5 lg:px-16">
        <h2 className="font-heading text-2xl font-semibold text-primary-foreground tracking-wide lg:text-3xl">
          Avaliações
        </h2>
        <p className="font-body text-[11px] text-gold/70 tracking-[0.2em] uppercase mt-1">
          O que dizem nossas clientes
        </p>
      </div>

      <div
        className="flex gap-4 overflow-x-auto scrollbar-hide px-6 lg:px-16 pb-4 snap-x snap-mandatory"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          scrollPaddingLeft: "1.5rem",
        }}
      >
        {reviews.map((review, idx) => (
          <article
            key={idx}
            className="snap-start shrink-0 w-[78vw] max-w-[320px] lg:w-[340px] rounded-2xl bg-primary-foreground/[0.04] backdrop-blur-md border border-primary-foreground/[0.08] p-5 shadow-[0_4px_24px_-8px_hsl(0_0%_0%/0.5)]"
          >
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5 fill-gold text-gold"
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <p className="font-body text-[13px] leading-relaxed text-primary-foreground/85 mb-4 min-h-[80px]">
              "{review.text}"
            </p>
            <div className="pt-3 border-t border-primary-foreground/[0.08]">
              <p className="font-body text-[13px] font-semibold text-primary-foreground tracking-wide">
                {review.name}
              </p>
              <p className="font-body text-[10px] text-gold/70 tracking-[0.15em] uppercase mt-0.5">
                {review.service}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ReviewsSection;
