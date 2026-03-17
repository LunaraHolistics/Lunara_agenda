// ======================
// BASE
// ======================

export interface ImportedContact {
  nome: string;
  telefone: string;
}

// ======================
// CLIENTE
// ======================

export interface Cliente {
  id: string;
  userId: string;

  // padrão
  name: string;
  phone: string;
  notes: string;

  // legado
  /** @deprecated usar "name" */
  nome?: string;
}

// ======================
// TERAPIA
// ======================

export interface Terapia {
  id: string;
  userId: string;

  // padrão
  name: string;
  price: number;
  duration: number;

  // legado
  /** @deprecated usar "name" */
  nome?: string;

  /** @deprecated usar "price" */
  valor?: number;

  /** @deprecated usar "duration" */
  duracao?: number;
}

// ======================
// AGENDAMENTO
// ======================

export type StatusPagamento = 'Pendente' | 'Pago';
export type StatusAtendimento = 'Agendado' | 'Realizado' | 'Cancelado';

export interface Agendamento {
  id: string;
  userId: string;

  // padrão
  clientId: string;
  date: string;
  time: string;

  statusPagamento: StatusPagamento;
  statusAtendimento: StatusAtendimento;

  // opcionais de negócio
  packageId?: string;
  therapyItemId?: string;
  therapyName?: string;
  tipoAtendimento?: 'Mensal Fixo' | 'Avulso';
  valorCobrado?: number;
  desconto?: number;

  dataPagamento?: string;
  formaPagamento?: string;
  bancoPagamento?: string;

  // compatibilidade com backend (snake_case)
  /** @deprecated usar "statusPagamento" */
  status_pagamento?: StatusPagamento;

  /** @deprecated usar "statusAtendimento" */
  status_atendimento?: StatusAtendimento;

  /** @deprecated usar "therapyItemId" */
  therapy_item_id?: string;

  /** @deprecated usar "therapyName" */
  therapy_name?: string;
}

// ======================
// PACOTE
// ======================

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

  // padrão
  clienteId: string;
  mesReferencia: string;
  tipoPacote: 'Mensal Fixo' | 'Avulso';
  price: number;

  paymentMethod?: string;
  paymentDate?: string;

  therapies?: ItemPacote[]; // padrão ideal
  status?: 'Ativo' | 'Pendente' | 'Finalizado' | 'Cancelado';
  observacoes?: string;

  // legado (compatibilidade)
  /** @deprecated usar "paymentMethod" */
  payment_method?: string;

  /** @deprecated usar "paymentDate" */
  payment_date?: string;

  /** @deprecated usar "therapies" */
  itens?: ItemPacote[] | string;

  /** @deprecated usar objeto tipado */
  historicoPagamento?: PagamentoInfo | string;

  /** @deprecated */
  valorFinal?: number;

  /** @deprecated */
  formaPagamento?: string;

  /** @deprecated */
  dataPagamento?: string;

  /** @deprecated */
  bancoPagamento?: string;
}

// ======================
// FINANCEIRO
// ======================

export interface Transacao {
  id: string;
  userId: string;

  tipo: 'receita' | 'despesa';
  valor: number;
  status: 'recebido' | 'pendente' | 'pago';

  data: string;

  clienteId?: string;
  pacoteId?: string;
  agendamentoId?: string;

  descricao?: string;
  formaPagamento?: string;
  banco?: string;

  dataPagamento?: string;

  // legado
  /** @deprecated usar "clienteId" */
  cliente_id?: string;

  /** @deprecated usar "formaPagamento" */
  forma_pagamento?: string;

  /** @deprecated usar "dataPagamento" */
  data_pagamento?: string;
}

// ======================
// BLOQUEIO
// ======================

export interface Bloqueio {
  id: string;
  userId: string;

  data: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;

  // legado
  /** @deprecated usar "horaInicio" */
  hora_inicio?: string;

  /** @deprecated usar "horaFim" */
  hora_fim?: string;
}