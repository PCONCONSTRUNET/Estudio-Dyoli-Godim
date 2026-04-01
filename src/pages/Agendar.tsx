import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GuidedFlow from "@/components/GuidedFlow";

const Agendar = () => {
  const navigate = useNavigate();

  const handleSelectService = (serviceId: string) => {
    navigate(`/servicos?filtro=${serviceId}`);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <GuidedFlow
        onSelectService={handleSelectService}
        onBack={() => navigate("/")}
      />
    </div>
  );
};

export default Agendar;
