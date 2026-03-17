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
  nome: string;
  telefone: string;
  observacoes?: string;
}

// ======================
// TERAPIA
// ======================

export interface Terapia {
  id: string;
  nome: string;
  valor: number;
  duracao: number;
}

// ======================
// PACOTE
// ======================

export interface ItemPacote {
  id: string;
  terapiaId: string;
  quantidadeTotal: number;
  quantidadeRestante: number;
}

export interface Pacote {
  id: string;
  clienteId: string;
  mesReferencia: string;
  tipoPacote: string;
  valorFinal: number;
  status: 'Ativo' | 'Concluido';
  statusPagamento?: 'Pendente' | 'Pago';
  dataPagamento?: string;
  formaPagamento?: string;
  bancoPagamento?: string;
  itens: ItemPacote[];
  observacoes?: string;
}

// ======================
// AGENDAMENTO
// ======================

export interface Agendamento {
  id: string;
  clienteId: string;
  pacoteId?: string;
  terapiaId: string;
  data: string;
  hora: string;
  statusAtendimento: 'Agendado' | 'Realizado' | 'Cancelado';
  statusPagamento: 'Pendente' | 'Pago';
  valorCobrado: number;
  dataPagamento?: string;
  formaPagamento?: string;
  bancoPagamento?: string;
}

// ======================
// FINANCEIRO
// ======================

export interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'Receita' | 'Despesa';
  status: 'Pago' | 'Pendente';
  metodo?: string;
  categoria?: string;
  pacoteId?: string;
  agendamentoId?: string;
}

// ======================
// BLOQUEIO
// ======================

export interface Bloqueio {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;
}
