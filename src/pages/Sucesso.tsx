import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SuccessScreen from "@/components/SuccessScreen";
import ProfileScreen from "@/components/ProfileScreen";

const Sucesso = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="mx-auto min-h-screen">
      <SuccessScreen
        onHome={() => navigate("/")}
        onProfile={() => setShowProfile(true)}
      />
      {showProfile && (
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={() => navigate("/")}
        />
      )}
    </div>
  );
};

export default Sucesso;
