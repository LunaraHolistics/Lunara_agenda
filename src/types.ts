export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  ddi?: string;
  status: boolean;
  observacoes: string;
}

export interface ImportedContact {
  nome: string;
  telefone: string;
}

export interface CountryDDI {
  code: string;
  flag: string;
  name: string;
}

export interface Terapia {
  id: string;
  nome: string;
  valor: number;
  duracao: number;
}

export interface Agendamento {
  id: string;
  clienteId: string;
  terapiaId: string; // Mantido para compatibilidade, será o ID da primeira terapia
  terapiaIds?: string[]; // Lista de IDs de terapias para agendamentos múltiplos
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  valorCobrado: number;
  desconto: number;
  statusPagamento: 'Pago' | 'Pendente';
  statusAtendimento: 'Agendado' | 'Realizado' | 'Cancelado';
  pacoteId?: string; // Vincula o agendamento a um pacote
  itemPacoteId?: string; // Vincula o agendamento a um item específico do pacote
  tipoAtendimento?: 'Mensal Fixo' | 'Avulso';
  formaPagamento?: string;
  bancoPagamento?: string;
  dataPagamento?: string;
}

export interface ItemPacote {
  id: string; // ID único do item no pacote
  terapiaId: string;
  quantidade: number;
  quantidadeRestante: number; // Saldo de sessões
  tipoDesconto: 'fixo' | 'porcentagem';
  valorDesconto: number;
}

export interface PagamentoInfo {
  status: 'Pendente' | 'Pago';
  valor: number;
  data?: string;
  forma?: string; // 'PIX' | 'Crédito' | 'Débito' | 'Transferência' | 'Dinheiro'
  banco?: string;
}

export interface Pacote {
  id: string;
  clienteId: string;
  mesReferencia: string; // Formato YYYY-MM
  itens: ItemPacote[];
  valorBruto: number;
  valorDescontoTotal: number;
  valorFinal: number;
  dataCriacao: string; // ISO string
  tipoCobranca?: 'Por Atendimento' | 'Total';
  tipoPacote: 'Mensal Fixo' | 'Avulso';
  historicoPagamento?: PagamentoInfo;
  observacoes?: string;
}

export interface Bloqueio {
  id: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  motivo: string;
}



