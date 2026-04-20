import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BookingFlow from "@/components/BookingFlow";
import { notifyAgendamentoConfirmado } from "@/lib/notify-webhook";

const Confirmar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const servico = searchParams.get("servico") || "";
  const variacao = searchParams.get("variacao") || undefined;

  const handleConfirm = async (bookingData?: { date: string; time: string; price: number; paidAmount: number; durationMinutes: number }) => {
    if (bookingData) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("agendamentos").insert({
          user_id: user.id,
          servico,
          variacao: variacao || null,
          data_agendamento: bookingData.date,
          horario: bookingData.time,
          valor: bookingData.price,
          valor_pago: bookingData.paidAmount,
          forma_pagamento: "pix",
          status: "confirmado",
          duracao_minutos: bookingData.durationMinutes,
        });

        const { data: prof } = await supabase
          .from("profiles")
          .select("nome, whatsapp")
          .eq("id", user.id)
          .maybeSingle();
        notifyAgendamentoConfirmado({
          numero: prof?.whatsapp || "",
          nome: prof?.nome || user.user_metadata?.nome || "",
          data: bookingData.date,
          horario: bookingData.time,
        });
      }
    }
    navigate("/sucesso");
  };

  return (
    <div className="mx-auto min-h-screen max-w-md lg:max-w-2xl">
      <BookingFlow
        service={servico}
        variation={variacao}
        onBack={() => navigate(-1 as any)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default Confirmar;
