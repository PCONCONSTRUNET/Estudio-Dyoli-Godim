-- Função SECURITY DEFINER para inserir produto sem precisar de auth session
-- Permite que o painel admin (anon) insira produtos contornando o RLS
CREATE OR REPLACE FUNCTION public.admin_insert_produto(
  p_nome TEXT,
  p_descricao TEXT,
  p_preco NUMERIC,
  p_estoque INTEGER,
  p_imagem_url TEXT,
  p_imagens TEXT[],
  p_ordem INTEGER
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.produtos (nome, descricao, preco, estoque, imagem_url, imagens, ativo, ordem)
  VALUES (p_nome, p_descricao, p_preco, p_estoque, p_imagem_url, p_imagens, true, p_ordem)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Permite que qualquer pessoa (anon e authenticated) chame a função
GRANT EXECUTE ON FUNCTION public.admin_insert_produto TO anon, authenticated;

-- Função para UPDATE de produto (editar)
CREATE OR REPLACE FUNCTION public.admin_update_produto(
  p_id UUID,
  p_nome TEXT,
  p_descricao TEXT,
  p_preco NUMERIC,
  p_estoque INTEGER,
  p_imagem_url TEXT,
  p_imagens TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.produtos
  SET nome = p_nome,
      descricao = p_descricao,
      preco = p_preco,
      estoque = p_estoque,
      imagem_url = p_imagem_url,
      imagens = p_imagens,
      updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_produto TO anon, authenticated;

-- Função para deletar produto
CREATE OR REPLACE FUNCTION public.admin_delete_produto(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.produtos WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_produto TO anon, authenticated;

-- Função para toggle ativo
CREATE OR REPLACE FUNCTION public.admin_toggle_produto_ativo(p_id UUID, p_ativo BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.produtos SET ativo = p_ativo, updated_at = now() WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_produto_ativo TO anon, authenticated;
