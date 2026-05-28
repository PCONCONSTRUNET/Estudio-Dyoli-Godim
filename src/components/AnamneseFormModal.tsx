import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ClipboardList, Pill } from "lucide-react";

export type AnamneseTipo = "labial" | "tatuagem" | "piercing";

interface Props {
 open: boolean;
 onClose: () => void;
 onSubmitted: () => void;
 tipo: AnamneseTipo;
 servico: string;
}

const tituloPorTipo: Record<AnamneseTipo, string> = {
 labial: "Anamnese — Micropigmentação Labial",
 tatuagem: "Anamnese — Tatuagem",
 piercing: "Anamnese — Piercing",
};

const AnamneseFormModal = ({ open, onClose, onSubmitted, tipo, servico }: Props) => {
 const [loading, setLoading] = useState(false);

 // Campos comuns
 const [idade, setIdade] = useState("");
 const [gestante, setGestante] = useState<"sim" | "nao" | "">("");
 const [amamentando, setAmamentando] = useState<"sim" | "nao" | "">("");
 const [alergia, setAlergia] = useState("");
 const [medicamentos, setMedicamentos] = useState("");
 const [doencas, setDoencas] = useState("");
 const [problemasPele, setProblemasPele] = useState("");
 const [cicatrizacao, setCicatrizacao] = useState<"normal" | "ruim" | "queloide" | "">("");
 const [aceitouAciclovir, setAceitouAciclovir] = useState(false);
 const [aceitouTermos, setAceitouTermos] = useState(false);

 // Específicos
 const [herpes, setHerpes] = useState<"sim" | "nao" | "">(""); // labial
 const [usoAnestesico, setUsoAnestesico] = useState<"sim" | "nao" | "">(""); // tatuagem/piercing
 const [localPiercing, setLocalPiercing] = useState(""); // piercing

 const reset = () => {
 setIdade("");
 setGestante("");
 setAmamentando("");
 setAlergia("");
 setMedicamentos("");
 setDoencas("");
 setProblemasPele("");
 setCicatrizacao("");
 setAceitouAciclovir(false);
 setAceitouTermos(false);
 setHerpes("");
 setUsoAnestesico("");
 setLocalPiercing("");
 };

 const handleSubmit = async () => {
 if (!idade || !gestante || !amamentando || !cicatrizacao || !aceitouTermos) {
 toast.error("Preencha todos os campos obrigatórios");
 return;
 }
 if (tipo === "labial" && (!herpes || !aceitouAciclovir)) {
 toast.error("Confirme as informações sobre herpes e o uso do Aciclovir");
 return;
 }
 if (tipo === "piercing" && !localPiercing.trim()) {
 toast.error("Informe o local do piercing");
 return;
 }

 setLoading(true);
 try {
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) {
 toast.error("Faça login para continuar");
 setLoading(false);
 return;
 }
 const { data: prof } = await supabase
 .from("profiles")
 .select("nome, whatsapp")
 .eq("id", user.id)
 .maybeSingle();

 const dados: Record<string, any> = {
 tipo,
 servico,
 idade,
 gestante,
 amamentando,
 alergia,
 medicamentos,
 doencas,
 problemas_pele: problemasPele,
 cicatrizacao,
 };
 if (tipo === "labial") {
 dados.historico_herpes = herpes;
 dados.aceitou_aciclovir = aceitouAciclovir;
 }
 if (tipo === "tatuagem" || tipo === "piercing") {
 dados.uso_anestesico = usoAnestesico;
 }
 if (tipo === "piercing") {
 dados.local_piercing = localPiercing;
 }

 const { error } = await supabase.from("anamneses").insert({
 user_id: user.id,
 cliente_nome: prof?.nome || user.user_metadata?.nome || "",
 whatsapp: prof?.whatsapp || "",
 dados,
 origem: "app",
 observacao: "",
 });
 if (error) throw error;

 toast.success("Ficha enviada! ✨");
 reset();
 onSubmitted();
 } catch (e: any) {
 console.error(e);
 toast.error("Erro ao enviar ficha");
 } finally {
 setLoading(false);
 }
 };

 const Radio = ({
 value, current, onChange, label,
 }: { value: string; current: string; onChange: (v: any) => void; label: string }) => (
 <button
 type="button"
 onClick={() => onChange(value)}
 className={`px-3 h-9 rounded-lg border text-[12px] font-body font-medium transition-all ${
 current === value
 ? "border-gold bg-gold/15 text-gold"
 : "border-border/60 bg-card text-foreground/70 hover:border-gold/40"
 }`}
 >
 {label}
 </button>
 );

 return (
 <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-border">
 <DialogHeader>
 <DialogTitle className="font-heading text-lg flex items-center gap-2">
 <ClipboardList className="w-5 h-5 text-gold" />
 {tituloPorTipo[tipo]}
 </DialogTitle>
 </DialogHeader>

 {tipo === "labial" && (
 <div className="rounded-2xl border border-rose/30 bg-rose/5 p-4 space-y-2">
 <div className="flex items-center gap-2 text-rose">
 <Pill className="w-4 h-4" />
 <p className="font-body text-[13px] font-semibold">Pré-procedimento obrigatório</p>
 </div>
 <p className="font-body text-[12px] text-foreground/80 leading-relaxed">
 Para realizar a <strong>Micropigmentação Labial</strong> é necessário fazer uso do medicamento{" "}
 <strong>Aciclovir</strong>, <strong>1 comprimido de 8 em 8 horas</strong>,{" "}
 começando <strong>3 dias antes</strong> do procedimento, para prevenir reativação de herpes labial.
 </p>
 <p className="font-body text-[11px] text-foreground/60">
 Consulte seu médico antes do uso. Sem essa preparação, o procedimento pode ser cancelado.
 </p>
 </div>
 )}

 <div className="space-y-4 mt-2">
 {/* Idade */}
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Idade *</label>
 <input
 value={idade}
 onChange={(e) => setIdade(e.target.value.replace(/\D/g, "").slice(0, 3))}
 inputMode="numeric"
 className="mt-1 w-full h-10 px-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-body focus:border-gold/60 focus:outline-none"
 placeholder="Ex: 28"
 />
 </div>

 {/* Gestante / amamentando */}
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Está gestante? *</label>
 <div className="flex gap-2 mt-1">
 <Radio value="nao" current={gestante} onChange={setGestante} label="Não" />
 <Radio value="sim" current={gestante} onChange={setGestante} label="Sim" />
 </div>
 </div>
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Está amamentando? *</label>
 <div className="flex gap-2 mt-1">
 <Radio value="nao" current={amamentando} onChange={setAmamentando} label="Não" />
 <Radio value="sim" current={amamentando} onChange={setAmamentando} label="Sim" />
 </div>
 </div>

 {/* Específicos */}
 {tipo === "labial" && (
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">
 Já teve herpes labial? *
 </label>
 <div className="flex gap-2 mt-1">
 <Radio value="nao" current={herpes} onChange={setHerpes} label="Não" />
 <Radio value="sim" current={herpes} onChange={setHerpes} label="Sim" />
 </div>
 </div>
 )}

 {tipo === "piercing" && (
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Local do piercing *</label>
 <input
 value={localPiercing}
 onChange={(e) => setLocalPiercing(e.target.value.slice(0, 80))}
 className="mt-1 w-full h-10 px-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-body focus:border-gold/60 focus:outline-none"
 placeholder="Ex: orelha, septo, umbigo..."
 />
 </div>
 )}

 {(tipo === "tatuagem" || tipo === "piercing") && (
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Já usou anestésico tópico antes?</label>
 <div className="flex gap-2 mt-1">
 <Radio value="nao" current={usoAnestesico} onChange={setUsoAnestesico} label="Não" />
 <Radio value="sim" current={usoAnestesico} onChange={setUsoAnestesico} label="Sim" />
 </div>
 </div>
 )}

 {/* Alergias / medicamentos / doenças */}
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Alergias (medicamentos, anestésicos, látex, metais...)</label>
 <textarea
 value={alergia}
 onChange={(e) => setAlergia(e.target.value.slice(0, 300))}
 rows={2}
 className="mt-1 w-full p-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-body focus:border-gold/60 focus:outline-none resize-none"
 placeholder="Liste alergias conhecidas ou escreva 'nenhuma'"
 />
 </div>
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Faz uso de medicamentos?</label>
 <textarea
 value={medicamentos}
 onChange={(e) => setMedicamentos(e.target.value.slice(0, 300))}
 rows={2}
 className="mt-1 w-full p-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-body focus:border-gold/60 focus:outline-none resize-none"
 placeholder="Quais? Há quanto tempo?"
 />
 </div>
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Possui alguma doença? (diabetes, hipertensão, autoimune...)</label>
 <textarea
 value={doencas}
 onChange={(e) => setDoencas(e.target.value.slice(0, 300))}
 rows={2}
 className="mt-1 w-full p-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-body focus:border-gold/60 focus:outline-none resize-none"
 placeholder="Descreva ou escreva 'nenhuma'"
 />
 </div>
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Problemas de pele na região? (acne ativa, ferida, eczema...)</label>
 <textarea
 value={problemasPele}
 onChange={(e) => setProblemasPele(e.target.value.slice(0, 300))}
 rows={2}
 className="mt-1 w-full p-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-body focus:border-gold/60 focus:outline-none resize-none"
 placeholder="Descreva ou escreva 'nenhum'"
 />
 </div>
 <div>
 <label className="font-body text-[12px] font-medium text-foreground/80">Como é sua cicatrização? *</label>
 <div className="flex flex-wrap gap-2 mt-1">
 <Radio value="normal" current={cicatrizacao} onChange={setCicatrizacao} label="Normal" />
 <Radio value="ruim" current={cicatrizacao} onChange={setCicatrizacao} label="Lenta / Ruim" />
 <Radio value="queloide" current={cicatrizacao} onChange={setCicatrizacao} label="Forma queloide" />
 </div>
 </div>

 {tipo === "labial" && (
 <label className="flex items-start gap-2 p-3 rounded-xl border border-border/60 bg-card cursor-pointer">
 <input
 type="checkbox"
 checked={aceitouAciclovir}
 onChange={(e) => setAceitouAciclovir(e.target.checked)}
 className="mt-0.5 accent-gold"
 />
 <span className="font-body text-[12px] text-foreground/80 leading-relaxed">
 Estou ciente e me comprometo a fazer uso de <strong>Aciclovir 8/8h por 3 dias antes</strong> do procedimento de micropigmentação labial.
 </span>
 </label>
 )}

 <label className="flex items-start gap-2 p-3 rounded-xl border border-border/60 bg-card cursor-pointer">
 <input
 type="checkbox"
 checked={aceitouTermos}
 onChange={(e) => setAceitouTermos(e.target.checked)}
 className="mt-0.5 accent-gold"
 />
 <span className="font-body text-[12px] text-foreground/80 leading-relaxed">
 Declaro que as informações acima são verdadeiras e autorizo o atendimento. *
 </span>
 </label>

 {(gestante === "sim" || amamentando === "sim") && (
 <div className="flex items-start gap-2 p-3 rounded-xl border border-rose/30 bg-rose/5 text-rose">
 <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
 <p className="font-body text-[12px] leading-relaxed">
 Procedimentos estéticos invasivos não são recomendados durante gestação/amamentação. Sua ficha será analisada e a profissional entrará em contato.
 </p>
 </div>
 )}

 <button
 onClick={handleSubmit}
 disabled={loading}
 className="ios-press w-full py-3.5 rounded-full bg-rose text-primary-foreground font-body font-semibold text-[14px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : "Enviar ficha"}
 </button>
 </div>
 </DialogContent>
 </Dialog>
 );
};

export default AnamneseFormModal;
