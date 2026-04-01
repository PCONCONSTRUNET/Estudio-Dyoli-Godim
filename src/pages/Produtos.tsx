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
                    <MessageCircle className="w-3.5 h-3.5" />
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
