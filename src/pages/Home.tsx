import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import ReviewsSection from "@/components/ReviewsSection";
import ProfileScreen from "@/components/ProfileScreen";

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="mx-auto min-h-screen">
      <HeroSection
        onSchedule={() => isAuthenticated ? navigate("/agendar") : navigate("/auth?mode=signup")}
        onLogin={() => navigate("/auth?mode=login")}
        onProfile={() => setShowProfile(true)}
        onProdutos={() => navigate("/produtos")}
        isAuthenticated={isAuthenticated}
      />
      <ReviewsSection />
      {showProfile && (
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={() => {
            setShowProfile(false);
            setIsAuthenticated(false);
          }}
        />
      )}
    </div>
  );
};

export default Home;
