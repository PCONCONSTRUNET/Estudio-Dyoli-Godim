import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Droplet, Palette, Heart, AlertTriangle, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const WHATSAPP_NUMBER = "5548999779829"; // WhatsApp da Dyoli

// Ícone oficial do WhatsApp (SVG fiel à marca)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
    <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.745.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.495-1.318.142-.343.142-.616.1-.88-.07-.157-.27-.243-.515-.345z M16.005 0C7.165 0 0 7.165 0 16.005c0 2.823.747 5.45 2.054 7.717L0 32l8.515-2.013a15.92 15.92 0 0 0 7.49 1.853c8.84 0 16.005-7.165 16.005-16.005C32.01 7.165 24.845 0 16.005 0zm0 29.297a13.27 13.27 0 0 1-6.732-1.838l-.483-.287-4.992 1.184 1.205-4.875-.317-.502a13.252 13.252 0 0 1-2.027-7.06c0-7.328 5.982-13.31 13.31-13.31 7.328 0 13.31 5.982 13.31 13.31 0 7.328-5.982 13.378-13.31 13.378z" />
  </svg>
);

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
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.05] blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-8 lg:py-12">
        {/* Header */}
        <header className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-gold transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/40 to-nude/30 border border-gold/40 flex items-center justify-center shadow-[0_4px_16px_-6px_hsl(var(--gold)/0.4)]">
              <Heart className="w-5 h-5 text-gold fill-gold/30" />
            </div>
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.22em] text-gold/80">Estúdio Dyoli</p>
              <h1 className="font-heading text-3xl lg:text-4xl text-primary-foreground leading-tight">
                Como cuidar bem da sua pele
              </h1>
            </div>
          </div>
          <p className="text-primary-foreground/85 text-base lg:text-[17px] leading-relaxed">
            Oi, amor! 💛 Esse pequeno guia foi feito com muito carinho pra te ajudar nos primeiros
            dias após o procedimento. Leia com calma e, se ficar qualquer dúvida, me chama no
            WhatsApp — eu respondo pessoalmente!
          </p>
        </header>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-primary-foreground/[0.06] border border-primary-foreground/15 h-auto p-1">
            <TabsTrigger
              value="tatuagem"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold/30 data-[state=active]:to-nude/20 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/40 text-primary-foreground/80 py-2.5 text-xs lg:text-sm gap-1.5 flex-col lg:flex-row font-medium"
            >
              <Palette className="w-4 h-4" />
              Tatuagem
            </TabsTrigger>
            <TabsTrigger
              value="piercing"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold/30 data-[state=active]:to-nude/20 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/40 text-primary-foreground/80 py-2.5 text-xs lg:text-sm gap-1.5 flex-col lg:flex-row font-medium"
            >
              <Droplet className="w-4 h-4" />
              Piercing
            </TabsTrigger>
            <TabsTrigger
              value="micro"
              className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-gold/30 data-[state=active]:to-nude/20 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/40 text-primary-foreground/80 py-2.5 text-xs lg:text-sm gap-1.5 flex-col lg:flex-row font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Micro
            </TabsTrigger>
          </TabsList>

          {/* TATUAGEM */}
          <TabsContent value="tatuagem" className="mt-6 space-y-4">
            <SectionTitle icon={<Palette className="w-5 h-5" />} title="Cuidados com sua tatuagem" />

            <DoDontGrid
              dos={[
                "Mantenha o filme protetor por 2 a 4 horas depois que sair daqui",
                "Lavinha gentil com água morninha e sabonete neutro, 2x por dia",
                "Hidrate com pomada cicatrizante (Bepantol ou Hipoglós) 3 a 4 vezes ao dia",
                "Use roupas leves de algodão pra pele respirar",
              ]}
              donts={[
                "Nada de sol direto na região por 30 dias — protetor é seu amigo!",
                "Sem piscina, praia ou banheira nos primeiros 15 dias",
                "Não coce, não cutuque e nem arranque as casquinhas — promete?",
                "Esqueça bucha, esfoliante e álcool na região",
              ]}
            />

            <Accordion type="single" collapsible className="space-y-2">
              <FaqItem
                value="t1"
                question="Quanto tempo leva pra cicatrizar?"
                answer="A cicatrização da superfície da pele leva de 7 a 15 dias. Já a pele mais profunda continua se recuperando até completar 30 dias. Nesse tempo, evite sol e mantenha sempre hidratada — sua tatuagem vai ficar linda!"
              />
              <FaqItem
                value="t2"
                question="Vai descamar, é normal?"
                answer="Super normal! Entre o 5º e o 10º dia ela vai começar a soltar umas casquinhas finas, parecido com uma queimadura de sol. Não arranque de jeito nenhum — deixe cair sozinha. Prometo que vale a pena esperar."
              />
              <FaqItem
                value="t3"
                question="Posso treinar / fazer atividade física?"
                answer="Nos primeiros 7 dias é melhor pegar leve. Suor em excesso e atrito da roupa podem prejudicar a cicatrização e até causar infecção. Depois desse período pode voltar à rotina normal."
              />
              <FaqItem
                value="t4"
                question="E quando estiver totalmente cicatrizada?"
                answer="Use sempre protetor solar FPS 50+ na tatuagem — isso preserva as cores por anos. E hidratante diariamente pra manter o brilho e a definição do desenho."
              />
              <FaqItem
                value="t5"
                question="Quando devo me preocupar?"
                answer="Me chama no WhatsApp se notar: vermelhidão muito forte depois do 5º dia, pus, febre, calor intenso ou inchaço aumentando. Esses são sinais de infecção e a gente precisa cuidar logo."
              />
            </Accordion>
          </TabsContent>

          {/* PIERCING */}
          <TabsContent value="piercing" className="mt-6 space-y-4">
            <SectionTitle icon={<Droplet className="w-5 h-5" />} title="Cuidados com seu piercing" />

            <DoDontGrid
              dos={[
                "Higienize com soro fisiológico 2x por dia — sem pressa, com carinho",
                "No banho, lave com sabonete neutro e enxágue bem",
                "Sequinho com gaze estéril (toalha não, ela acumula bactérias)",
                "Mantenha cabelo, mãos e maquiagem longe do piercing",
              ]}
              donts={[
                "Não tire a joia antes da cicatrização completa, mesmo que esteja tudo bem",
                "Sem álcool, água oxigenada ou pomada por conta própria",
                "Não fique girando, mexendo ou brincando com o piercing",
                "Evite piscina, mar e banheira nos primeiros 30 dias",
              ]}
            />

            <Accordion type="single" collapsible className="space-y-2">
              <FaqItem
                value="p1"
                question="Quanto tempo leva pra cicatrizar?"
                answer="Depende muito do local: Lóbulo (6 a 8 semanas), Cartilagem/Hélix (6 a 12 meses), Tragus (6 a 9 meses), Septo (6 a 8 meses), Umbigo (6 a 12 meses), Língua (4 a 6 semanas). Paciência faz toda diferença!"
              />
              <FaqItem
                value="p2"
                question="Tá saindo um líquido amareladinho, é normal?"
                answer="Sim! Esse é a linfa — um líquido transparente ou amarelo claro que faz parte natural da cicatrização. Diferente de pus, que é esverdeado, mais grosso e tem cheiro forte. Aí sim me chama!"
              />
              <FaqItem
                value="p3"
                question="Quando posso trocar a joia?"
                answer="Só troque depois da cicatrização completa do local. Trocar antes pode causar rejeição, fechamento ou infecção. Na dúvida, agenda comigo uma avaliação rapidinha."
              />
              <FaqItem
                value="p4"
                question="Como dormir sem machucar?"
                answer="Tente não deitar sobre o piercing nos primeiros meses. Use fronhas limpas e troque com frequência. Se for piercing na orelha, dormir do lado oposto ajuda demais."
              />
              <FaqItem
                value="p5"
                question="Inchou e tá doendo, devo me preocupar?"
                answer="Inchaço e desconforto leve nos primeiros dias é totalmente normal. Mas se a dor for muito forte, com calor, vermelhidão e pus, me procure imediatamente."
              />
            </Accordion>
          </TabsContent>

          {/* MICROPIGMENTAÇÃO */}
          <TabsContent value="micro" className="mt-6 space-y-4">
            <SectionTitle icon={<Sparkles className="w-5 h-5" />} title="Cuidados com sua micro" />

            <DoDontGrid
              dos={[
                "Higienize com gaze e soro fisiológico nas primeiras 24 horas",
                "Aplique a pomada que te indiquei 3x por dia, durante 7 dias",
                "Durma de barriga pra cima nos primeiros 3 dias",
                "Beba bastante água — ajuda demais na fixação do pigmento!",
              ]}
              donts={[
                "Não molhe a região por 24h depois do procedimento",
                "Sol direto por 30 dias é proibido — pode desbotar tudo",
                "Sem maquiagem na região por 7 dias inteiros",
                "Não puxe as casquinhas, senão arranca o pigmento junto",
              ]}
            />

            <Accordion type="single" collapsible className="space-y-2">
              <FaqItem
                value="m1"
                question="Quando faço o retoque?"
                answer="O retoque faz parte do processo e é essencial! Marcamos entre 30 e 45 dias depois da primeira sessão. É ele que garante uniformidade, durabilidade e o resultado final perfeito."
              />
              <FaqItem
                value="m2"
                question="A cor vai clarear bastante?"
                answer="Vai sim, e isso é normal! Nos primeiros 7 dias a cor parece muito intensa. Após a descamação ela clareia até 40% — chegando no tom natural que combina com você. Depois do retoque a cor estabiliza de vez."
              />
              <FaqItem
                value="m3"
                question="Quanto tempo dura o resultado?"
                answer="A micropigmentação dura de 1 a 3 anos, dependendo do tipo de pele, exposição ao sol, cuidados em casa e técnica usada. Peles oleosas tendem a durar um pouquinho menos."
              />
              <FaqItem
                value="m4"
                question="Posso voltar pra academia?"
                answer="Pegue leve nos primeiros 7 dias. Suor pode atrapalhar a fixação do pigmento e causar irritação. Depois disso, libera!"
              />
              <FaqItem
                value="m5"
                question="Tá coçando bastante, normal?"
                answer="Sim, principalmente entre o 4º e 7º dia, durante a descamação. NÃO COCE — só aplique a pomada que te passei. Se coçar, pode arrancar o pigmento e prejudicar o resultado."
              />
              <FaqItem
                value="m6"
                question="Posso fazer grávida ou amamentando?"
                answer="Não recomendo, amor. As alterações hormonais nesse período afetam a fixação e a cor do pigmento. Vale a pena esperar terminar a amamentação pra fazer com tranquilidade."
              />
            </Accordion>
          </TabsContent>
        </Tabs>

        {/* Alerta */}
        <div className="mt-8 p-5 rounded-xl bg-gradient-to-br from-gold/[0.12] to-nude/[0.06] border border-gold/30 flex gap-3 shadow-[0_4px_20px_-8px_hsl(var(--gold)/0.25)]">
          <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h3 className="text-primary-foreground font-medium text-base mb-1.5">
              Sentiu algo diferente?
            </h3>
            <p className="text-primary-foreground/85 text-sm leading-relaxed">
              Não trate nada por conta própria com remédio caseiro ou pomada sem orientação. Me
              chama no WhatsApp ou procure um profissional. A gente cuida juntos! 💛
            </p>
          </div>
        </div>

        {/* CTA WhatsApp - cor oficial e ícone oficial */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            "Oi Dyoli! Tenho uma dúvida sobre os cuidados pós-procedimento."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ios-press mt-6 flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold text-[16px] shadow-[0_8px_30px_-10px_rgba(37,211,102,0.6)] transition-all"
        >
          <WhatsAppIcon className="w-6 h-6" />
          Falar com a Dyoli no WhatsApp
        </a>

        <p className="mt-3 text-center text-primary-foreground/60 text-xs">
          Resposta rápida, geralmente em poucos minutos
        </p>

        <footer className="mt-10 text-center text-primary-foreground/50 text-xs">
          © Estúdio Dyoli — feito com carinho para você
        </footer>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 text-gold mb-2">
    {icon}
    <h2 className="font-heading text-2xl">{title}</h2>
  </div>
);

