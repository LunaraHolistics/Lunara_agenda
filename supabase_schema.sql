-- ============================================================================
-- LUNARA AGENDA - SUPABASE SCHEMA
-- ============================================================================
-- ⚠️ Schema de referência para futura sincronização com Supabase
-- Atualmente o app é local-first e não usa este schema
-- Para ativar cloud sync: configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
-- ============================================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Tabela: Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  ddi TEXT DEFAULT '+55',
  email TEXT,
  cpf TEXT,
  data_nascimento DATE,
  observacoes TEXT,
  tags TEXT[],
  foto_url TEXT,
  endereco JSONB,
  preferencias JSONB,
  stats JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Terapias
CREATE TABLE IF NOT EXISTS terapias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_centavos INTEGER NOT NULL, -- Armazenar em centavos para precisão
  duracao_minutos INTEGER NOT NULL,
  categoria TEXT,
  cor TEXT,
  icone TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  configuracoes JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Pacotes
CREATE TABLE IF NOT EXISTS pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  mes_referencia TEXT NOT NULL, -- Formato: YYYY-MM
  tipo_pacote TEXT NOT NULL CHECK (tipo_pacote IN ('Mensal Fixo', 'Avulso')),
  valor_final_centavos INTEGER NOT NULL,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Concluido', 'Cancelado', 'Expirado')),
  status_pagamento TEXT DEFAULT 'Pendente' CHECK (status_pagamento IN ('Pendente', 'Pago', 'Parcial', 'Reembolsado')),
  data_pagamento TIMESTAMPTZ,
  forma_pagamento TEXT,
  banco_pagamento TEXT,
  itens JSONB NOT NULL, -- Array de ItemPacote
  observacoes TEXT,
  is_mensal_fixo BOOLEAN DEFAULT FALSE,
  data_vencimento TIMESTAMPTZ,
  renovacao_automatica BOOLEAN DEFAULT FALSE,
  desconto_aplicado_centavos INTEGER DEFAULT 0,
  codigo_promocional TEXT,
  pacote_original_id UUID REFERENCES pacotes(id),
  renovado_para_id UUID REFERENCES pacotes(id),
  stats JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  pacote_id UUID REFERENCES pacotes(id) ON DELETE SET NULL,
  item_pacote_id UUID,
  terapia_id UUID REFERENCES terapias(id),
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status_atendimento TEXT DEFAULT 'Agendado' CHECK (status_atendimento IN ('Agendado', 'Concluido', 'Cancelado', 'Disponivel', 'NoShow')),
  status_pagamento TEXT DEFAULT 'Pendente' CHECK (status_pagamento IN ('Pendente', 'Pago', 'Parcial', 'Reembolsado')),
  valor_cobrado_centavos INTEGER NOT NULL,
  data_pagamento TIMESTAMPTZ,
  forma_pagamento TEXT,
  banco_pagamento TEXT,
  duracao_minutos INTEGER,
  local TEXT,
  profissional_responsavel TEXT,
  observacoes_cliente TEXT,
  observacoes_internas TEXT,
  lembretes JSONB,
  historico JSONB,
  calendar_event_id TEXT,
  sync_enabled BOOLEAN DEFAULT FALSE,
  recorrencia JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Transacoes (Financeiro)
