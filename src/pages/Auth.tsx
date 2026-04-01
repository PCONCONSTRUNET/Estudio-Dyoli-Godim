import { useNavigate } from "react-router-dom";
import AuthScreen from "@/components/AuthScreen";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <AuthScreen
        onSuccess={() => navigate("/agendar")}
        onBack={() => navigate("/")}
      />
    </div>
  );
};

export default Auth;
