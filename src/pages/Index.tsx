import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import AuthScreen from "@/components/AuthScreen";
import GuidedFlow from "@/components/GuidedFlow";
import ServiceList from "@/components/ServiceList";
import BookingFlow from "@/components/BookingFlow";
import SuccessScreen from "@/components/SuccessScreen";

type Screen = "home" | "auth" | "guided" | "services" | "booking" | "success";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedService, setSelectedService] = useState("");
  const [selectedVariation, setSelectedVariation] = useState<string | undefined>();
  const [serviceFilter, setServiceFilter] = useState("");
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
      setScreen("guided");
    } else {
      setScreen("auth");
    }
  };

  const handleLoginClick = () => {
    if (isAuthenticated) {
      setScreen("guided");
    } else {
      setScreen("auth");
    }
  };

  const handleAuthSuccess = () => {
    setScreen("guided");
  };

  const handleSelectService = (serviceId: string) => {
    setServiceFilter(serviceId);
    setScreen("services");
  };

  const handleSchedule = (service: string, variation?: string) => {
    setSelectedService(service);
    setSelectedVariation(variation);
    setScreen("booking");
  };

  return (
    <div className="max-w-md mx-auto min-h-screen">
      {(screen === "home" || screen === "auth" || screen === "success") && (
        <HeroSection
          onSchedule={handleScheduleClick}
          onLogin={handleLoginClick}
        />
      )}
      {screen === "auth" && (
        <AuthScreen
          onSuccess={handleAuthSuccess}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "guided" && (
        <GuidedFlow
          onSelectService={handleSelectService}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "services" && (
        <ServiceList
          serviceFilter={serviceFilter}
          onSchedule={handleSchedule}
          onBack={() => setScreen("guided")}
        />
      )}
      {screen === "booking" && (
        <BookingFlow
          service={selectedService}
          variation={selectedVariation}
          onBack={() => setScreen("services")}
          onConfirm={() => setScreen("success")}
        />
      )}
      {screen === "success" && (
        <SuccessScreen onHome={() => setScreen("home")} />
      )}
    </div>
  );
};

export default Index;
