import { useState } from "react";
import { ArrowLeft, Calendar, Clock, CheckCircle2 } from "lucide-react";

interface BookingFlowProps {
  service: string;
  variation?: string;
  onBack: () => void;
  onConfirm: () => void;
}

const BookingFlow = ({ service, variation, onBack, onConfirm }: BookingFlowProps) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<"date" | "confirm">("date");

  // Horário de atendimento por dia da semana (0=Dom, 1=Seg, ..., 6=Sáb)
  const businessHours: Record<number, { open: string; close: string } | null> = {
    0: null,                          // Domingo — Fechada
    1: null,                          // Segunda — Fechada
    2: { open: "09:00", close: "19:00" }, // Terça
    3: null,                          // Quarta — Fechada
    4: { open: "09:00", close: "19:00" }, // Quinta
    5: { open: "09:00", close: "19:00" }, // Sexta
    6: null,                          // Sábado — Fechada
  };

  const generateTimes = (open: string, close: string) => {
    const result: string[] = [];
    const [oh, om] = open.split(":").map(Number);
    const [ch] = close.split(":").map(Number);
    for (let h = oh; h < ch; h++) {
      result.push(`${String(h).padStart(2, "0")}:${String(om).padStart(2, "0")}`);
    }
    return result;
  };

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const isDayOpen = (d: Date) => businessHours[d.getDay()] !== null;

  const getTimesForDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const hours = businessHours[d.getDay()];
    if (!hours) return [];
    return generateTimes(hours.open, hours.close);
  };

  const times = selectedDate ? getTimesForDate(selectedDate) : [];

  const formatDate = (d: Date) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return {
      day: days[d.getDay()],
      date: d.getDate().toString(),
      month: months[d.getMonth()],
      full: d.toISOString().split("T")[0],
    };
  };

  const getPrice = () => {
    if (variation === "Básica") return "R$ 170";
    if (variation === "Padrão") return "R$ 180";
    if (variation === "Premium") return "R$ 300";
    if (service.includes("Fio")) return "R$ 550";
    if (service.includes("Labial")) return "R$ 480";
    return "R$ 170";
  };

  const price = getPrice();
  const numericPrice = parseInt(price.replace(/\D/g, ""));
  const requiresDeposit = numericPrice > 300;
  const depositAmount = requiresDeposit ? `R$ ${Math.round(numericPrice * 0.3)}` : null;

  if (step === "confirm") {
    return (
      <section className="min-h-screen bg-background px-6 py-8 flex flex-col">
        <button
          onClick={() => setStep("date")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-sm">Voltar</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-gold mb-6" />
          <h2 className="font-heading text-3xl font-semibold text-foreground mb-2">
            Quase lá!
          </h2>
          <p className="font-body text-sm text-muted-foreground mb-8 max-w-xs">
            Confirme os detalhes do seu agendamento
          </p>

          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 space-y-4 text-left">
            <div>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Serviço</p>
              <p className="font-body text-sm font-medium text-foreground">
                {service}{variation ? ` — ${variation}` : ""}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Data</p>
                <p className="font-body text-sm font-medium text-foreground">{selectedDate}</p>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Horário</p>
                <p className="font-body text-sm font-medium text-foreground">{selectedTime}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <p className="font-body text-sm text-muted-foreground">Valor total</p>
                <p className="font-heading text-xl font-bold text-foreground">{price}</p>
              </div>
              {requiresDeposit && depositAmount && (
                <div className="flex justify-between items-center mt-1">
                  <p className="font-body text-xs text-rose">Sinal obrigatório (30%)</p>
                  <p className="font-body text-sm font-semibold text-rose">{depositAmount}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-secondary/50 max-w-sm">
            <p className="font-body text-xs text-muted-foreground">
              ⚠ Cancelamentos devem ser feitos com no mínimo 24h de antecedência. Caso contrário, o sinal não será reembolsado.
            </p>
          </div>
        </div>

        <div className="pt-6 pb-4">
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-lg bg-rose text-primary-foreground font-body font-medium text-sm tracking-wide uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-rose/20"
          >
            Confirmar Agendamento
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-background px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-body text-sm">Voltar</span>
      </button>

      <div className="space-y-2 mb-6">
        <p className="font-body text-xs tracking-widest uppercase text-gold">Agendamento</p>
        <h2 className="font-heading text-3xl font-semibold text-foreground">
          Escolha a data
        </h2>
        <p className="font-body text-sm text-muted-foreground">
          {service}{variation ? ` — ${variation}` : ""}
        </p>
      </div>

      {/* Date picker */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gold" />
          <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">Selecione o dia</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {dates.map((d) => {
            const info = formatDate(d);
            const isWeekend = d.getDay() === 0;
            if (isWeekend) return null;
            return (
              <button
                key={info.full}
                onClick={() => setSelectedDate(info.full)}
                className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all duration-200 ${
                  selectedDate === info.full
                    ? "border-rose bg-rose/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-gold/30"
                }`}
              >
                <p className="font-body text-xs">{info.day}</p>
                <p className="font-heading text-lg font-semibold">{info.date}</p>
                <p className="font-body text-xs">{info.month}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time picker */}
      {selectedDate && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gold" />
            <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">Selecione o horário</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`py-3 rounded-xl border text-center font-body text-sm transition-all duration-200 ${
                  selectedTime === t
                    ? "border-rose bg-rose/10 text-foreground font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-gold/30"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Continue button */}
      {selectedDate && selectedTime && (
        <div className="mt-8 animate-fade-in">
          <button
            onClick={() => setStep("confirm")}
            className="w-full py-4 rounded-lg bg-rose text-primary-foreground font-body font-medium text-sm tracking-wide uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-rose/20"
          >
            Continuar
          </button>
        </div>
      )}
    </section>
  );
};

export default BookingFlow;
