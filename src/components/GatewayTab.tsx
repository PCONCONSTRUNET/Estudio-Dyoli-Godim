import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Copy, Check, CreditCard, QrCode, FileText, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import pixIconImg from "@/assets/pix-icon.png";

const PixIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <img src={pixIconImg} alt="PIX" className={className} style={style} />
);

interface GatewayConfig {
  id: string;
  gateway: string;
  access_token: string;
  public_key: string;
  webhook_url: string;
  ativo: boolean;
  pix_enabled: boolean;
  cartao_enabled: boolean;
  boleto_enabled: boolean;
}

interface GatewayMeta {
  key: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tokenPlaceholder: string;
  publicKeyPlaceholder: string;
  publicKeyLabel: string;
  helpSteps: string[];
  helpLink: string;
  helpLinkLabel: string;
  supportsCartao: boolean;
  supportsBoleto: boolean;
}

const GATEWAYS: GatewayMeta[] = [
  {
    key: "mercadopago",
    label: "Mercado Pago",
    color: "#009ee3",
    icon: CreditCard,
    tokenPlaceholder: "APP_USR-...",
    publicKeyPlaceholder: "APP_USR-...",
    publicKeyLabel: "Public Key",
    helpSteps: [
      'Acesse mercadopago.com.br/developers',
      'Vá em "Suas integrações" → Criar aplicação',
      'Copie o Access Token e Public Key',
      'Cole a URL do Webhook acima nas notificações',
      'Ative o gateway e escolha os métodos de pagamento',
    ],
    helpLink: "https://www.mercadopago.com.br/developers/panel/app",
    helpLinkLabel: "Abrir painel Mercado Pago",
    supportsCartao: true,
    supportsBoleto: true,
  },
];


