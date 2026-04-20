import { useNavigate, useSearchParams } from "react-router-dom";
import BookingFlow from "@/components/BookingFlow";

const Confirmar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const servico = searchParams.get("servico") || "";
  const variacao = searchParams.get("variacao") || undefined;

  // O BookingFlow já cria o agendamento e dispara o webhook de confirmação.
  // Aqui só navegamos para a tela de sucesso, evitando insert duplicado.
  const handleConfirm = async () => {
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