CREATE TABLE IF NOT EXISTS transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL,
  data DATE NOT NULL,
  data_vencimento TIMESTAMPTZ,
  tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa', 'Transferência', 'Ajuste')),
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Pendente', 'Parcial', 'Reembolsado')),
  metodo TEXT,
  categoria TEXT,
  pacote_id UUID REFERENCES pacotes(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  segmento TEXT DEFAULT 'holistica' CHECK (segmento IN ('holistica', 'freelancer', 'ambos')),
  conta_bancaria TEXT,
  referencia_externa TEXT,
  conciliado BOOLEAN DEFAULT FALSE,
  conciliado_em TIMESTAMPTZ,
  parcelamento JSONB,
  tags TEXT[],
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Despesas
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Material', 'Ferramenta', 'Fixo', 'Marketing', 'Impostos', 'Outros')),
  forma_pagamento TEXT,
  observacao TEXT,
  segmento TEXT NOT NULL CHECK (segmento IN ('holistica', 'freelancer', 'ambos')),
  fornecedor TEXT,
  nota_fiscal JSONB,
  centro_custo TEXT,
  recorrente JSONB,
  anexos JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Bloqueios
CREATE TABLE IF NOT EXISTS bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  motivo TEXT NOT NULL,
  tipo TEXT DEFAULT 'Pessoal' CHECK (tipo IN ('Pessoal', 'Férias', 'Manutenção', 'Eventos', 'Outros')),
  recorrente JSONB,
  afeta_agenda_publica BOOLEAN DEFAULT TRUE,
  cor TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: Dados Profissionais
CREATE TABLE IF NOT EXISTS dados_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nome_razao_social TEXT NOT NULL,
  nome_empresa TEXT,
  tipo_profissional TEXT CHECK (tipo_profissional IN ('Autônomo', 'MEI', 'Empresa', 'Outros')),
  cpf_cnpj TEXT NOT NULL,
  registro_profissional TEXT,
  registro_orgao TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  redes_sociais JSONB,
  horario_atendimento JSONB,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(user_id, nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(user_id, telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_archived ON clientes(archived);

-- Terapias
CREATE INDEX IF NOT EXISTS idx_terapias_user_id ON terapias(user_id);
CREATE INDEX IF NOT EXISTS idx_terapias_ativo ON terapias(user_id, ativo);

-- Pacotes
CREATE INDEX IF NOT EXISTS idx_pacotes_user_id ON pacotes(user_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_cliente_id ON pacotes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_mes_referencia ON pacotes(user_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_pacotes_status ON pacotes(user_id, status);

-- Agendamentos
CREATE INDEX IF NOT EXISTS idx_agendamentos_user_id ON agendamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(user_id, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(user_id, status_atendimento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_pacote ON agendamentos(pacote_id);

-- Transacoes
CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(user_id, data);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(user_id, tipo);

-- Despesas
CREATE INDEX IF NOT EXISTS idx_despesas_user_id ON despesas(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(user_id, data);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(user_id, categoria);

-- Bloqueios
CREATE INDEX IF NOT EXISTS idx_bloqueios_user_id ON bloqueios(user_id);
CREATE INDEX IF NOT EXISTS idx_bloqueios_data ON bloqueios(user_id, data);

-- ============================================================================
-- TRIGGERS PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terapias_updated_at
  BEFORE UPDATE ON terapias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pacotes_updated_at
  BEFORE UPDATE ON pacotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transacoes_updated_at
  BEFORE UPDATE ON transacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bloqueios_updated_at
  BEFORE UPDATE ON bloqueios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dados_profissionais_updated_at
  BEFORE UPDATE ON dados_profissionais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE terapias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_profissionais ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: cada usuário vê apenas seus próprios dados
CREATE POLICY "users_view_own_clientes" ON clientes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_terapias" ON terapias
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_pacotes" ON pacotes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_agendamentos" ON agendamentos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_transacoes" ON transacoes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_despesas" ON despesas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_bloqueios" ON bloqueios
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_view_own_dados_profissionais" ON dados_profissionais
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNÇÕES UTILITÁRIAS
-- ============================================================================

-- Função para calcular estatísticas de um cliente
CREATE OR REPLACE FUNCTION get_cliente_stats(p_cliente_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_agendamentos', COUNT(*),
    'total_gasto_centavos', COALESCE(SUM(valor_cobrado_centavos), 0),
    'ultimo_agendamento', MAX(data),
    'frequencia_media_dias', 
      CASE 
        WHEN COUNT(*) > 1 THEN 
          EXTRACT(EPOCH FROM (MAX(data) - MIN(data))) / 86400 / (COUNT(*) - 1)
        ELSE NULL
      END
  )
  INTO v_stats
  FROM agendamentos
  WHERE cliente_id = p_cliente_id
    AND status_atendimento != 'Cancelado'
    AND archived = FALSE;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular saldo financeiro de um período
CREATE OR REPLACE FUNCTION get_saldo_periodo(
  p_user_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE (
  receitas_centavos BIGINT,
  despesas_centavos BIGINT,
  saldo_centavos BIGINT,
  pendente_centavos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'Receita' AND status = 'Pago' THEN valor_centavos ELSE 0 END), 0) AS receitas_centavos,
    COALESCE(SUM(CASE WHEN tipo = 'Despesa' AND status = 'Pago' THEN valor_centavos ELSE 0 END), 0) AS despesas_centavos,
    COALESCE(SUM(CASE WHEN tipo = 'Receita' AND status = 'Pago' THEN valor_centavos 
                      WHEN tipo = 'Despesa' AND status = 'Pago' THEN -valor_centavos ELSE 0 END), 0) AS saldo_centavos,
    COALESCE(SUM(CASE WHEN tipo = 'Receita' AND status = 'Pendente' THEN valor_centavos ELSE 0 END), 0) AS pendente_centavos
  FROM transacoes
  WHERE user_id = p_user_id
    AND data BETWEEN p_data_inicio AND p_data_fim
    AND archived = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (opcional - para desenvolvimento)
-- ============================================================================

-- Inserir dados de exemplo (apenas em ambiente de desenvolvimento)
-- Descomente e execute apenas se necessário:
/*
INSERT INTO terapias (user_id, nome, valor_centavos, duracao_minutos)
VALUES 
  (auth.uid(), 'Alinhamento de Chakras', 7000, 15),
  (auth.uid(), 'Cartomancia', 12000, 50),
  (auth.uid(), 'Biomagnetismo', 6000, 20);
*/