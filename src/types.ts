export interface ImportedContact {
  nome: string;
  telefone: string;
}

export interface Cliente {
  id: string;
  userId: string;
  name: string;
  nome?: string; // Legacy
  phone: string;
  notes: string;
}

export interface Terapia {
  id: string;
  userId: string;
  name: string;
  nome?: string; // Legacy
  price: number;
  valor?: number; // Legacy
  duration: number;
  duracao?: number; // Legacy
}

export interface Agendamento {
  id: string;
  userId: string;
  clientId: string;
  date: string;
  time: string;
  packageId?: string;
  therapy_item_id?: string;
  therapy_name?: string;
  status_pagamento?: 'Pendente' | 'Pago';
  status_atendimento?: 'Agendado' | 'Realizado' | 'Cancelado';
  tipoAtendimento?: 'Mensal Fixo' | 'Avulso';
  valorCobrado?: number;
  desconto?: number;
  dataPagamento?: string;
  formaPagamento?: string;
  bancoPagamento?: string;
}

export interface ItemPacote {
  id: string;
  terapiaId: string;
  quantidadeTotal: number;
  quantidadeRestante: number;
  valorSessao: number;
  valorDesconto?: number;
}

export interface PagamentoInfo {
  status: 'Pendente' | 'Pago';
  data?: string;
  forma?: string;
  banco?: string;
  valor: number;
}

export interface Pacote {
  id: string;
  userId: string;
  clienteId: string;
  mesReferencia: string;
  tipoPacote: 'Mensal Fixo' | 'Avulso';
  price: number;
  payment_method: string;
  payment_date: string;
  therapies?: ItemPacote[] | string; // JSON
  observacoes?: string;
  // Old fields kept for compatibility
  valorFinal?: number;
  historicoPagamento?: PagamentoInfo | string; // JSON
  formaPagamento?: string;
  dataPagamento?: string;
  bancoPagamento?: string;
  itens?: ItemPacote[] | string; // JSON
}

export interface Transacao {
  id: string;
  userId: string;
  cliente_id?: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  status: 'recebido' | 'pendente' | 'pago';
  data: string;
  data_pagamento?: string;
  pacoteId?: string;
  agendamentoId?: string;
  descricao?: string;
  forma_pagamento?: string;
}

export interface Bloqueio {
  id: string;
  userId: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  motivo: string;
}



