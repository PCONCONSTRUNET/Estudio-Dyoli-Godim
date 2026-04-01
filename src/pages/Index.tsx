import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import GuidedFlow from "@/components/GuidedFlow";
import ServiceList from "@/components/ServiceList";
import BookingFlow from "@/components/BookingFlow";
import SuccessScreen from "@/components/SuccessScreen";

type Screen = "home" | "guided" | "services" | "booking" | "success";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedService, setSelectedService] = useState("");
  const [selectedVariation, setSelectedVariation] = useState<string | undefined>();
  const [serviceFilter, setServiceFilter] = useState("");

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
      {screen === "home" && (
        <HeroSection
          onSchedule={() => setScreen("guided")}
          onLogin={() => {}}
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
