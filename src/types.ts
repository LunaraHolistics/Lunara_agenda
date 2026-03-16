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
  client_id: string;
  date: string;
  time: string;
  package_id?: string;
  therapy_item_id?: string;
  therapy_name?: string;
  statusPagamento?: 'Pendente' | 'Pago';
  statusAtendimento?: 'Agendado' | 'Realizado' | 'Cancelado';
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
  valorFinal: number;
  valorDescontoTotal?: number;
  historicoPagamento: PagamentoInfo | string; // JSON
  formaPagamento?: string;
  dataPagamento?: string;
  bancoPagamento?: string;
  observacoes?: string;
  itens: ItemPacote[] | string; // JSON
}

export interface Bloqueio {
  id: string;
  userId: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  motivo: string;
}



