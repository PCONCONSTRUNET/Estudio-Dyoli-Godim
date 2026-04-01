import { useNavigate, useSearchParams } from "react-router-dom";
import AuthScreen from "@/components/AuthScreen";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "login" ? "login" : "signup";

  return (
    <div className="mx-auto min-h-screen">
      <AuthScreen
        onSuccess={() => navigate("/agendar")}
        onBack={() => navigate("/")}
        initialMode={mode}
      />
    </div>
  );
};

export default Auth;
