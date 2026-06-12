// ======================
// UTILITÁRIOS DE TIPO
// ======================

/**
 * Timestamps padrão para entidades rastreáveis
 */
export interface Timestamps {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Entidade base com ID e timestamps
 */
export interface BaseEntity extends Timestamps {
  id: string;
  archived?: boolean; // Soft delete: true = oculto, mas preservado
  metadata?: Record<string, any>; // Campo para extensões futuras
}

/**
 * Valor monetário em centavos para evitar problemas de precisão
 * Ex: R$ 150,00 = 15000
 */
export type ValorCentavos = number;

/**
 * Conversão segura de centavos para reais (string formatada)
 */
export const formatarValor = (centavos: ValorCentavos): string => {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

/**
 * Conversão de reais para centavos (inteiro)
 */
export const paraCentavos = (reais: number): ValorCentavos => {
  return Math.round(reais * 100);
};

// ======================
// ENUMS E UNION TYPES
// ======================

/**
 * Status de atendimento de um agendamento
 */
export type StatusAtendimento = 
  | 'Agendado'    // Confirmado com cliente
  | 'Concluido'   // Atendimento realizado
  | 'Cancelado'   // Cancelado por cliente ou profissional
  | 'Disponivel'  // Slot livre no pacote
  | 'NoShow';     // Cliente não compareceu (novo)

/**
 * Status de pagamento
 */
export type StatusPagamento = 
  | 'Pendente' 
  | 'Pago' 
  | 'Parcial'     // Novo: pagamento parcial
  | 'Reembolsado'; // Novo: para cancelamentos com reembolso

/**
 * Tipo de transação financeira
 */
export type TipoTransacao = 'Receita' | 'Despesa' | 'Transferência' | 'Ajuste';

/**
 * Categoria de despesa
 */
export type CategoriaDespesa = 
  | 'Material' 
  | 'Ferramenta' 
  | 'Fixo' 
  | 'Marketing'   // Novo
  | 'Impostos'    // Novo
  | 'Outros';

/**
 * Método/forma de pagamento
 */
export type FormaPagamento = 
  | 'Dinheiro' 
  | 'PIX' 
  | 'Cartão Débito' 
  | 'Cartão Crédito' 
  | 'Transferência' 
  | 'Boleto'
  | 'Outros';

/**
 * Tipo de profissional (para DadosProfissionais)
 */
export type TipoProfissional = 'Autônomo' | 'MEI' | 'Empresa' | 'Outros';

/**
 * Segmento de atuação do app
 */
export type Segmento = 'holistica' | 'freelancer' | 'ambos';

/**
 * DDI de países suportados
 */
export type CountryCode = 
  | '+55'  // Brasil
  | '+351' // Portugal
  | '+1'   // EUA/Canadá
  | '+244' // Angola
  | '+258' // Moçambique
  | '+238' // Cabo Verde
  | '+245' // Guiné-Bissau
  | '+239' // São Tomé e Príncipe
  | '+670' // Timor-Leste
  | '+54'  // Argentina
  | '+595' // Paraguai
  | '+598'; // Uruguai

// ======================
// TYPE GUARDS (Validação em Runtime)
// ======================

/**
 * Verifica se um valor é um StatusAtendimento válido
 */
export const isValidStatusAtendimento = (value: any): value is StatusAtendimento => {
  return ['Agendado', 'Concluido', 'Cancelado', 'Disponivel', 'NoShow'].includes(value);
};

/**
 * Verifica se um valor é um StatusPagamento válido
 */
export const isValidStatusPagamento = (value: any): value is StatusPagamento => {
  return ['Pendente', 'Pago', 'Parcial', 'Reembolsado'].includes(value);
};

/**
 * Verifica se uma string é uma data ISO 8601 válida
 */
export const isValidISODate = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString().split('T')[0];
};

/**
 * Verifica se uma string é um horário válido (HH:mm)
 */
export const isValidTime = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
};

/**
 * Verifica se um telefone brasileiro é válido (formato simples)
 */
export const isValidBrazilianPhone = (phone: string): boolean => {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  // Telefone brasileiro: 10-11 dígitos (com DDD)
  return cleaned.length >= 10 && cleaned.length <= 11;
};

/**
 * Verifica se um CPF é válido (algoritmo oficial)
 */
export const isValidCPF = (cpf: string): boolean => {
  if (!cpf) return true; // CPF é opcional
  
  // Remove formatação
  const clean = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos e não é sequência repetida
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  return digit1 === parseInt(clean[9]) && digit2 === parseInt(clean[10]);
};

// ======================
// BASE E UTILITÁRIOS
// ======================

