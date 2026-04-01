import { useNavigate, useSearchParams } from "react-router-dom";
import BookingFlow from "@/components/BookingFlow";

const Confirmar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const servico = searchParams.get("servico") || "";
  const variacao = searchParams.get("variacao") || undefined;

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <BookingFlow
        service={servico}
        variation={variacao}
        onBack={() => navigate(-1 as any)}
        onConfirm={() => navigate("/sucesso")}
      />
    </div>
  );
};

export default Confirmar;
