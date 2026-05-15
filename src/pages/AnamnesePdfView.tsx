import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AnamnesePdfView() {
  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Ficha de Anamnese — Dyoli";
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("anamneses")
        .select("pdf_path, pdf_url, cliente_nome")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        setErro("Ficha não encontrada");
        return;
      }
      if (data.cliente_nome) document.title = `Anamnese — ${data.cliente_nome}`;
      if (data.pdf_path) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("anamneses")
          .createSignedUrl(data.pdf_path, 60 * 30);
        if (signErr || !signed) {
          setErro("Não foi possível gerar o link do PDF");
          return;
        }
        setUrl(signed.signedUrl);
        return;
      }
      if (data.pdf_url) {
        setUrl(data.pdf_url);
        return;
      }
      setErro("Esta ficha não possui PDF anexado");
    })();
  }, [id]);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">Ficha de Anamnese</h1>
          <p className="text-muted-foreground">{erro}</p>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Carregando ficha...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      <iframe
        src={url}
        title="Ficha de Anamnese"
        className="w-full h-full border-0"
      />
    </div>
  );
}
