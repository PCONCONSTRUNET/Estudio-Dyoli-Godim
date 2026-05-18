export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cliente_nome: string | null
          created_at: string
          data_agendamento: string
          duracao_minutos: number
          foi_estendido: boolean
          forma_pagamento: string | null
          horario: string
          id: string
          observacao: string
          origem: string
          paid_at: string | null
          payer_name: string | null
          payment_id: string | null
          receipt_url: string | null
          servico: string
          status: string
          updated_at: string
          user_id: string
          valor: number
          valor_pago: number | null
          variacao: string | null
        }
        Insert: {
          cliente_nome?: string | null
          created_at?: string
          data_agendamento: string
          duracao_minutos?: number
          foi_estendido?: boolean
          forma_pagamento?: string | null
          horario: string
          id?: string
          observacao?: string
          origem?: string
          paid_at?: string | null
          payer_name?: string | null
          payment_id?: string | null
          receipt_url?: string | null
          servico: string
          status?: string
          updated_at?: string
          user_id: string
          valor: number
          valor_pago?: number | null
          variacao?: string | null
        }
        Update: {
          cliente_nome?: string | null
          created_at?: string
          data_agendamento?: string
          duracao_minutos?: number
          foi_estendido?: boolean
          forma_pagamento?: string | null
          horario?: string
          id?: string
          observacao?: string
          origem?: string
          paid_at?: string | null
          payer_name?: string | null
          payment_id?: string | null
          receipt_url?: string | null
          servico?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_pago?: number | null
          variacao?: string | null
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          cliente_nome: string
          created_at: string
          dados: Json
          id: string
          observacao: string
          origem: string
          pdf_path: string | null
          pdf_url: string | null
          revisada: boolean
          revisada_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          cliente_nome?: string
          created_at?: string
          dados?: Json
          id?: string
          observacao?: string
          origem?: string
          pdf_path?: string | null
          pdf_url?: string | null
          revisada?: boolean
          revisada_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Update: {
          cliente_nome?: string
          created_at?: string
          dados?: Json
          id?: string
          observacao?: string
          origem?: string
          pdf_path?: string | null
          pdf_url?: string | null
          revisada?: boolean
          revisada_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          agendamento_id: string
          comentario: string | null
          created_at: string
          id: string
          nota: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamento_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamento_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias_ordem: {
        Row: {
          created_at: string
          id: string
          nome: string
          ordem: number
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          scope: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      cliente_anotacoes: {
        Row: {
          agendamento_id: string | null
          created_at: string
          descricao: string
          fotos: string[]
          id: string
          produtos_usados: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          descricao?: string
          fotos?: string[]
          id?: string
          produtos_usados?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          descricao?: string
          fotos?: string[]
          id?: string
          produtos_usados?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cliente_fichas: {
        Row: {
          alergias: string
          contraindicacoes: string
          created_at: string
          id: string
          observacoes_gerais: string
          produtos_favoritos: string
          tipo_pele: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alergias?: string
          contraindicacoes?: string
          created_at?: string
          id?: string
          observacoes_gerais?: string
          produtos_favoritos?: string
          tipo_pele?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alergias?: string
          contraindicacoes?: string
          created_at?: string
          id?: string
          observacoes_gerais?: string
          produtos_favoritos?: string
          tipo_pele?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      configuracoes_lembretes: {
        Row: {
          ativo: boolean
          created_at: string
          horas_antes: number
          id: string
          mensagem: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          horas_antes?: number
          id?: string
          mensagem?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          horas_antes?: number
          id?: string
          mensagem?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          observacao: string | null
          pago: boolean
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          observacao?: string | null
          pago?: boolean
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          observacao?: string | null
          pago?: boolean
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      gateway_configs: {
        Row: {
          access_token: string | null
          ativo: boolean
          boleto_enabled: boolean
          cartao_enabled: boolean
          created_at: string
          gateway: string
          id: string
          pix_enabled: boolean
          public_key: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          ativo?: boolean
          boleto_enabled?: boolean
          cartao_enabled?: boolean
          created_at?: string
          gateway: string
          id?: string
          pix_enabled?: boolean
          public_key?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          ativo?: boolean
          boleto_enabled?: boolean
          cartao_enabled?: boolean
          created_at?: string
          gateway?: string
          id?: string
          pix_enabled?: boolean
          public_key?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      horarios_bloqueados: {
        Row: {
          created_at: string
          data: string
          horario: string
          id: string
          motivo: string | null
        }
        Insert: {
          created_at?: string
          data: string
          horario: string
          id?: string
          motivo?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          horario?: string
          id?: string
          motivo?: string | null
        }
        Relationships: []
      }
      horarios_funcionamento: {
        Row: {
          aberto: boolean
          created_at: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
          updated_at: string
        }
        Insert: {
          aberto?: boolean
          created_at?: string
          dia_semana: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          updated_at?: string
        }
        Update: {
          aberto?: boolean
          created_at?: string
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pagamento_historico: {
        Row: {
          acao: string
          agendamento_id: string
          autor_id: string | null
          autor_nome: string
          created_at: string
          id: string
          observacao: string
          status_anterior: string
          status_novo: string
          total: number
          valor_anterior: number
          valor_delta: number
          valor_novo: number
        }
        Insert: {
          acao?: string
          agendamento_id: string
          autor_id?: string | null
          autor_nome?: string
          created_at?: string
          id?: string
          observacao?: string
          status_anterior: string
          status_novo: string
          total?: number
          valor_anterior?: number
          valor_delta?: number
          valor_novo?: number
        }
        Update: {
          acao?: string
          agendamento_id?: string
          autor_id?: string | null
          autor_nome?: string
          created_at?: string
          id?: string
          observacao?: string
          status_anterior?: string
          status_novo?: string
          total?: number
          valor_anterior?: number
          valor_delta?: number
          valor_novo?: number
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          preco: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          data_nascimento: string | null
          id: string
          nome: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          data_nascimento?: string | null
          id: string
          nome: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          data_nascimento?: string | null
          id?: string
          nome?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          ativo: boolean
          created_at: string
          device_info: Json | null
          id: string
          player_id: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          device_info?: Json | null
          id?: string
          player_id: string
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          device_info?: Json | null
          id?: string
          player_id?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string
          duracao_minutos: number
          exclusivo_app: boolean
          id: string
          nome: string
          ordem: number
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          duracao_minutos?: number
          exclusivo_app?: boolean
          id?: string
          nome: string
          ordem?: number
          preco: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          duracao_minutos?: number
          exclusivo_app?: boolean
          id?: string
          nome?: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      servicos_app: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string
          duracao_minutos: number
          id: string
          nome: string
          ordem: number
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          duracao_minutos?: number
          id?: string
          nome: string
          ordem?: number
          preco: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          duracao_minutos?: number
          id?: string
          nome?: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