const DoDontGrid = ({ dos, donts }: { dos: string[]; donts: string[] }) => (
  <div className="grid md:grid-cols-2 gap-3">
    <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/[0.14] to-emerald-500/[0.04] border border-emerald-500/30 shadow-[0_4px_16px_-8px_rgba(16,185,129,0.2)]">
      <div className="flex items-center gap-2 mb-3 text-emerald-300">
        <div className="w-7 h-7 rounded-full bg-emerald-500/25 flex items-center justify-center">
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider">Pode fazer</h3>
      </div>
      <ul className="space-y-2.5">
        {dos.map((item, i) => (
          <li key={i} className="text-primary-foreground/95 text-[14px] flex gap-2.5 leading-relaxed">
            <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" strokeWidth={3} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="p-5 rounded-xl bg-gradient-to-br from-red-600/[0.22] to-red-700/[0.10] border border-red-500/50 shadow-[0_4px_20px_-6px_rgba(220,38,38,0.4)]">
      <div className="flex items-center gap-2 mb-3 text-red-100">
        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(220,38,38,0.6)]">
          <X className="w-4 h-4 text-white" strokeWidth={3.5} />
        </div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-100">Evite</h3>
      </div>
      <ul className="space-y-2.5">
        {donts.map((item, i) => (
          <li key={i} className="text-white text-[14px] flex gap-2.5 leading-relaxed font-medium">
            <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={3.5} />
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
    className="border border-primary-foreground/15 rounded-xl bg-primary-foreground/[0.05] px-4 data-[state=open]:bg-primary-foreground/[0.08] data-[state=open]:border-gold/30 data-[state=open]:shadow-[0_4px_16px_-8px_hsl(var(--gold)/0.2)]"
  >
    <AccordionTrigger className="text-primary-foreground hover:text-gold text-left text-[15px] font-semibold hover:no-underline py-4">
      {question}
    </AccordionTrigger>
    <AccordionContent className="text-primary-foreground/90 text-[14px] leading-relaxed pb-4">
      {answer}
    </AccordionContent>
  </AccordionItem>
);

export default Cuidados;
