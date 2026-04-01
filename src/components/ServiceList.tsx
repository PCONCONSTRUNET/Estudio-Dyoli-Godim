import { ArrowLeft } from "lucide-react";
import ServiceCard from "./ServiceCard";

interface ServiceListProps {
  serviceFilter: string;
  onSchedule: (service: string, variation?: string) => void;
  onBack: () => void;
}

const ServiceList = ({ serviceFilter, onSchedule, onBack }: ServiceListProps) => {
  const services = {
    "fio-a-fio": (
      <ServiceCard
        title="Micropigmentação Fio a Fio"
        shortDescription="Sobrancelhas com efeito natural, desenhadas fio a fio"
        fullDescription="Técnica que implanta pigmento na pele criando fios delicados e naturais, proporcionando harmonia ao rosto."
        price="R$ 550"
        tags={["Natural", "Precisão", "Harmonia facial"]}
        retouches={[
          { label: "Retoque até 30 dias", price: "R$ 100" },
          { label: "Retoque após 40 dias", price: "R$ 120" },
        ]}
        onSchedule={(v) => onSchedule("Micropigmentação Fio a Fio", v)}
      />
    ),
    labial: (
      <ServiceCard
        title="Micropigmentação Labial"
        shortDescription="Define o contorno e realça a cor dos lábios"
        fullDescription="Procedimento que melhora o contorno e a coloração dos lábios, deixando-os mais uniformes e naturais."
        price="R$ 480"
        tags={["Natural", "Definição", "Uniformização"]}
        retouches={[
          { label: "Retoque até 30 dias", price: "R$ 100" },
          { label: "Retoque após 40 dias", price: "R$ 150" },
        ]}
        onSchedule={(v) => onSchedule("Micropigmentação Labial", v)}
      />
    ),
    perfuracao: (
      <ServiceCard
        title="Perfuração Corporal"
        shortDescription="Perfuração segura com joia em titânio"
        fullDescription="Procedimento realizado com material esterilizado e joias em titânio grau implante, garantindo segurança e biocompatibilidade."
        price="R$ 170"
        tags={["Seguro", "Higienizado", "Material premium"]}
        variations={[
          { label: "Básica", price: "R$ 170" },
          { label: "Padrão", price: "R$ 180" },
          { label: "Premium", price: "R$ 300" },
        ]}
        note="Possibilidade de escolha de outras joias no momento do atendimento (valores à parte)"
        onSchedule={(v) => onSchedule("Perfuração Corporal", v)}
      />
    ),
  };

  return (
    <section className="min-h-screen bg-background px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-body text-sm">Voltar</span>
      </button>

      <div className="space-y-2 mb-8">
        <p className="font-body text-xs tracking-widest uppercase text-gold">Serviço selecionado</p>
        <h2 className="font-heading text-3xl font-semibold text-foreground">Detalhes</h2>
      </div>

      <div className="space-y-6">
        {services[serviceFilter as keyof typeof services]}
      </div>
    </section>
  );
};

export default ServiceList;
