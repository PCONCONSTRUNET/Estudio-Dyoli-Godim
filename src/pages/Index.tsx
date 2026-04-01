import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import AuthScreen from "@/components/AuthScreen";
import GuidedFlow from "@/components/GuidedFlow";
import ServiceList from "@/components/ServiceList";
import BookingFlow from "@/components/BookingFlow";
import SuccessScreen from "@/components/SuccessScreen";
import ProfileScreen from "@/components/ProfileScreen";

type Screen = "home" | "auth" | "guided" | "services" | "booking" | "success" | "profile";

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

  const handleConfirm = async (bookingData?: { date: string; time: string; price: number; paidAmount: number }) => {
    if (bookingData) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("agendamentos").insert({
          user_id: user.id,
          servico: selectedService,
          variacao: selectedVariation || null,
          data_agendamento: bookingData.date,
          horario: bookingData.time,
          valor: bookingData.price,
          valor_pago: bookingData.paidAmount,
          forma_pagamento: "pix",
          status: "confirmado",
        });
      }
    }
    setScreen("success");
  };

  return (
    <div className="max-w-md mx-auto min-h-screen">
      {(screen === "home" || screen === "auth" || screen === "success" || screen === "profile") && (
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
          onConfirm={handleConfirm}
        />
      )}
      {screen === "success" && (
        <SuccessScreen
          onHome={() => setScreen("home")}
          onProfile={() => setScreen("profile")}
        />
      )}
      {screen === "profile" && (
        <ProfileScreen
          onBack={() => setScreen("home")}
          onLogout={() => setScreen("home")}
        />
      )}
    </div>
  );
};

export default Index;