import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShoppingBag, MessageCircle } from "lucide-react";

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string;
  ativo: boolean;
}

const WHATSAPP_NUMBER = "5548999779829";

const Produtos = () => {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("produtos")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => {
        if (data) setProdutos(data as Produto[]);
        setLoading(false);
      });
  }, []);

  const handleWhatsApp = (produto: Produto) => {
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no produto: *${produto.nome}* (R$ ${produto.preco.toFixed(2).replace(".", ",")}). Gostaria de mais informações!`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-charcoal/95 backdrop-blur-xl border-b border-primary-foreground/[0.06]">
        <div className="mx-auto max-w-md lg:max-w-4xl flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="ios-press w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/[0.06] text-primary-foreground/50 hover:text-primary-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gold" />
            <h1 className="font-heading text-lg font-semibold text-primary-foreground">Produtos</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-md lg:max-w-4xl px-4 py-6 pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-10 h-10 text-primary-foreground/10 mx-auto mb-3" />
            <p className="font-body text-[14px] text-primary-foreground/30">Nenhum produto disponível no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
            {produtos.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.02] overflow-hidden transition-all hover:border-gold/20"
              >
                {/* Image */}
                <div className="aspect-square bg-primary-foreground/[0.03] overflow-hidden">
                  {p.imagem_url ? (
                    <img
                      src={p.imagem_url}
                      alt={p.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-primary-foreground/10" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <h3 className="font-body text-[13px] font-medium text-primary-foreground leading-snug line-clamp-2">
                    {p.nome}
                  </h3>
                  {p.descricao && (
                    <p className="font-body text-[11px] text-primary-foreground/40 leading-relaxed line-clamp-2">
                      {p.descricao}
                    </p>
                  )}
                  <p className="font-heading text-[16px] font-bold text-gold">
                    R$ {p.preco.toFixed(2).replace(".", ",")}
                  </p>
                  <button
                    onClick={() => handleWhatsApp(p)}
                    className="ios-press w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600/90 text-white font-body text-[12px] font-semibold hover:bg-green-600 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Produtos;
