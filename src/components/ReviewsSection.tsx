import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  name: string;
  city: string;
  rating: number;
  text: string;
  isReal?: boolean;
}

// Sem mocks: apenas avaliações reais salvas em `avaliacoes`.

const CARD_STEP = 238;

// Formata "Maria Silva Souza" -> "Maria S."
const formatClientName = (full: string): string => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
};

const ReviewsSection = () => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [leftLimit, setLeftLimit] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [realReviews, setRealReviews] = useState<Review[]>([]);

  // Carrega avaliações reais (4-5 estrelas, com comentário) e mescla com as estáticas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("nota, comentario, user_id, created_at")
        .gte("nota", 4)
        .not("comentario", "is", null)
        .neq("comentario", "")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data || cancelled) return;

      const userIds = Array.from(new Set(data.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", userIds);

      if (cancelled) return;

      const nameMap = new Map<string, string>();
      (profs || []).forEach((p) => nameMap.set(p.id, p.nome));

      const mapped: Review[] = data
        .filter((r) => (r.comentario || "").trim().length > 0)
        .map((r) => ({
          name: formatClientName(nameMap.get(r.user_id) || "Cliente"),
          city: "",
          rating: r.nota,
          text: r.comentario || "",
          isReal: true,
        }));

      setRealReviews(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  // Apenas avaliações reais
  const reviews = realReviews;
  const totalCount = realReviews.length;
  const avgRating = useMemo(
    () => (reviews.reduce((s, r) => s + r.rating, 0) / Math.max(reviews.length, 1)).toFixed(1),
    [reviews]
  );

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

  useEffect(() => {
    measure();
  }, [measure, reviews.length]);

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
            {avgRating} · {totalCount}+ clientes
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
              className="shrink-0 w-[210px] sm:w-[225px] rounded-[20px] bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] backdrop-blur-xl px-3 py-2.5 shadow-lg"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold/60">
                    <span className="font-body text-[11px] font-bold text-charcoal">{review.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-body text-[12px] font-semibold text-primary-foreground leading-tight">{review.name}</p>
                    <p className="truncate font-body text-[9px] text-primary-foreground/50 leading-tight">
                      {review.isReal ? "✨ Cliente Dyoli" : review.city}
                    </p>
                  </div>
                </div>
                <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-2 w-2 ${
                        i < review.rating ? "fill-gold text-gold" : "fill-primary-foreground/10 text-primary-foreground/10"
                      }`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>

              <p className="font-body text-[11px] leading-snug text-primary-foreground/75 line-clamp-3">{review.text}</p>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ReviewsSection;
