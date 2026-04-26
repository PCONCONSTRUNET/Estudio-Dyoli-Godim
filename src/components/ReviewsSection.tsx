import { useCallback, useEffect, useRef, useState } from "react";
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
  const offsetRef = useRef(0);
  const maxOffsetRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0, pointerId: -1, moved: false });
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = useCallback((value: number) => Math.min(0, Math.max(maxOffsetRef.current, value)), []);

  const applyOffset = useCallback((value: number, animate = false) => {
    const next = clamp(value);
    offsetRef.current = next;
    setOffset(next);

    const track = trackRef.current;
    if (track) {
      track.style.transition = animate ? "transform 180ms ease-out" : "none";
      track.style.transform = `translate3d(${next}px, 0, 0)`;
    }
  }, [clamp]);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const nextMax = Math.min(0, viewport.clientWidth - track.scrollWidth);
    maxOffsetRef.current = nextMax;
    setMaxOffset(nextMax);
    applyOffset(offsetRef.current);
  }, [applyOffset]);

  useEffect(() => {
    measure();
    const resizeObserver = new ResizeObserver(measure);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);
    if (trackRef.current) resizeObserver.observe(trackRef.current);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startOffset: offsetRef.current,
      pointerId: event.pointerId,
      moved: false,
    };

    track.style.transition = "none";
    viewport.setPointerCapture(event.pointerId);
    setIsDragging(true);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 2) drag.moved = true;
    applyOffset(drag.startOffset + delta);
    event.preventDefault();
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    drag.active = false;
    setIsDragging(false);
  };

  const handleClickCapture = (event: React.MouseEvent) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  };

  const slideBy = (direction: "prev" | "next") => {
    applyOffset(offsetRef.current + (direction === "prev" ? CARD_STEP : -CARD_STEP), true);
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
            disabled={offset >= 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => slideBy("next")}
            aria-label="Próximas avaliações"
            className="ios-press flex h-7 w-7 items-center justify-center rounded-full border border-primary-foreground/10 bg-primary-foreground/5 text-primary-foreground/70 disabled:opacity-30"
            disabled={offset <= maxOffset}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onClickCapture={handleClickCapture}
        className={`relative overflow-hidden ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "pan-y", userSelect: "none" }}
      >
        <div ref={trackRef} className="flex w-max gap-3 pb-2 will-change-transform">
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
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
