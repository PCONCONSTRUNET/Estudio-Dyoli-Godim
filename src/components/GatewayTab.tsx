import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Copy, Check, CreditCard, QrCode, FileText, ExternalLink } from "lucide-react";

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

const GatewayTab = () => {
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [pixEnabled, setPixEnabled] = useState(true);
  const [cartaoEnabled, setCartaoEnabled] = useState(false);
  const [boletoEnabled, setBoletoEnabled] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)("gateway_configs")
      .select("*")
      .eq("gateway", "mercadopago")
      .maybeSingle();
    if (data) {
      const d = data as GatewayConfig;
      setConfig(d);
      setAccessToken(d.access_token || "");
      setPublicKey(d.public_key || "");
      setAtivo(d.ativo);
      setPixEnabled(d.pix_enabled);
      setCartaoEnabled(d.cartao_enabled);
      setBoletoEnabled(d.boleto_enabled);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await (supabase.from as any)("gateway_configs")
      .update({
        access_token: accessToken,
        public_key: publicKey,
        ativo,
        pix_enabled: pixEnabled,
        cartao_enabled: cartaoEnabled,
        boleto_enabled: boletoEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);
    if (error) {
      console.error("Erro gateway save:", error);
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração salva com sucesso!");
      loadConfig();
    }
    setSaving(false);
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

      {/* Mercado Pago Card */}
      <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-foreground/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#009ee3]/10">
              <CreditCard className="h-5 w-5 text-[#009ee3]" />
            </div>
            <div>
              <h3 className="font-heading text-[14px] font-semibold text-primary-foreground">Mercado Pago</h3>
              <p className="font-body text-[11px] text-primary-foreground/35">Gateway de pagamento</p>
            </div>
          </div>
          <button
            onClick={() => { setAtivo(!ativo); }}
            className={`w-11 h-6 rounded-full relative transition-all duration-200 ${ativo ? "bg-green-500" : "bg-primary-foreground/10"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${ativo ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Access Token */}
          <div>
            <label className="font-body text-[11px] text-primary-foreground/40 mb-1.5 block">Access Token *</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="APP_USR-..."
                className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 pl-3 pr-20 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-1.5 rounded-lg text-primary-foreground/25 hover:text-primary-foreground/50 transition-all"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                {accessToken && (
                  <button
                    onClick={() => copyToClipboard(accessToken, "Token")}
                    className="p-1.5 rounded-lg text-primary-foreground/25 hover:text-primary-foreground/50 transition-all"
                  >
                    {copied === "Token" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
            <p className="font-body text-[10px] text-primary-foreground/25 mt-1">
              Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais
            </p>
          </div>

          {/* Public Key */}
          <div>
            <label className="font-body text-[11px] text-primary-foreground/40 mb-1.5 block">Public Key</label>
            <input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="APP_USR-..."
              className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
          </div>

          {/* Webhook URL (read-only) */}
          <div>
            <label className="font-body text-[11px] text-primary-foreground/40 mb-1.5 block">URL do Webhook</label>
            <div className="relative">
              <input
                readOnly
                value={config?.webhook_url || ""}
                className="w-full rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.06] py-2.5 pl-3 pr-10 text-primary-foreground/50 font-body text-[12px] cursor-default"
              />
              <button
                onClick={() => copyToClipboard(config?.webhook_url || "", "URL Webhook")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-primary-foreground/25 hover:text-primary-foreground/50 transition-all"
              >
                {copied === "URL Webhook" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="font-body text-[10px] text-primary-foreground/25 mt-1">
              Cole esta URL nas configurações de webhook do Mercado Pago
            </p>
          </div>

          {/* Métodos de pagamento */}
          <div>
            <label className="font-body text-[11px] text-primary-foreground/40 mb-2 block">Métodos de Pagamento</label>
            <div className="space-y-2">
              {([
                { key: "pix", label: "PIX", desc: "Pagamento instantâneo", icon: QrCode, enabled: pixEnabled, toggle: setPixEnabled },
                { key: "cartao", label: "Cartão de Crédito", desc: "Visa, Master, Elo, etc.", icon: CreditCard, enabled: cartaoEnabled, toggle: setCartaoEnabled },
                { key: "boleto", label: "Boleto Bancário", desc: "Compensação em até 3 dias", icon: FileText, enabled: boletoEnabled, toggle: setBoletoEnabled },
              ] as const).map((m) => (
                <div
                  key={m.key}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                    m.enabled
                      ? "bg-primary-foreground/[0.04] border-gold/20"
                      : "bg-primary-foreground/[0.02] border-primary-foreground/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <m.icon className={`h-4 w-4 ${m.enabled ? "text-gold" : "text-primary-foreground/25"}`} />
                    <div>
                      <p className={`font-body text-[12px] font-medium ${m.enabled ? "text-primary-foreground" : "text-primary-foreground/40"}`}>
                        {m.label}
                      </p>
                      <p className="font-body text-[10px] text-primary-foreground/25">{m.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => m.toggle(!m.enabled)}
                    className={`w-10 h-6 rounded-full relative transition-all duration-200 ${m.enabled ? "bg-gold" : "bg-primary-foreground/10"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${m.enabled ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Como configurar */}
          <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.02] p-3">
            <p className="font-body text-[11px] font-medium text-primary-foreground/50 mb-2">📋 Como configurar:</p>
            <ol className="font-body text-[10px] text-primary-foreground/30 space-y-1 list-decimal list-inside">
              <li>Acesse <span className="text-gold/60">mercadopago.com.br/developers</span></li>
              <li>Vá em "Suas integrações" → Criar aplicação</li>
              <li>Copie o <strong className="text-primary-foreground/40">Access Token</strong> e <strong className="text-primary-foreground/40">Public Key</strong></li>
              <li>Cole a <strong className="text-primary-foreground/40">URL do Webhook</strong> acima nas notificações</li>
              <li>Ative o gateway e escolha os métodos de pagamento</li>
            </ol>
            <a
              href="https://www.mercadopago.com.br/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-body text-[10px] text-gold/60 hover:text-gold transition-all"
            >
              <ExternalLink className="h-3 w-3" /> Abrir painel Mercado Pago
            </a>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold py-3 font-body text-[13px] font-semibold text-charcoal transition-all hover:bg-gold/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configuração"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GatewayTab;
