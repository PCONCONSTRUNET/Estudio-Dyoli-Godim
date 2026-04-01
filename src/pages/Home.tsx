import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleScheduleClick = () => {
    if (isAuthenticated) {
      navigate("/agendar");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  const handleLoginClick = () => {
    if (isAuthenticated) {
      navigate("/agendar");
    } else {
      navigate("/auth?mode=login");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <HeroSection onSchedule={handleScheduleClick} onLogin={handleLoginClick} />
    </div>
  );
};

export default Home;
