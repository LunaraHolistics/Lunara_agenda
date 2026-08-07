-- Script SQL para criação das tabelas no Supabase

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  ddi TEXT,
  status BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Terapias
CREATE TABLE IF NOT EXISTS terapias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  duracao INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Pacotes
CREATE TABLE IF NOT EXISTS pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL, -- YYYY-MM
  itens JSONB NOT NULL, -- Lista de ItemPacote
  valor_bruto NUMERIC NOT NULL,
  valor_desconto_total NUMERIC NOT NULL,
  valor_final NUMERIC NOT NULL,
  tipo_cobranca TEXT, -- 'Por Atendimento' | 'Total'
  tipo_pacote TEXT NOT NULL, -- 'Mensal Fixo' | 'Avulso'
  historico_pagamento JSONB, -- PagamentoInfo
  observacoes TEXT,
  data_criacao TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  terapia_id UUID REFERENCES terapias(id),
  terapia_ids UUID[], -- Array de IDs de terapias
  data_hora TIMESTAMPTZ NOT NULL,
  valor_cobrado NUMERIC NOT NULL,
  desconto NUMERIC DEFAULT 0,
  status_pagamento TEXT DEFAULT 'Pendente', -- 'Pago' | 'Pendente'
  status_atendimento TEXT DEFAULT 'Agendado', -- 'Agendado' | 'Realizado' | 'Cancelado'
  pacote_id UUID REFERENCES pacotes(id) ON DELETE SET NULL,
  item_pacote_id UUID,
  tipo_atendimento TEXT, -- 'Mensal Fixo' | 'Avulso'
  forma_pagamento TEXT,
  banco_pagamento TEXT,
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Bloqueios
CREATE TABLE IF NOT EXISTS bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pin TEXT,
  dark_mode BOOLEAN DEFAULT false,
  ultimo_backup TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE terapias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueios ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (cada usuário vê apenas seus dados)
CREATE POLICY "Users can only see their own clientes" ON clientes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own terapias" ON terapias FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own pacotes" ON pacotes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own agendamentos" ON agendamentos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own bloqueios" ON bloqueios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own configuracoes" ON configuracoes FOR ALL USING (auth.uid() = user_id);
