import { useEffect, useRef } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let pointerId: number | null = null;

    const startDrag = (clientX: number) => {
      isDown = true;
      moved = false;
      startX = clientX;
      startScroll = el.scrollLeft;
      el.style.cursor = "grabbing";
    };

    const moveDrag = (clientX: number) => {
      if (!isDown) return;
      const dx = clientX - startX;
      if (Math.abs(dx) > 2) moved = true;
      el.scrollLeft = startScroll - dx;
    };

    const stopDrag = () => {
      if (!isDown) return;
      isDown = false;
      pointerId = null;
      el.style.cursor = "grab";
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId = e.pointerId;
      startDrag(e.clientX);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown || (pointerId !== null && e.pointerId !== pointerId)) return;
      moveDrag(e.clientX);
      if (moved) e.preventDefault();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId !== null && e.pointerId !== pointerId) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      stopDrag();
    };

    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
      }
    };

    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("dragstart", onDragStart);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return (
    <section className="relative w-full">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="font-body text-[10px] text-gold/70 tracking-[0.25em] uppercase">
            Avaliações
          </p>
          <p className="font-heading text-lg font-semibold text-primary-foreground tracking-wide mt-0.5">
            {avgRating} · {reviews.length * 40}+ clientes
          </p>
        </div>
        <p className="font-body text-[10px] text-primary-foreground/50 tracking-wide italic">
          arraste →
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6 lg:mx-0 lg:px-0 cursor-grab"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          scrollSnapType: "none",
          touchAction: "pan-x",
          userSelect: "none",
        }}
      >
        {reviews.map((review, idx) => (
          <article
            key={idx}
            className="shrink-0 w-[225px] sm:w-[240px] rounded-[22px] bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] backdrop-blur-xl px-3.5 py-3 shadow-[0_8px_24px_-14px_hsl(0_0%_0%/0.55)]"
          >
            <div className="mb-2.5 flex items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold/60">
                  <span className="font-body text-[12px] font-bold text-charcoal">
                    {review.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-body text-[12.5px] font-semibold text-primary-foreground">
                    {review.name}
                  </p>
                  <p className="truncate font-body text-[9.5px] text-primary-foreground/50">
                    {review.city}
                  </p>
                </div>
              </div>
              <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-2.5 w-2.5 ${
                      i < review.rating
                        ? "fill-gold text-gold"
                        : "fill-primary-foreground/10 text-primary-foreground/10"
                    }`}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            </div>

            <p className="font-body text-[11.5px] leading-relaxed text-primary-foreground/75">
              {review.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ReviewsSection;
