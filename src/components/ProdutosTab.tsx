import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit2, Save, X, Upload, ShoppingBag, Image, Package } from "lucide-react";
import BinButton from "@/components/ui/bin-button";
import PlusButton from "@/components/ui/plus-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NovaVendaModal from "@/components/NovaVendaModal";

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string;
  imagens: string[];
  estoque: number;
  ativo: boolean;
  ordem: number;
}

const ProdutosTab = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showVendaModal, setShowVendaModal] = useState(false);

  // New product fields
  const [newNome, setNewNome] = useState("");
  const [newDescricao, setNewDescricao] = useState("");
  const [newPreco, setNewPreco] = useState("");
  const [newEstoque, setNewEstoque] = useState("");
  const [newImagensFiles, setNewImagensFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  // Edit fields
  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editPreco, setEditPreco] = useState("");
  const [editEstoque, setEditEstoque] = useState("");
  const [editImagensFiles, setEditImagensFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*").order("ordem");
    if (data) setProdutos(data as Produto[]);
    setLoading(false);
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("produtos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("produtos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const addProduto = async () => {
    if (!newNome || !newPreco) return;
    setUploading(true);
    try {
      let urls: string[] = [];
      if (newImagensFiles.length > 0) urls = await uploadImages(newImagensFiles);
      
      const estoqueNum = newEstoque ? Number(newEstoque) : 0;
      const payload: any = {
        nome: newNome,
        descricao: newDescricao,
        preco: Number(newPreco),
        estoque: estoqueNum,
        ativo: true,
        ordem: produtos.length + 1,
      };
      if (urls.length > 0) {
        payload.imagem_url = urls[0];
        payload.imagens = urls;
      }

      const { data, error } = await supabase
        .from("produtos")
        .insert(payload)
        .select()
        .single();
        
      if (error) throw error;
      if (data) setProdutos((prev) => [...prev, data as Produto]);
      resetNewForm();
      toast.success("Produto adicionado com sucesso!");
    } catch (e: any) {
      console.error("Erro ao adicionar produto:", e);
      toast.error("Erro: " + (e.message || "Falha ao adicionar"));
    }
    setUploading(false);
  };

  const resetNewForm = () => {
    setNewNome("");
    setNewDescricao("");
    setNewPreco("");
    setNewEstoque("");
    setNewImagensFiles([]);
    setNewPreviews([]);
    setShowAdd(false);
  };

  const startEdit = (p: Produto) => {
    setEditing(p.id);
    setEditNome(p.nome);
    setEditDescricao(p.descricao || "");
    setEditPreco(p.preco.toString());
    setEditEstoque((p.estoque || 0).toString());
    setEditPreviews(p.imagens && p.imagens.length > 0 ? p.imagens : (p.imagem_url ? [p.imagem_url] : []));
    setEditImagensFiles([]);
  };

  const saveEdit = async (id: string) => {
    setUploading(true);
    try {
      let urls = [...editPreviews]; // mantem previews antigos ou URLs
      
      // Filtra URLs antigos que ainda existem e adiciona os novos
      // Simplificando: vamos focar em adicionar novas imagens ou manter o estado atual. 
      // Se tivermos arquivos novos, fazemos upload e substituímos (para simplificar por enquanto, ou anexamos).
      // Vamos substituir todas por praticidade ou só anexar? 
      // O ideal é se o usuário selecionar imagens novas, substitui. Se não, mantém.
      if (editImagensFiles.length > 0) {
        urls = await uploadImages(editImagensFiles);
      }

      const estoqueNum = editEstoque ? Number(editEstoque) : 0;
      await supabase
        .from("produtos")
        .update({
          nome: editNome,
          descricao: editDescricao,
          preco: Number(editPreco),
          estoque: estoqueNum,
          imagem_url: urls.length > 0 ? urls[0] : "",
          imagens: urls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
        
      setProdutos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, nome: editNome, descricao: editDescricao, preco: Number(editPreco), estoque: estoqueNum, imagens: urls, imagem_url: urls.length > 0 ? urls[0] : "" } : p
        )
      );
      setEditing(null);
      toast.success("Produto atualizado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao atualizar: " + (e.message || "Falha desconhecida"));
    }
    setUploading(false);
  };

  const toggleActive = async (id: string) => {
    const p = produtos.find((p) => p.id === id);
    if (!p) return;
    await supabase.from("produtos").update({ ativo: !p.ativo, updated_at: new Date().toISOString() }).eq("id", id);
    setProdutos((prev) => prev.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p)));
  };

  const removeProduto = async (id: string) => {
    await supabase.from("produtos").delete().eq("id", id);
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const previews = files.map(f => URL.createObjectURL(f));
    
    if (isEdit) {
      setEditImagensFiles(files);
      setEditPreviews(previews);
    } else {
      setNewImagensFiles(files);
      setNewPreviews(previews);
    }
  };

  if (loading) return <p className="font-body text-[13px] text-primary-foreground/95 text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4 animate-fade-in overflow-x-hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground">Produtos</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVendaModal(true)}
            className="px-3 py-1.5 rounded-xl font-body text-[12px] font-bold uppercase tracking-wider bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            Venda
          </button>
          <PlusButton size={28} title="Adicionar produto" onClick={() => setShowAdd(!showAdd)} />
        </div>
      </div>
      
      <NovaVendaModal
        open={showVendaModal}
        onOpenChange={setShowVendaModal}
        produtosDisponiveis={produtos}
        onSuccess={loadProdutos}
      />

      {/* Add product dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[85dvh] overflow-y-auto overflow-x-hidden border border-gold/20 rounded-2xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="font-body text-[14px] font-medium text-primary-foreground">Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0">
            {/* Image upload */}
            <label className="block w-full cursor-pointer">
              <div className="aspect-video rounded-xl border-2 border-dashed border-primary-foreground/10 bg-primary-foreground/[0.03] flex items-center justify-center overflow-hidden hover:border-gold/30 transition-all">
                {newPreviews.length > 0 ? (
                  <div className="flex overflow-x-auto w-full h-full gap-2 p-2 snap-x">
                    {newPreviews.map((preview, i) => (
                      <img key={i} src={preview} alt="Preview" className="h-full w-auto object-cover rounded-lg snap-center shrink-0" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-primary-foreground/85">
                    <Upload className="w-6 h-6" />
                    <span className="font-body text-[11px]">Toque para adicionar fotos</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesChange(e, false)} />
            </label>

            <input
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Nome do produto"
              className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <textarea
              value={newDescricao}
              onChange={(e) => setNewDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newPreco}
                onChange={(e) => setNewPreco(e.target.value)}
                placeholder="Preço (ex: 49.90)"
                type="number"
                step="0.01"
                className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              <div className="relative">
                <Package className="absolute left-3 top-3 h-4 w-4 text-primary-foreground/60" />
                <input
                  value={newEstoque}
                  onChange={(e) => setNewEstoque(e.target.value)}
                  placeholder="Estoque"
                  type="number"
                  className="w-full min-w-0 pl-9 pr-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 min-w-0 pt-2">
              <button
                onClick={addProduto}
                disabled={uploading || !newNome || !newPreco}
                className="w-full min-w-0 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all disabled:opacity-50"
              >
                {uploading ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={resetNewForm}
                className="w-full min-w-0 py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/75 font-body text-[12px] hover:text-primary-foreground/95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Products list */}
      {produtos.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-8 h-8 text-primary-foreground/10 mx-auto mb-2" />
          <p className="font-body text-[13px] text-primary-foreground/95">Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {produtos.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                p.ativo
                  ? "bg-primary-foreground/[0.03] border-primary-foreground/[0.06]"
                  : "bg-primary-foreground/[0.01] border-primary-foreground/[0.03] opacity-50"
              }`}
            >
              {editing === p.id ? (
                <div className="p-4 space-y-3 min-w-0">
                  <label className="block w-full cursor-pointer">
                    <div className="aspect-video rounded-xl border-2 border-dashed border-primary-foreground/10 bg-primary-foreground/[0.03] flex items-center justify-center overflow-hidden">
                      {editPreviews.length > 0 ? (
                        <div className="flex overflow-x-auto w-full h-full gap-2 p-2 snap-x">
                          {editPreviews.map((preview, i) => (
                            <img key={i} src={preview} alt="Preview" className="h-full w-auto object-cover rounded-lg snap-center shrink-0" />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-primary-foreground/85">
                          <Image className="w-5 h-5" />
                          <span className="font-body text-[10px]">Alterar fotos</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesChange(e, true)} />
                  </label>
                  <input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Nome do produto"
                    className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                  <textarea
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    placeholder="Descrição"
                    rows={2}
                    className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={editPreco}
                      onChange={(e) => setEditPreco(e.target.value)}
                      placeholder="Preço"
                      type="number"
                      step="0.01"
                      className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
                    />
                    <div className="relative">
                      <Package className="absolute left-3 top-2.5 h-3.5 w-3.5 text-primary-foreground/60" />
                      <input
                        value={editEstoque}
                        onChange={(e) => setEditEstoque(e.target.value)}
                        placeholder="Estoque"
                        type="number"
                        className="w-full min-w-0 pl-8 pr-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
                    <button
                      onClick={() => saveEdit(p.id)}
                      disabled={uploading || !editNome || !editPreco}
                      className="min-w-0 px-3 py-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/20 transition-all font-body text-[12px] disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 inline mr-1" />
                      {uploading ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-3 py-2 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/95 hover:text-primary-foreground/85 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-primary-foreground/[0.03]">
                    {p.imagens && p.imagens.length > 0 ? (
                      <img src={p.imagens[0]} alt={p.nome} className="w-full h-full object-cover" />
                    ) : p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-primary-foreground/10" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[13px] font-medium text-primary-foreground truncate">{p.nome}</p>
                    {p.descricao && (
                      <p className="font-body text-[10px] text-primary-foreground/95 truncate">{p.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="font-body text-[14px] font-semibold text-gold">
                        R$ {p.preco.toFixed(2).replace(".", ",")}
                      </p>
                      <div className="flex items-center gap-1 bg-primary-foreground/5 px-2 py-0.5 rounded-full">
                        <Package className="w-3 h-3 text-primary-foreground/60" />
                        <span className="font-body text-[10px] text-primary-foreground/80">{p.estoque || 0} unid.</span>
                      </div>
                      {p.imagens && p.imagens.length > 1 && (
                        <div className="flex items-center gap-1 bg-primary-foreground/5 px-2 py-0.5 rounded-full">
                          <Image className="w-3 h-3 text-primary-foreground/60" />
                          <span className="font-body text-[10px] text-primary-foreground/80">{p.imagens.length} fotos</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(p.id)}
                      className={`w-10 h-6 rounded-full relative transition-all duration-200 ${p.ativo ? "bg-gold" : "bg-primary-foreground/10"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${p.ativo ? "left-4" : "left-0.5"}`}
                      />
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 rounded-lg hover:bg-primary-foreground/[0.06] text-primary-foreground/95 hover:text-primary-foreground/95 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <BinButton size="sm" onClick={() => removeProduto(p.id)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProdutosTab;