export interface ImportedContact {
  nome: string;
  telefone: string;
  // Campos adicionais que podem vir da API de contatos
  email?: string;
  photo?: string;
  source?: 'contacts-api' | 'manual' | 'import';
}

// ======================
// CLIENTE
// ======================

export interface Cliente extends BaseEntity {
  nome: string;
  telefone: string;
  telefoneAlternativo?: string;
  email?: string;
  cpf?: string;
  dataNascimento?: string; // ISO Date
  observacoes?: string;
  
  // Novos campos para melhor gestão
  tags?: string[]; // Ex: ['vip', 'novo', 'indicado']
  fotoUrl?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  preferencias?: {
    lembreteWhatsApp?: boolean;
    lembreteSMS?: boolean;
    lembreteEmail?: boolean;
    horarioPreferencial?: string; // Ex: "manha", "tarde", "noite"
  };
  
  // Estatísticas calculadas (opcional, pode ser gerado on-demand)
  stats?: {
    totalAgendamentos: number;
    totalGasto: ValorCentavos;
    ultimoAgendamento?: string;
    frequenciaMediaDias?: number;
  };
}

export interface DadosProfissionais extends BaseEntity {
  nomeRazaoSocial: string;
  nomeEmpresa?: string;
  tipoProfissional: TipoProfissional;
  cpfCnpj: string;
  registroProfissional: string; // CRM, COREN, etc.
  registroOrgao?: string; // Conselho emissor
  endereco: string;
  telefone: string;
  email?: string;
  site?: string;
  redesSociais?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  horarioAtendimento?: {
    segunda?: { inicio: string; fim: string; ativo: boolean };
    terca?: { inicio: string; fim: string; ativo: boolean };
    quarta?: { inicio: string; fim: string; ativo: boolean };
    quinta?: { inicio: string; fim: string; ativo: boolean };
    sexta?: { inicio: string; fim: string; ativo: boolean };
    sabado?: { inicio: string; fim: string; ativo: boolean };
    domingo?: { inicio: string; fim: string; ativo: boolean };
  };
}

// ======================
// TERAPIA
// ======================

export interface Terapia extends BaseEntity {
  nome: string;
  descricao?: string;
  valorCentavos: ValorCentavos; // Usar centavos para precisão
  duracaoMinutos: number;
  categoria?: string; // Ex: 'Relaxamento', 'Terapêutico', 'Estética'
  cor?: string; // Para identificação visual na agenda
  icone?: string; // Nome do ícone ou emoji
  ativo?: boolean; // Permite desativar sem excluir histórico
  ordem?: number; // Para ordenação customizada na UI
  
  // Configurações específicas
  configuracoes?: {
    permitePacote?: boolean;
    permiteAvulso?: boolean;
    exigePagamentoAntecipado?: boolean;
    bufferAposSessaoMinutos?: number; // Tempo de limpeza/preparação
  };
}

// ======================
// PACOTE
// ======================

export interface ItemPacote {
  id: string;
  terapiaId: string;
  quantidadeTotal: number;
  quantidadeRestante: number;
  // Novos campos para melhor controle
  valorUnitarioCentavos?: ValorCentavos; // Para relatórios de custo
  validadeDias?: number; // Dias para usar este item específico
  observacoes?: string;
}

export interface Pacote extends BaseEntity {
  clienteId: string;
  mesReferencia: string; // Formato: YYYY-MM
  tipoPacote: string;
  valorFinalCentavos: ValorCentavos; // Usar centavos
  status: 'Ativo' | 'Concluido' | 'Cancelado' | 'Expirado';
  statusPagamento?: StatusPagamento;
  dataPagamento?: string; // ISO Date
  formaPagamento?: FormaPagamento;
  bancoPagamento?: string;
  itens: ItemPacote[];
  observacoes?: string;
  isMensalFixo?: boolean;
  
  // Novos campos para gestão avançada
  dataVencimento?: string; // Para pacotes com validade específica
  renovacaoAutomatica?: boolean;
  clienteAutorizouRenovacao?: boolean;
  descontoAplicadoCentavos?: ValorCentavos;
  codigoPromocional?: string;
  
  // Metadados de renovação
  pacoteOriginalId?: string; // Se foi renovado, referencia o anterior
  renovadoParaId?: string; // Se renovou, referencia o próximo
  
  // Estatísticas do pacote
  stats?: {
    sessoesUtilizadas: number;
    sessoesTotais: number;
    percentualUso: number;
    valorPorSessaoCentavos: ValorCentavos;
  };
}

// ======================
// AGENDAMENTO
// ======================

