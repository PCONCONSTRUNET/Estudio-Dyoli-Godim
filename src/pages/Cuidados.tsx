import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Droplet, Palette, MessageCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const WHATSAPP_NUMBER = "5511999999999"; // ajuste se quiser

const Cuidados = () => {
  const [tab, setTab] = useState("tatuagem");

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Ambient gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(30 15% 12%) 50%, hsl(0 0% 9%) 100%)",
        }}
      />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.04] blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-8 lg:py-12">
        {/* Header */}
        <header className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/60 hover:text-gold transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold/30 to-nude/20 border border-gold/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <h1 className="font-heading text-3xl lg:text-4xl text-primary-foreground">
              Cuidados Pós-Procedimento
            </h1>
          </div>
          <p className="text-primary-foreground/60 text-sm lg:text-base leading-relaxed">
            Guia completo de cuidados para garantir uma cicatrização perfeita. Leia com atenção e
            qualquer dúvida fale com a Dyoli pelo WhatsApp.
          </p>
        </header>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-primary-foreground/[0.04] border border-primary-foreground/10 h-auto p-1">
            <TabsTrigger
              value="tatuagem"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold/20 data-[state=active]:to-nude/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 text-primary-foreground/60 py-2.5 text-xs lg:text-sm gap-1.5 flex-col lg:flex-row"
            >
              <Palette className="w-4 h-4" />
              Tatuagem
            </TabsTrigger>
            <TabsTrigger
              value="piercing"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold/20 data-[state=active]:to-nude/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 text-primary-foreground/60 py-2.5 text-xs lg:text-sm gap-1.5 flex-col lg:flex-row"
            >
              <Droplet className="w-4 h-4" />
              Piercing
            </TabsTrigger>
            <TabsTrigger
              value="micro"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold/20 data-[state=active]:to-nude/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 text-primary-foreground/60 py-2.5 text-xs lg:text-sm gap-1.5 flex-col lg:flex-row"
            >
              <Sparkles className="w-4 h-4" />
              Micro
            </TabsTrigger>
          </TabsList>

          {/* TATUAGEM */}
          <TabsContent value="tatuagem" className="mt-6 space-y-4">
            <SectionTitle icon={<Palette className="w-5 h-5" />} title="Cuidados com Tatuagem" />

            <DoDontGrid
              dos={[
                "Mantenha o filme protetor por 2-4 horas após o procedimento",
                "Lave com água morna e sabonete neutro 2x ao dia",
                "Hidrate com pomada cicatrizante (Bepantol/Hipoglós) 3-4x ao dia",
                "Use roupas leves e de algodão sobre a área",
              ]}
              donts={[
                "Não exponha ao sol direto por 30 dias",
                "Não entre em piscina, mar ou banheira por 15 dias",
                "Não cutuque, coce ou puxe as casquinhas",
                "Não use buchas, esfoliantes ou álcool na região",
              ]}
            />

            <Accordion type="single" collapsible className="space-y-2">
              <FaqItem
                value="t1"
                question="Quanto tempo leva para cicatrizar?"
                answer="A cicatrização superficial leva de 7 a 15 dias. A cicatrização profunda da pele pode levar até 30 dias. Durante este período, evite sol e mantenha a hidratação."
              />
              <FaqItem
                value="t2"
                question="É normal descamar?"
                answer="Sim! Entre o 5º e 10º dia a tatuagem começa a descamar como se fosse uma queimadura de sol. Não arranque as casquinhas — deixe cair naturalmente."
              />
              <FaqItem
                value="t3"
                question="Posso fazer atividade física?"
                answer="Evite atividades intensas que causem suor excessivo nos primeiros 7 dias. Suor + atrito da roupa pode causar infecção."
              />
              <FaqItem
                value="t4"
                question="E depois de cicatrizada?"
                answer="Sempre use protetor solar FPS 50+ na região para preservar as cores. Hidrate diariamente para manter o brilho."
              />
              <FaqItem
                value="t5"
                question="Quando me preocupar?"
                answer="Procure ajuda se notar: vermelhidão excessiva após 5 dias, pus, febre, calor intenso na região ou inchaço que aumenta. Pode ser sinal de infecção."
              />
            </Accordion>
          </TabsContent>

          {/* PIERCING */}
          <TabsContent value="piercing" className="mt-6 space-y-4">
            <SectionTitle icon={<Droplet className="w-5 h-5" />} title="Cuidados com Piercing" />

            <DoDontGrid
              dos={[
                "Higienize com soro fisiológico 2x ao dia",
                "Lave com sabonete neutro durante o banho",
                "Seque com gaze estéril (nunca toalha)",
                "Mantenha cabelos e mãos longe do piercing",
              ]}
              donts={[
                "Não tire a joia antes do tempo de cicatrização",
                "Não use álcool, água oxigenada ou pomadas sem indicação",
                "Não fique mexendo, girando ou brincando com o piercing",
                "Evite piscina, mar e banheira nos primeiros 30 dias",
              ]}
            />

            <Accordion type="single" collapsible className="space-y-2">
              <FaqItem
                value="p1"
                question="Quanto tempo demora a cicatrização?"
                answer="Depende do local: Lóbulo (6-8 semanas), Cartilagem/Hélix (6-12 meses), Tragus (6-9 meses), Septo (6-8 meses), Umbigo (6-12 meses), Língua (4-6 semanas)."
              />
              <FaqItem
                value="p2"
                question="É normal sair líquido amarelado?"
                answer="Sim, é a linfa — um líquido transparente/amarelo claro que faz parte da cicatrização. Diferente de pus (esverdeado e com odor), que indica infecção."
              />
              <FaqItem
                value="p3"
                question="Quando posso trocar a joia?"
                answer="Só troque depois da cicatrização completa do local. Trocar antes pode causar rejeição, fechamento ou infecção. Em caso de dúvida, agende uma avaliação."
              />
              <FaqItem
                value="p4"
                question="Como dormir com piercing?"
                answer="Evite deitar sobre o piercing nos primeiros meses. Use fronhas limpas e troque com frequência. Para piercings na orelha, dormir do lado oposto ajuda muito."
              />
              <FaqItem
                value="p5"
                question="Inchou e está doendo, é normal?"
                answer="Inchaço e desconforto leve nos primeiros dias é normal. Se a dor for intensa, com calor, vermelhidão e pus, procure ajuda imediatamente."
              />
            </Accordion>
          </TabsContent>

          {/* MICROPIGMENTAÇÃO */}
          <TabsContent value="micro" className="mt-6 space-y-4">
            <SectionTitle icon={<Sparkles className="w-5 h-5" />} title="Cuidados com Micropigmentação" />

            <DoDontGrid
              dos={[
                "Higienize a área com gaze e soro fisiológico nas primeiras 24h",
                "Aplique a pomada indicada 3x ao dia por 7 dias",
                "Durma de barriga para cima nos primeiros 3 dias",
                "Beba bastante água para ajudar a fixação",
              ]}
              donts={[
                "Não molhe a região por 24h após o procedimento",
                "Não exponha ao sol por 30 dias (pode desbotar)",
                "Não use maquiagem na região por 7 dias",
                "Não puxe casquinhas — pode arrancar o pigmento",
              ]}
            />

            <Accordion type="single" collapsible className="space-y-2">
              <FaqItem
                value="m1"
                question="Quando faço o retoque?"
                answer="O retoque é parte essencial do procedimento e deve ser feito entre 30 e 45 dias após a primeira sessão. Ele garante uniformidade e durabilidade da cor."
              />
              <FaqItem
                value="m2"
                question="A cor vai clarear?"
                answer="Sim! Nos primeiros 7 dias a cor parece muito intensa. Após a descamação, ela clareia até 40% — ficando no tom natural desejado. Depois do retoque a cor estabiliza."
              />
              <FaqItem
                value="m3"
                question="Quanto tempo dura?"
                answer="A micropigmentação dura de 1 a 3 anos, dependendo do tipo de pele, exposição solar, cuidados e técnica utilizada. Peles oleosas tendem a durar menos."
              />
              <FaqItem
                value="m4"
                question="Posso fazer academia depois?"
                answer="Evite atividades físicas intensas por 7 dias. Suor pode interferir na fixação do pigmento e causar irritação."
              />
              <FaqItem
                value="m5"
                question="É normal sentir coceira?"
                answer="Sim, especialmente entre o 4º e 7º dia, durante a descamação. NÃO coce — apenas aplique a pomada indicada. Coçar pode arrancar o pigmento."
              />
              <FaqItem
                value="m6"
                question="Posso fazer se estiver grávida ou amamentando?"
                answer="Não recomendamos. As alterações hormonais podem afetar a fixação e cor do pigmento. Aguarde o término da amamentação para fazer o procedimento."
              />
            </Accordion>
          </TabsContent>
        </Tabs>

        {/* Alerta */}
        <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-gold/[0.08] to-nude/[0.04] border border-gold/20 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h3 className="text-primary-foreground font-medium text-sm mb-1">
              Em caso de dúvidas ou sintomas anormais
            </h3>
            <p className="text-primary-foreground/60 text-xs leading-relaxed">
              Procure imediatamente um profissional. Não tente tratar por conta própria com receitas
              caseiras ou medicamentos sem prescrição.
            </p>
          </div>
        </div>

        {/* CTA WhatsApp */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            "Olá Dyoli, tenho uma dúvida sobre cuidados pós-procedimento."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ios-press mt-6 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-gold/90 to-nude/80 text-charcoal font-medium shadow-[0_8px_30px_-10px_hsl(var(--gold)/0.5)] hover:from-gold hover:to-nude transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          Falar com a Dyoli pelo WhatsApp
        </a>

        <footer className="mt-10 text-center text-primary-foreground/30 text-xs">
          © Estúdio Dyoli — Cuidados pós-procedimento
        </footer>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 text-gold mb-2">
    {icon}
    <h2 className="font-heading text-xl">{title}</h2>
  </div>
);

