import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GuidedFlow from "@/components/GuidedFlow";
import ProfileScreen from "@/components/ProfileScreen";

const Agendar = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSelectService = (serviceId: string) => {
    navigate(`/servicos?filtro=${serviceId}`);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md lg:max-w-3xl">
      <GuidedFlow
        onSelectService={handleSelectService}
        onBack={() => navigate("/")}
        onProfile={() => setIsProfileOpen(true)}
      />

      {isProfileOpen && (
        <ProfileScreen
          onBack={() => setIsProfileOpen(false)}
          onLogout={() => {
            setIsProfileOpen(false);
            navigate("/");
          }}
        />
      )}
    </div>
  );
};

export default Agendar;