export interface Agendamento extends BaseEntity {
  clienteId: string;
  pacoteId?: string;
  itemPacoteId?: string;
  terapiaId: string;
  data: string; // ISO Date: YYYY-MM-DD
  hora: string; // Formato: HH:mm
  statusAtendimento: StatusAtendimento;
  statusPagamento: StatusPagamento;
  valorCobradoCentavos: ValorCentavos; // Usar centavos
  dataPagamento?: string;
  formaPagamento?: FormaPagamento;
  bancoPagamento?: string;
  
  // Novos campos para gestão completa da agenda
  duracaoMinutos?: number; // Override da duração padrão da terapia
  local?: string; // Se diferente do endereço padrão
  profissionalResponsavel?: string; // Para equipes com múltiplos profissionais
  observacoesCliente?: string; // Anotações do cliente
  observacoesInternas?: string; // Anotações privadas do profissional
  
  // Controle de lembretes e confirmações
  lembretes?: {
    whatsappEnviado?: boolean;
    whatsappData?: string;
    smsEnviado?: boolean;
    emailEnviado?: boolean;
    confirmacaoCliente?: boolean;
    confirmacaoData?: string;
  };
  
  // Histórico de alterações (para auditoria)
  historico?: Array<{
    data: string;
    alteracao: string;
    usuario?: string;
  }>;
  
  // Campos para integração com calendário externo
  calendarEventId?: string; // Google Calendar, Outlook, etc.
  syncEnabled?: boolean;
  
  // Para agendamentos recorrentes
  recorrencia?: {
    enabled: boolean;
    frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal';
    intervalo?: number; // Ex: a cada 2 semanas
    termino?: string; // Data final da recorrência
    serieId?: string; // ID que agrupa os agendamentos da mesma série
  };
}

// ======================
// FINANCEIRO
// ======================

export interface Despesa extends BaseEntity {
  descricao: string;
  valorCentavos: ValorCentavos;
  data: string; // ISO Date
  categoria: CategoriaDespesa;
  formaPagamento?: FormaPagamento;
  observacao?: string;
  segmento: Segmento;
  
  // Novos campos para controle financeiro completo
  fornecedor?: string;
  notaFiscal?: {
    numero: string;
    serie: string;
    emitente: string;
    url?: string;
  };
  centroCusto?: string; // Para análise de custos por área
  recorrente?: {
    enabled: boolean;
    frequencia: 'mensal' | 'trimestral' | 'anual';
    proximaVencimento?: string;
  };
  anexos?: Array<{
    nome: string;
    url: string;
    tipo: string;
  }>;
}

export interface Transacao extends BaseEntity {
  descricao: string;
  valorCentavos: ValorCentavos;
  data: string; // ISO Date da transação
  dataVencimento?: string; // Para pendências
  tipo: TipoTransacao;
  status: StatusPagamento;
  metodo?: FormaPagamento;
  categoria?: string;
  pacoteId?: string;
  agendamentoId?: string;
  segmento: Segmento;
  
  // Novos campos para conciliação bancária
  contaBancaria?: string;
  referenciaExterna?: string; // ID da transação no banco/gateway
  conciliado?: boolean;
  conciliadoEm?: string;
  
  // Para parcelamentos
  parcelamento?: {
    totalParcelas: number;
    parcelaAtual: number;
    transacaoOriginalId?: string;
  };
  
  // Tags para filtros avançados
  tags?: string[];
}

// ======================
// BLOQUEIO
// ======================

export interface Bloqueio extends BaseEntity {
  data: string; // ISO Date
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  motivo: string;
  
  // Novos campos para bloqueios mais flexíveis
  tipo?: 'Pessoal' | 'Férias' | 'Manutenção' | 'Eventos' | 'Outros';
  recorrente?: {
    enabled: boolean;
    frequencia: 'diaria' | 'semanal' | 'mensal';
    diasSemana?: number[]; // 0=Domingo, 1=Segunda, etc.
    termino?: string;
  };
  afetaAgendaPublica?: boolean; // Se aparece como "indisponível" para clientes
  cor?: string; // Para identificação visual
}

// ======================
// NOTIFICAÇÕES E ALERTAS
// ======================

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  data: string;
  lida?: boolean;
  acao?: {
    label: string;
    handler: string; // Nome da função a ser chamada
    params?: any;
  };
  expiraEm?: string; // ISO Date
}

// ======================
// CONFIGURAÇÕES DO APP
// ======================

export interface AppSettings {
  tema: 'light' | 'dark' | 'system';
  idioma: 'pt-BR' | 'pt-PT' | 'en';
  fusoHorario: string; // Ex: 'America/Sao_Paulo'
  
  // Preferências de agenda
  agenda: {
    horarioInicio: string; // HH:mm
    horarioFim: string; // HH:mm
    intervaloPadraoMinutos: number;
    mostrarDiasSemana: number[]; // 0-6
    visualizacaoPadrao: 'dia' | 'semana' | 'mes';
  };
  