const DoDontGrid = ({ dos, donts }: { dos: string[]; donts: string[] }) => (
  <div className="grid md:grid-cols-2 gap-3">
    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/[0.08] to-transparent border border-emerald-500/20">
      <div className="flex items-center gap-2 mb-3 text-emerald-400">
        <CheckCircle2 className="w-4 h-4" />
        <h3 className="text-sm font-medium uppercase tracking-wider">Faça</h3>
      </div>
      <ul className="space-y-2">
        {dos.map((item, i) => (
          <li key={i} className="text-primary-foreground/75 text-sm flex gap-2 leading-relaxed">
            <span className="text-emerald-400 shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/[0.08] to-transparent border border-rose-500/20">
      <div className="flex items-center gap-2 mb-3 text-rose-400">
        <XCircle className="w-4 h-4" />
        <h3 className="text-sm font-medium uppercase tracking-wider">Não faça</h3>
      </div>
      <ul className="space-y-2">
        {donts.map((item, i) => (
          <li key={i} className="text-primary-foreground/75 text-sm flex gap-2 leading-relaxed">
            <span className="text-rose-400 shrink-0">✗</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const FaqItem = ({
  value,
  question,
  answer,
}: {
  value: string;
  question: string;
  answer: string;
}) => (
  <AccordionItem
    value={value}
    className="border border-primary-foreground/10 rounded-xl bg-primary-foreground/[0.03] px-4 data-[state=open]:bg-primary-foreground/[0.05] data-[state=open]:border-gold/20"
  >
    <AccordionTrigger className="text-primary-foreground hover:text-gold text-left text-sm font-medium hover:no-underline py-4">
      {question}
    </AccordionTrigger>
    <AccordionContent className="text-primary-foreground/65 text-sm leading-relaxed pb-4">
      {answer}
    </AccordionContent>
  </AccordionItem>
);

export default Cuidados;
