import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

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

const avgRating = (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
const CARD_STEP = 238;

const ReviewsSection = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [leftLimit, setLeftLimit] = useState(0);
  const [currentX, setCurrentX] = useState(0);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const nextLeftLimit = Math.min(0, viewport.clientWidth - track.scrollWidth);
    setLeftLimit(nextLeftLimit);
    const safeX = Math.max(nextLeftLimit, Math.min(0, x.get()));
    x.set(safeX);
    setCurrentX(safeX);
  }, [x]);

  useEffect(() => {
    measure();
    const resizeObserver = new ResizeObserver(measure);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (trackRef.current) resizeObserver.observe(trackRef.current);
    window.addEventListener("resize", measure);
    const unsubscribe = x.on("change", setCurrentX);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      unsubscribe();
    };
  }, [measure, x]);

  const slideBy = (direction: "prev" | "next") => {
    const next = Math.max(leftLimit, Math.min(0, x.get() + (direction === "prev" ? CARD_STEP : -CARD_STEP)));
    x.stop();
    x.set(next);
    setCurrentX(next);
  };

  return (
    <section className="relative w-full">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-body text-[10px] text-gold/70 tracking-[0.25em] uppercase">Avaliações</p>
          <p className="font-heading text-lg font-semibold text-primary-foreground tracking-wide mt-0.5">
            {avgRating} · {reviews.length * 40}+ clientes
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => slideBy("prev")}
            aria-label="Avaliações anteriores"
            className="ios-press flex h-7 w-7 items-center justify-center rounded-full border border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground/70 disabled:opacity-30"
            disabled={currentX >= -1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => slideBy("next")}
            aria-label="Próximas avaliações"
            className="ios-press flex h-7 w-7 items-center justify-center rounded-full border border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground/70 disabled:opacity-30"
            disabled={currentX <= leftLimit + 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="relative overflow-hidden cursor-grab active:cursor-grabbing">
        <motion.div
          ref={trackRef}
          drag="x"
          dragConstraints={{ left: leftLimit, right: 0 }}
          dragElastic={0.04}
          dragMomentum={false}
          style={{ x, touchAction: "pan-y" }}
          className="flex w-max gap-3 pb-2 select-none"
          onDragEnd={() => setCurrentX(x.get())}
        >
          {reviews.map((review, idx) => (
            <article
              key={idx}
              className="shrink-0 w-[225px] sm:w-[240px] rounded-[22px] bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] backdrop-blur-xl px-3.5 py-3 shadow-lg"
            >
              <div className="mb-2.5 flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold/60">
                    <span className="font-body text-[12px] font-bold text-charcoal">{review.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-body text-[12.5px] font-semibold text-primary-foreground">{review.name}</p>
                    <p className="truncate font-body text-[9.5px] text-primary-foreground/50">{review.city}</p>
                  </div>
                </div>
                <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-2.5 w-2.5 ${
                        i < review.rating ? "fill-gold text-gold" : "fill-primary-foreground/10 text-primary-foreground/10"
                      }`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>

              <p className="font-body text-[11.5px] leading-relaxed text-primary-foreground/75">{review.text}</p>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ReviewsSection;