  // Preferências de notificações
  notificacoes: {
    lembreteAgendamentoHoras: number[]; // [24, 2, 0.5] = 24h, 2h, 30min antes
    canais: {
      push: boolean;
      whatsapp: boolean;
      email: boolean;
      sms: boolean;
    };
    confirmarComparecimento: boolean;
  };
  
  // Preferências financeiras
  financeiro: {
    moeda: 'BRL' | 'USD' | 'EUR';
    mostrarCentavos: boolean;
    diaFechamentoMensal: number; // 1-31
    categoriasPersonalizadas?: string[];
  };
  
  // Integrações
  integracoes: {
    googleCalendar?: {
      enabled: boolean;
      calendarId?: string;
      syncDirection: 'bidirectional' | 'to-app' | 'from-app';
    };
    whatsapp?: {
      enabled: boolean;
      templateConfirmacao?: string;
      templateLembrete?: string;
    };
  };
  
  // Backup e segurança
  backup: {
    automatico: boolean;
    frequencia: 'diario' | 'semanal' | 'mensal';
    incluirAnexos: boolean;
  };
  
  // Avançado
  advanced: {
    debugMode: boolean;
    exportarLogs: boolean;
    allowBetaFeatures: boolean;
  };
}

// ======================
// TIPOS PARA UI E COMPONENTES
// ======================

/**
 * Opções para filtros de listagem
 */
export interface FilterOptions {
  search?: string;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  clienteId?: string;
  terapiaId?: string;
  tags?: string[];
  sortBy?: keyof any;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Resultado paginado para APIs/listagens
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Opções de exportação de relatórios
 */
export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  fields: string[];
  filters?: FilterOptions;
  includeMetadata?: boolean;
}

// ======================
// EVENTOS DO SISTEMA (para arquitetura baseada em eventos)
// ======================

export type AppEvent = 
  | { type: 'CLIENTE_CREATED'; payload: { cliente: Cliente } }
  | { type: 'CLIENTE_UPDATED'; payload: { cliente: Cliente; changes: Partial<Cliente> } }
  | { type: 'CLIENTE_DELETED'; payload: { clienteId: string } }
  | { type: 'AGENDAMENTO_CREATED'; payload: { agendamento: Agendamento } }
  | { type: 'AGENDAMENTO_UPDATED'; payload: { agendamento: Agendamento; changes: Partial<Agendamento> } }
  | { type: 'AGENDAMENTO_CANCELLED'; payload: { agendamentoId: string; motivo: string } }
  | { type: 'PAGAMENTO_CONFIRMADO'; payload: { transacaoId: string; valor: ValorCentavos } }
  | { type: 'PACOTE_RENOVADO'; payload: { pacoteAntigo: Pacote; pacoteNovo: Pacote } }
  | { type: 'BACKUP_REALIZADO'; payload: { timestamp: string; size: number } }
  | { type: 'ERROR_OCCURRED'; payload: { error: string; context: any } };

// ======================
// FUNÇÕES UTILITÁRIAS EXPORTADAS
// ======================

/**
 * Cria timestamps padrão para novas entidades
 */
export const createTimestamps = (): Timestamps => ({
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

/**
 * Atualiza o timestamp de updatedAt
 */
export const updateTimestamp = <T extends Timestamps>(entity: T): T => ({
  ...entity,
  updatedAt: new Date().toISOString()
});

/**
 * Gera um ID único (fallback para ambientes sem crypto.randomUUID)
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes mais antigos
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
};

/**
 * Clona uma entidade com novos timestamps (para histórico/versões)
 */
export const cloneWithTimestamps = <T extends BaseEntity>(entity: T): T => ({
  ...entity,
  id: generateId(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {
    ...entity.metadata,
    clonedFrom: entity.id,
    clonedAt: new Date().toISOString()
  }
});

/**
 * Verifica se uma entidade está "ativa" (não arquivada)
 */
export const isActive = <T extends { archived?: boolean }>(entity: T): boolean => {
  return !entity.archived;
};

/**
 * Filtra entidades ativas de um array
 */
export const filterActive = <T extends { archived?: boolean }>(entities: T[]): T[] => {
  return entities.filter(isActive);
};

/**
 * Ordena entidades por data (mais recente primeiro)
 */
export const sortByDate = <T extends { createdAt: string }>(entities: T[]): T[] => {
  return [...entities].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Agrupa entidades por uma chave específica
 */
export const groupBy = <T, K extends keyof any>(
  array: T[], 
  keyGetter: (item: T) => K
): Map<K, T[]> => {
  return array.reduce((map, item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
    return map;
  }, new Map<K, T[]>());
};