const GatewayTab = () => {
  const [configs, setConfigs] = useState<Record<string, GatewayConfig>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ mercadopago: true });

  // Form state per gateway
  const [forms, setForms] = useState<Record<string, {
    accessToken: string; publicKey: string; ativo: boolean;
    pixEnabled: boolean; cartaoEnabled: boolean; boletoEnabled: boolean;
  }>>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)("gateway_configs").select("*");
    if (data) {
      const map: Record<string, GatewayConfig> = {};
      const formMap: Record<string, any> = {};
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vlepenxinekoljxecomr.supabase.co";
      
      for (const d of data as GatewayConfig[]) {
        // Auto-generate webhook URL if empty or not public HTTPS
        if (!d.webhook_url || !d.webhook_url.startsWith("https://")) {
        const webhookFn = "mercadopago-webhook";
          const generatedUrl = `${supabaseUrl}/functions/v1/${webhookFn}`;
          await (supabase.from as any)("gateway_configs")
            .update({ webhook_url: generatedUrl })
            .eq("id", d.id);
          d.webhook_url = generatedUrl;
        }
        map[d.gateway] = d;
        formMap[d.gateway] = {
          accessToken: d.access_token || "",
          publicKey: d.public_key || "",
          ativo: d.ativo,
          pixEnabled: d.pix_enabled,
          cartaoEnabled: d.cartao_enabled,
          boletoEnabled: d.boleto_enabled,
        };
      }
      setConfigs(map);
      setForms(formMap);
    }
    setLoading(false);
  };

  const handleSave = async (gatewayKey: string) => {
    const cfg = configs[gatewayKey];
    const form = forms[gatewayKey];
    if (!cfg || !form) return;
    setSavingKey(gatewayKey);
    const { error } = await (supabase.from as any)("gateway_configs")
      .update({
        access_token: form.accessToken,
        public_key: form.publicKey,
        ativo: form.ativo,
        pix_enabled: form.pixEnabled,
        cartao_enabled: form.cartaoEnabled,
        boleto_enabled: form.boletoEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cfg.id);
    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração salva!");
      loadAll();
    }
    setSavingKey(null);
  };

  const updateForm = (gatewayKey: string, field: string, value: any) => {
    setForms((prev) => ({
      ...prev,
      [gatewayKey]: { ...prev[gatewayKey], [field]: value },
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiada!`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="font-heading text-lg font-semibold text-primary-foreground lg:hidden">
        Gateway de Pagamento
      </h2>

      {GATEWAYS.map((gw) => {
        const cfg = configs[gw.key];
        const form = forms[gw.key];
        if (!cfg || !form) return null;
        const isExpanded = expanded[gw.key] !== false;
        const tokenVisible = showToken[gw.key] || false;

        return (
          <div key={gw.key} className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpanded((p) => ({ ...p, [gw.key]: !isExpanded }))}
              className="w-full flex items-center justify-between p-4 border-b border-primary-foreground/[0.06] hover:bg-primary-foreground/[0.02] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${gw.color}15` }}>
                  <gw.icon className="h-5 w-5" style={{ color: gw.color }} />
                </div>
                <div className="text-left">
                  <h3 className="font-heading text-[14px] font-semibold text-primary-foreground">{gw.label}</h3>
                  <p className="font-body text-[11px] text-primary-foreground/95">
                    {form.ativo ? "Ativo" : "Inativo"}
                    {form.ativo && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  onClick={(e) => { e.stopPropagation(); updateForm(gw.key, "ativo", !form.ativo); }}
                  className={`w-11 h-6 rounded-full relative transition-all duration-200 cursor-pointer ${form.ativo ? "bg-green-500" : "bg-primary-foreground/10"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${form.ativo ? "left-5" : "left-0.5"}`} />
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-primary-foreground/95" /> : <ChevronDown className="h-4 w-4 text-primary-foreground/95" />}
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-4">
                {/* Access Token */}
                <div>
                  <label className="font-body text-[11px] text-primary-foreground/75 mb-1.5 block">Access Token *</label>
                  <div className="relative">
                    <input
                      type={tokenVisible ? "text" : "password"}
                      value={form.accessToken}
                      onChange={(e) => updateForm(gw.key, "accessToken", e.target.value)}
                      placeholder={gw.tokenPlaceholder}
                      className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 pl-3 pr-20 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button onClick={() => setShowToken((p) => ({ ...p, [gw.key]: !tokenVisible }))}
                        className="p-1.5 rounded-lg text-primary-foreground/85 hover:text-primary-foreground/85 transition-all">
                        {tokenVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      {form.accessToken && (
                        <button onClick={() => copyToClipboard(form.accessToken, `Token ${gw.label}`)}
                          className="p-1.5 rounded-lg text-primary-foreground/85 hover:text-primary-foreground/85 transition-all">
                          {copied === `Token ${gw.label}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Public Key / App ID */}
                <div>
                  <label className="font-body text-[11px] text-primary-foreground/75 mb-1.5 block">{gw.publicKeyLabel}</label>
                  <input
                    value={form.publicKey}
                    onChange={(e) => updateForm(gw.key, "publicKey", e.target.value)}
                    placeholder={gw.publicKeyPlaceholder}
                    className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>

                {/* Webhook URL */}
                <div>
                  <label className="font-body text-[11px] text-primary-foreground/75 mb-1.5 block">URL do Webhook</label>
                  <div className="relative">
                    <input
                      readOnly
                      value={cfg.webhook_url || ""}
                      className="w-full rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.06] py-2.5 pl-3 pr-10 text-primary-foreground/85 font-body text-[12px] cursor-default"
                    />
                    <button
                      onClick={() => copyToClipboard(cfg.webhook_url || "", `Webhook ${gw.label}`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-primary-foreground/85 hover:text-primary-foreground/85 transition-all"
                    >
                      {copied === `Webhook ${gw.label}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="font-body text-[10px] text-primary-foreground/85 mt-1">
                    Cole esta URL nas configurações de webhook do {gw.label}
                  </p>
                </div>

                {/* Métodos de pagamento */}
                <div>
                  <label className="font-body text-[11px] text-primary-foreground/75 mb-2 block">Métodos de Pagamento</label>
                  <div className="space-y-2">
                    {([
                      { field: "pixEnabled", label: "PIX", desc: "Pagamento instantâneo", icon: PixIcon, show: true },
                      { field: "cartaoEnabled", label: "Cartão de Crédito", desc: "Visa, Master, Elo, etc.", icon: CreditCard, show: gw.supportsCartao },
                      { field: "boletoEnabled", label: "Boleto Bancário", desc: "Compensação em até 3 dias", icon: FileText, show: gw.supportsBoleto },
                    ] as const).filter(m => m.show).map((m) => {
                      const enabled = form[m.field];
                      return (
                        <div key={m.field}
                          className={`flex items-center justify-between rounded-xl border p-3 transition-all ${enabled ? "bg-primary-foreground/[0.04] border-gold/20" : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06]"}`}>
                          <div className="flex items-center gap-2.5">
                            <m.icon className={`h-4 w-4 ${enabled ? "text-gold" : "text-primary-foreground/85"}`} />
                            <div>
                              <p className={`font-body text-[12px] font-medium ${enabled ? "text-primary-foreground" : "text-primary-foreground/75"}`}>{m.label}</p>
                              <p className="font-body text-[10px] text-primary-foreground/85">{m.desc}</p>
                            </div>
                          </div>
                          <button onClick={() => updateForm(gw.key, m.field, !enabled)}
                            className={`w-10 h-6 rounded-full relative transition-all duration-200 ${enabled ? "bg-gold" : "bg-primary-foreground/10"}`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${enabled ? "left-4" : "left-0.5"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Como configurar */}
                <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.02] p-3">
                  <p className="font-body text-[11px] font-medium text-primary-foreground/85 mb-2">📋 Como configurar:</p>
                  <ol className="font-body text-[10px] text-primary-foreground/95 space-y-1 list-decimal list-inside">
                    {gw.helpSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <a href={gw.helpLink} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-body text-[10px] hover:text-gold transition-all"
                    style={{ color: `${gw.color}99` }}>
                    <ExternalLink className="h-3 w-3" /> {gw.helpLinkLabel}
                  </a>
                </div>

                {/* Save */}
                <button onClick={() => handleSave(gw.key)} disabled={savingKey === gw.key}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold py-3 font-body text-[13px] font-semibold text-charcoal transition-all hover:bg-gold/90 disabled:opacity-50">
                  <Save className="h-4 w-4" />
                  {savingKey === gw.key ? "Salvando..." : "Salvar Configuração"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GatewayTab;
