import { useNavigate } from "react-router-dom";
import SuccessScreen from "@/components/SuccessScreen";

const Sucesso = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <SuccessScreen onHome={() => navigate("/")} />
    </div>
  );
};

export default Sucesso;
