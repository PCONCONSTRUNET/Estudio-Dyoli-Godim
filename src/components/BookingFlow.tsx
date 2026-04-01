import { useState } from "react";
import { ArrowLeft, Calendar, Clock, CheckCircle2, Copy, Check, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface BookingFlowProps {
  service: string;
  variation?: string;
  onBack: () => void;
  onConfirm: () => void;
}

const BookingFlow = ({ service, variation, onBack, onConfirm }: BookingFlowProps) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [step, setStep] = useState<"date" | "confirm" | "pix">("date");
  const [copied, setCopied] = useState(false);

  const PIX_KEY = "48999779829";
  const PIX_NAME = "DYOLI GODIM";
  const PIX_CITY = "BRASIL";

  const generatePixPayload = (amount: number) => {
    const pad = (id: string, val: string) => {
      const len = val.length.toString().padStart(2, "0");
      return `${id}${len}${val}`;
    };

    const gui = pad("00", "br.gov.bcb.pix");
    const key = pad("01", PIX_KEY);
    const merchantAccount = pad("26", gui + key);
    const mcc = pad("52", "0000");
    const currency = pad("53", "986");
    const amountStr = pad("54", amount.toFixed(2));
    const country = pad("58", "BR");
    const name = pad("59", PIX_NAME);
    const city = pad("60", PIX_CITY);
    const txid = pad("05", "***");
    const additionalData = pad("62", txid);

    const payloadWithoutCRC = pad("00", "01") + merchantAccount + mcc + currency + amountStr + country + name + city + additionalData + "6304";

    // CRC16-CCITT
    let crc = 0xFFFF;
    for (let i = 0; i < payloadWithoutCRC.length; i++) {
      crc ^= payloadWithoutCRC.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    return payloadWithoutCRC + crc.toString(16).toUpperCase().padStart(4, "0");
  };


  const businessHours: Record<number, { open: string; close: string } | null> = {
    0: null,
    1: null,
    2: { open: "09:00", close: "19:00" },
    3: null,
    4: { open: "09:00", close: "19:00" },
    5: { open: "09:00", close: "19:00" },
    6: null,
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
          className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-[14px]">Voltar</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-gold" />
          </div>
          <h2 className="font-heading text-3xl font-semibold text-foreground mb-2">
            Quase lá!
          </h2>
          <p className="font-body text-[13px] text-muted-foreground mb-8 max-w-xs">
            Confirme os detalhes do seu agendamento
          </p>

          <div className="w-full max-w-sm bg-card/80 backdrop-blur-sm rounded-3xl border border-border/60 p-6 space-y-4 text-left">
            <div>
              <p className="font-body text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Serviço</p>
              <p className="font-body text-[14px] font-medium text-foreground mt-0.5">
                {service}{variation ? ` — ${variation}` : ""}
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="font-body text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Data</p>
                <p className="font-body text-[14px] font-medium text-foreground mt-0.5">{selectedDate}</p>
              </div>
              <div>
                <p className="font-body text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Horário</p>
                <p className="font-body text-[14px] font-medium text-foreground mt-0.5">{selectedTime}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/40">
              <div className="flex justify-between items-center">
                <p className="font-body text-[13px] text-muted-foreground">Valor total</p>
                <p className="font-heading text-xl font-bold text-foreground">{price}</p>
              </div>
              {requiresDeposit && depositAmount && (
                <div className="flex justify-between items-center mt-1.5">
                  <p className="font-body text-[12px] text-rose font-medium">Sinal obrigatório (30%)</p>
                  <p className="font-body text-[14px] font-semibold text-rose">{depositAmount}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-2xl bg-secondary/30 backdrop-blur-sm border border-border/30 max-w-sm">
            <p className="font-body text-[12px] text-muted-foreground leading-relaxed">
              ⚠ Cancelamentos devem ser feitos com no mínimo 24h de antecedência. Caso contrário, o sinal não será reembolsado.
            </p>
          </div>
        </div>

        <div className="pt-6 pb-4 space-y-3">
          <button
            onClick={() => setStep("pix")}
            className="ios-press w-full py-4 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] transition-all duration-200 flex items-center justify-center gap-2.5"
          >
            <QrCode className="w-5 h-5" />
            Pagar com PIX
          </button>
        </div>
      </section>
    );
  }

  // PIX payment screen
  if (step === "pix") {
    const paymentLabel = requiresDeposit ? `Sinal de ${depositAmount}` : `Total: ${price}`;
    return (
      <section className="min-h-screen bg-background px-6 py-8 flex flex-col">
        <button
          onClick={() => setStep("confirm")}
          className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-[14px]">Voltar</span>
        </button>

        <div className="flex-1 flex flex-col items-center text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <QrCode className="w-7 h-7 text-gold" />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-1">
            Pagamento PIX
          </h2>
          <p className="font-body text-[13px] text-muted-foreground mb-6">
            {paymentLabel}
          </p>

          {/* QR Code */}
          <div className="bg-white p-5 rounded-3xl shadow-[0_4px_24px_-6px_rgba(0,0,0,0.1)] mb-6">
            <QRCodeSVG
              value={pixPayload}
              size={220}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#1C1C1C"
            />
          </div>

          {/* PIX Copia e Cola */}
          <div className="w-full max-w-sm space-y-3">
            <p className="font-body text-[11px] text-muted-foreground uppercase tracking-widest font-medium">PIX Copia e Cola</p>
            <div className="relative">
              <div className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border text-left font-body text-[12px] text-foreground/70 break-all leading-relaxed pr-14 max-h-24 overflow-y-auto scrollbar-hide">
                {pixPayload}
              </div>
              <button
                onClick={handleCopyPix}
                className="ios-press absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold hover:bg-gold/20 transition-all duration-200"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && (
              <p className="font-body text-[12px] text-gold font-medium animate-fade-in">
                ✓ Código copiado!
              </p>
            )}
          </div>

          {/* Info */}
          <div className="mt-6 p-3.5 rounded-2xl bg-secondary/30 backdrop-blur-sm border border-border/30 max-w-sm">
            <p className="font-body text-[12px] text-muted-foreground leading-relaxed">
              Após o pagamento, clique em "Confirmar" abaixo. Seu agendamento será validado automaticamente.
            </p>
          </div>
        </div>

        <div className="pt-6 pb-4">
          <button
            onClick={onConfirm}
            className="ios-press w-full py-4 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] transition-all duration-200"
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
        className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-body text-[14px]">Voltar</span>
      </button>

      <div className="space-y-2 mb-6">
        <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">Agendamento</p>
        <h2 className="font-heading text-3xl font-semibold text-foreground">
          Escolha a data
        </h2>
        <p className="font-body text-[13px] text-muted-foreground">
          {service}{variation ? ` — ${variation}` : ""}
        </p>
      </div>

      {/* Date picker */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gold" />
          <span className="font-body text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Selecione o dia</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {dates.map((d) => {
            const info = formatDate(d);
            if (!isDayOpen(d)) return null;
            const isSelected = selectedDate === info.full;
            return (
              <button
                key={info.full}
                onClick={() => setSelectedDate(info.full)}
                className={`ios-press flex-shrink-0 w-[68px] py-3.5 rounded-2xl border text-center transition-all duration-200 ${
                  isSelected
                    ? "border-rose/60 bg-rose/10 text-foreground shadow-[0_2px_12px_-3px_hsl(340_30%_50%/0.25)]"
                    : "border-border/50 bg-card/60 backdrop-blur-sm text-muted-foreground hover:border-gold/30 hover:bg-card/80"
                }`}
              >
                <p className="font-body text-[11px] font-medium">{info.day}</p>
                <p className="font-heading text-lg font-semibold mt-0.5">{info.date}</p>
                <p className="font-body text-[10px] mt-0.5">{info.month}</p>
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
            <span className="font-body text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Selecione o horário</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {times.map((t) => {
              const isSelected = selectedTime === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`ios-press py-3 rounded-2xl border text-center font-body text-[14px] transition-all duration-200 ${
                    isSelected
                      ? "border-rose/60 bg-rose/10 text-foreground font-semibold shadow-[0_2px_12px_-3px_hsl(340_30%_50%/0.25)]"
                      : "border-border/50 bg-card/60 backdrop-blur-sm text-muted-foreground hover:border-gold/30 hover:bg-card/80"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue button */}
      {selectedDate && selectedTime && (
        <div className="mt-8 animate-fade-in">
          <button
            onClick={() => setStep("confirm")}
            className="ios-press w-full py-4 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] transition-all duration-200"
          >
            Continuar
          </button>
        </div>
      )}
    </section>
  );
};

export default BookingFlow;