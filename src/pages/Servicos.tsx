import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ServiceList from "@/components/ServiceList";

const Servicos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filtro = searchParams.get("filtro") || "";

  const handleSchedule = (service: string, variation?: string) => {
    const params = new URLSearchParams({ servico: service });
    if (variation) params.set("variacao", variation);
    navigate(`/confirmar?${params.toString()}`);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <ServiceList
        serviceFilter={filtro}
        onSchedule={handleSchedule}
        onBack={() => navigate("/agendar")}
      />
    </div>
  );
};

export default Servicos;
