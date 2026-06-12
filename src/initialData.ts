import { 
  Cliente, Terapia, Agendamento, Pacote, Transacao, 
  Despesa, Bloqueio, ItemPacote, StatusAtendimento, 
  StatusPagamento, Segmento, CategoriaDespesa, FormaPagamento,
  createTimestamps, ValorCentavos, paraCentavos
} from './types';

// ======================
// HELPERS UTILITÁRIOS
// ======================

/**
 * Cria um cliente com timestamps automáticos
 */
const createCliente = (data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>): Cliente => ({
  ...data,
  ...createTimestamps()
});

/**
 * Cria uma terapia com timestamps e conversão automática de valor para centavos
 */
const createTerapia = (data: Omit<Terapia, 'id' | 'createdAt' | 'updatedAt' | 'valorCentavos'> & { valor: number }): Terapia => ({
  ...data,
  valorCentavos: paraCentavos(data.valor),
  ...createTimestamps()
});

/**
 * Cria um agendamento com timestamps e status padrão
 */
const createAgendamento = (data: Omit<Agendamento, 'id' | 'createdAt' | 'updatedAt'>): Agendamento => ({
  ...data,
  statusAtendimento: data.statusAtendimento || 'Disponivel',
  statusPagamento: data.statusPagamento || 'Pendente',
  valorCobradoCentavos: data.valorCobradoCentavos || paraCentavos(0),
  ...createTimestamps()
});

/**
 * Cria um pacote com timestamps e status padrão
 */
const createPacote = (data: Omit<Pacote, 'id' | 'createdAt' | 'updatedAt'>): Pacote => ({
  ...data,
  status: data.status || 'Ativo',
  statusPagamento: data.statusPagamento || 'Pendente',
  valorFinalCentavos: data.valorFinalCentavos || paraCentavos(0),
  ...createTimestamps()
});

/**
 * Cria uma transação com timestamps e valores em centavos
 */
const createTransacao = (data: Omit<Transacao, 'id' | 'createdAt' | 'updatedAt' | 'valorCentavos'> & { valor?: number }): Transacao => ({
  ...data,
  valorCentavos: data.valorCentavos || (data.valor ? paraCentavos(data.valor) : paraCentavos(0)),
  status: data.status || 'Pendente',
  segmento: data.segmento || 'holistica',
  ...createTimestamps()
});

/**
 * Cria uma despesa com timestamps e valores em centavos
 */
const createDespesa = (data: Omit<Despesa, 'id' | 'createdAt' | 'updatedAt' | 'valorCentavos'> & { valor?: number }): Despesa => ({
  ...data,
  valorCentavos: data.valorCentavos || (data.valor ? paraCentavos(data.valor) : paraCentavos(0)),
  segmento: data.segmento || 'holistica',
  ...createTimestamps()
});

/**
 * Cria um bloqueio com timestamps
 */
const createBloqueio = (data: Omit<Bloqueio, 'id' | 'createdAt' | 'updatedAt'>): Bloqueio => ({
  ...data,
  ...createTimestamps()
});

// ======================
// DADOS INICIAIS - CLIENTES
// ======================

export const INITIAL_CLIENTES: Cliente[] = [
  createCliente({
    id: "1773408188456",
    nome: "Andreza",
    telefone: "+55 (16) 99963-7420",
    observacoes: "Andreza Gregório\nDN:\nAraraquara/SP",
    email: undefined,
    cpf: undefined,
    dataNascimento: undefined,
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408253096",
    nome: "Amanda",
    telefone: "+55 (14) 99822-9743",
    observacoes: "Amanda Leticia Bento Dias\nDN: 05/03/1994\nOurinhos/SP",
    dataNascimento: "1994-03-05",
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408420265",
    nome: "Ana Paula",
    telefone: "+44 7541648981",
    observacoes: "Ana Paula Alessandro\nDN 21/06/1969\nLondres/UK",
    dataNascimento: "1969-06-21",
    tags: ['internacional'],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408497152",
    nome: "Ivone",
    telefone: "+55 (11) 99956-7127",
    observacoes: "Ivone Fernandes Alves\nDN 08/07/1948\nSantos/SP",
    dataNascimento: "1948-07-08",
    tags: ['senior'],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408612254",
    nome: "Márcia",
    telefone: "+55 (11) 98388-3879",
    observacoes: "Márcia Eloísa Silva Monteiro\nDN 24/11/1972\nGuararema/SP",
    dataNascimento: "1972-11-24",
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408796451",
    nome: "Rosemeire",
    telefone: "+55 (16) 99414-9085",
    observacoes: "Rosemeire Rodrigues dos Santos Lancelotti\nDN 16/01/1984\nSão Carlos/SP",
    dataNascimento: "1984-01-16",
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408936330",
    nome: "Anne",
    telefone: "+44 7752188938",
    observacoes: "Anne Caroline Lins Bezerra\nDN 24/07/\nLondres/UK",
    tags: ['internacional'],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773408991874",
    nome: "Cindia",
    telefone: "+55 (16) 98250-2610",
    observacoes: "Cindia Lancelotti\nDN 26/10/1987\nSão Carlos/SP",
    dataNascimento: "1987-10-26",
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773409057738",
    nome: "Maria Aparecida",
    telefone: "+55 (14) 99706-6353",
    observacoes: "Maria Aparecida da Silva\nDN 31/08/1979\nOurinhos/SP",
    dataNascimento: "1979-08-31",
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  }),
  createCliente({
    id: "1773409119145",
    nome: "Isabel",
    telefone: "+55 (16) 99744-5647",
    observacoes: "Isabel Cristina Silva Nepomuceno\nDN 11/10/1969\nAraraquara/SP",
    dataNascimento: "1969-10-11",
    tags: [],
    stats: { totalAgendamentos: 0, totalGasto: 0 }
  })
];

// ======================
// DADOS INICIAIS - TERAPIAS
// ======================

export const INITIAL_TERAPIAS: Terapia[] = [
  createTerapia({
    id: "1773410592031",
    nome: "Alinhamento chakras",
    valor: 70,
    duracao: 15,
    descricao: "Equilíbrio e alinhamento dos centros energéticos",
    categoria: "Energética",
    cor: "#8B5CF6",
    icone: "✨",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: true,
      exigePagamentoAntecipado: false
    }
  }),
  createTerapia({
    id: "1773410607847",
    nome: "Cartomancia",
    valor: 120,
    duracao: 50,
    descricao: "Leitura de cartas para orientação e autoconhecimento",
    categoria: "Oracular",
    cor: "#EC4899",
    icone: "🔮",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: true,
      exigePagamentoAntecipado: true
    }
  }),
  createTerapia({
    id: "1773410624723",
    nome: "Biomagnetismo",
    valor: 60,
    duracao: 20,
    descricao: "Terapia com ímãs para reequilíbrio do campo energético",
    categoria: "Terapêutico",
    cor: "#10B981",
    icone: "🧲",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: true,
      exigePagamentoAntecipado: false,
      bufferAposSessaoMinutos: 5
    }
  }),
  createTerapia({
    id: "1773410782282",
    nome: "Ativação de gráficos",
    valor: 70,
    duracao: 5,
    descricao: "Ativação remota ou presencial de gráficos radiestésicos",
    categoria: "Radiestesia",
    cor: "#F59E0B",
    icone: "📐",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: false,
      exigePagamentoAntecipado: true
    }
  }),
  createTerapia({
    id: "1773411090916",
    nome: "Pesquisa radiestésica",
    valor: 20,
    duracao: 15,
    descricao: "Análise energética com pêndulo e gráficos",
    categoria: "Radiestesia",
    cor: "#6366F1",
    icone: "🔍",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: true,
      exigePagamentoAntecipado: false
    }
  }),
  createTerapia({
    id: "1773411230312",
    nome: "Limpeza/Banimento",
    valor: 80,
    duracao: 10,
    descricao: "Rituais de limpeza energética e proteção",
    categoria: "Proteção",
    cor: "#EF4444",
    icone: "🛡️",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: true,
      exigePagamentoAntecipado: false
    }
  }),
  createTerapia({
    id: "1773411287942",
    nome: "Chakras/Bio Pets",
    valor: 80,
    duracao: 20,
    descricao: "Tratamento energético para animais de estimação",
    categoria: "Pets",
    cor: "#14B8A6",
    icone: "🐾",
    ativo: true,
    configuracoes: {
      permitePacote: true,
      permiteAvulso: true,
      exigePagamentoAntecipado: false
    }
  })
];

// ======================
// DADOS INICIAIS - PACOTES (Exemplos para testes)
// ======================

export const INITIAL_PACOTES: Pacote[] = [
  // Pacote mensal de exemplo - Cliente: Andreza
  createPacote({
    id: "pkg_andreza_jun2024",
    clienteId: "1773408188456",
    mesReferencia: "2024-06",
    tipoPacote: "Mensal Premium",
    valorFinalCentavos: paraCentavos(350),
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2024-06-01",
    formaPagamento: "PIX",
    itens: [
      {
        id: "item_001",
        terapiaId: "1773410607847", // Cartomancia
        quantidadeTotal: 2,
        quantidadeRestante: 1,
        valorUnitarioCentavos: paraCentavos(120),
        observacoes: "Sessões mensais de orientação"
      },
      {
        id: "item_002",
        terapiaId: "1773410592031", // Alinhamento chakras
        quantidadeTotal: 4,
        quantidadeRestante: 4,
        valorUnitarioCentavos: paraCentavos(70),
        observacoes: "Manutenção energética semanal"
      }
    ],
    observacoes: "Pacote renovado automaticamente",
    isMensalFixo: true,
    renovacaoAutomatica: true,
    stats: {
      sessoesUtilizadas: 1,
      sessoesTotais: 6,
      percentualUso: 16.67,
      valorPorSessaoCentavos: paraCentavos(58.33)
    }
  }),
  // Pacote avulso de exemplo - Cliente: Amanda
  createPacote({
    id: "pkg_amanda_jun2024",
    clienteId: "1773408253096",
    mesReferencia: "2024-06",
    tipoPacote: "Combo Relaxamento",
    valorFinalCentavos: paraCentavos(200),
    status: "Ativo",
    statusPagamento: "Pendente",
    itens: [
      {
        id: "item_003",
        terapiaId: "1773410624723", // Biomagnetismo
        quantidadeTotal: 3,
        quantidadeRestante: 3,
        valorUnitarioCentavos: paraCentavos(60)
      },
      {
        id: "item_004",
        terapiaId: "1773411230312", // Limpeza/Banimento
        quantidadeTotal: 1,
        quantidadeRestante: 1,
        valorUnitarioCentavos: paraCentavos(80)
      }
    ],
    observacoes: "Primeiro pacote da cliente",
    descontoAplicadoCentavos: paraCentavos(20),
    codigoPromocional: "PRIMEIRA10"
  })
];

// ======================
// DADOS INICIAIS - AGENDAMENTOS (Exemplos para testes)
// ======================

export const INITIAL_AGENDAMENTOS: Agendamento[] = [
  // Agendamento confirmado - Andreza - Cartomancia
  createAgendamento({
    id: "ag_001",
    clienteId: "1773408188456",
    pacoteId: "pkg_andreza_jun2024",
    itemPacoteId: "item_001",
    terapiaId: "1773410607847",
    data: "2024-06-15",
    hora: "14:00",
    statusAtendimento: "Agendado",
    statusPagamento: "Pago",
    valorCobradoCentavos: paraCentavos(120),
    dataPagamento: "2024-06-01",
    formaPagamento: "PIX",
    observacoesCliente: "Prefere atendimento online",
    lembretes: {
      whatsappEnviado: true,
      whatsappData: "2024-06-14T10:00:00Z",
      confirmacaoCliente: true,
      confirmacaoData: "2024-06-14T10:05:00Z"
    }
  }),
  // Sessão disponível do pacote - Andreza - Chakras
  createAgendamento({
    id: "ag_002",
    clienteId: "1773408188456",
    pacoteId: "pkg_andreza_jun2024",
    itemPacoteId: "item_002",
    terapiaId: "1773410592031",
    data: "",
    hora: "",
    statusAtendimento: "Disponivel",
    statusPagamento: "Pendente",
    valorCobradoCentavos: paraCentavos(70)
  }),
  // Agendamento concluído - Ivone - Biomagnetismo
  createAgendamento({
    id: "ag_003",
    clienteId: "1773408497152",
    terapiaId: "1773410624723",
    data: "2024-06-10",
    hora: "10:30",
    statusAtendimento: "Concluido",
    statusPagamento: "Pago",
    valorCobradoCentavos: paraCentavos(60),
    dataPagamento: "2024-06-10",
    formaPagamento: "Dinheiro",
    observacoesInternas: "Cliente relatou melhora significativa na dor cervical"
  }),
  // Agendamento cancelado - Anne - Cartomancia
  createAgendamento({
    id: "ag_004",
    clienteId: "1773408936330",
    terapiaId: "1773410607847",
    data: "2024-06-12",
    hora: "16:00",
    statusAtendimento: "Cancelado",
    statusPagamento: "Reembolsado",
    valorCobradoCentavos: paraCentavos(120),
    observacoesCliente: "Viagem de última hora",
    historico: [
      {
        data: "2024-06-05T09:00:00Z",
        alteracao: "Agendamento criado",
        usuario: "sistema"
      },
      {
        data: "2024-06-11T14:30:00Z",
        alteracao: "Cancelado por solicitação da cliente - reembolso processado",
        usuario: "admin"
      }
    ]
  }),
  // Sessões disponíveis para novo pacote - Amanda
  ...[1, 2, 3].map(i => createAgendamento({
    id: `ag_amanda_bio_${i}`,
    clienteId: "1773408253096",
    pacoteId: "pkg_amanda_jun2024",
    itemPacoteId: "item_003",
    terapiaId: "1773410624723",
    data: "",
    hora: "",
    statusAtendimento: "Disponivel",
    statusPagamento: "Pendente",
    valorCobradoCentavos: paraCentavos(60)
  })),
  createAgendamento({
    id: `ag_amanda_limpeza_1`,
    clienteId: "1773408253096",
    pacoteId: "pkg_amanda_jun2024",
    itemPacoteId: "item_004",
    terapiaId: "1773411230312",
    data: "",
    hora: "",
    statusAtendimento: "Disponivel",
    statusPagamento: "Pendente",
    valorCobradoCentavos: paraCentavos(80)
  })
];

// ======================
// DADOS INICIAIS - TRANSAÇÕES FINANCEIRAS
// ======================

export const INITIAL_TRANSACOES: Transacao[] = [
  // Receita - Pacote Andreza (Pago)
  createTransacao({
    id: "txn_001",
    descricao: "Pacote Mensal Premium - Andreza",
    valor: 350,
    data: "2024-06-01",
    tipo: "Receita",
    status: "Pago",
    metodo: "PIX",
    categoria: "Pacotes",
    pacoteId: "pkg_andreza_jun2024",
    segmento: "holistica",
    tags: ["pacote", "mensal", "pix"],
    conciliado: true,
    conciliadoEm: "2024-06-01T15:30:00Z"
  }),
  // Receita - Sessão Avulsa Ivone (Pago)
  createTransacao({
    id: "txn_002",
    descricao: "Biomagnetismo - Ivone Fernandes",
    valor: 60,
    data: "2024-06-10",
    tipo: "Receita",
    status: "Pago",
    metodo: "Dinheiro",
    categoria: "Sessões Avulsas",
    agendamentoId: "ag_003",
    segmento: "holistica"
  }),
  // Despesa - Material de escritório
  createTransacao({
    id: "txn_003",
    descricao: "Material para atendimento - velas, incensos",
    valor: 85.50,
    data: "2024-06-05",
    tipo: "Despesa",
    status: "Pago",
    metodo: "Cartão Débito",
    categoria: "Material",
    segmento: "holistica",
    tags: ["insumos", "atacado"]
  }),
  // Receita Pendente - Pacote Amanda
  createTransacao({
    id: "txn_004",
    descricao: "Combo Relaxamento - Amanda",
    valor: 200,
    data: "2024-06-08",
    dataVencimento: "2024-06-15",
    tipo: "Receita",
    status: "Pendente",
    categoria: "Pacotes",
    pacoteId: "pkg_amanda_jun2024",
    segmento: "holistica",
    tags: ["pendente", "primeiro-pacote"]
  }),
  // Despesa Fixa - Internet
  createTransacao({
    id: "txn_005",
    descricao: "Internet - Plano Empresarial",
    valor: 120,
    data: "2024-06-01",
    tipo: "Despesa",
    status: "Pago",
    metodo: "Boleto",
    categoria: "Fixo",
    segmento: "holistica",
    recorrente: {
      enabled: true,
      frequencia: "mensal",
      proximaVencimento: "2024-07-01"
    }
  })
];

// ======================
// DADOS INICIAIS - DESPESAS (Detalhadas)
// ======================

export const INITIAL_DESPESAS: Despesa[] = [
  createDespesa({
    id: "desp_001",
    descricao: "Compra de cristais e pedras",
    valor: 150,
    data: "2024-06-03",
    categoria: "Material",
    formaPagamento: "PIX",
    observacao: "Fornecedor: Loja Cristal Luz",
    segmento: "holistica",
    fornecedor: "Cristal Luz",
    tags: ["insumos", "estoque"]
  }),
  createDespesa({
    id: "desp_002",
    descricao: "Assinatura software de agenda",
    valor: 49.90,
    data: "2024-06-01",
    categoria: "Fixo",
    formaPagamento: "Cartão Crédito",
    segmento: "holistica",
    fornecedor: "Lunara Tech",
    recorrente: {
      enabled: true,
      frequencia: "mensal",
      proximaVencimento: "2024-07-01"
    },
    tags: ["software", "assinatura"]
  }),
  createDespesa({
    id: "desp_003",
    descricao: "Manutenção site institucional",
    valor: 200,
    data: "2024-06-10",
    categoria: "Outros",
    formaPagamento: "Transferência",
    segmento: "holistica",
    fornecedor: "Freelancer Web",
    tags: ["marketing", "site"]
  })
];

// ======================
// DADOS INICIAIS - BLOQUEIOS DE AGENDA
// ======================

export const INITIAL_BLOQUEIOS: Bloqueio[] = [
  createBloqueio({
    id: "blq_001",
    data: "2024-06-20",
    horaInicio: "12:00",
    horaFim: "14:00",
    motivo: "Almoço e descanso",
    tipo: "Pessoal",
    afetaAgendaPublica: true,
    cor: "#FCD34D"
  }),
  createBloqueio({
    id: "blq_002",
    data: "2024-06-25",
    horaInicio: "00:00",
    horaFim: "23:59",
    motivo: "Dia de estudos e capacitação",
    tipo: "Eventos",
    afetaAgendaPublica: true,
    cor: "#A78BFA"
  }),
  // Bloqueio recorrente: Toda segunda-feira de manhã
  createBloqueio({
    id: "blq_recorrente_001",
    data: "2024-06-03",
    horaInicio: "08:00",
    horaFim: "12:00",
    motivo: "Administração e planejamento semanal",
    tipo: "Pessoal",
    recorrente: {
      enabled: true,
      frequencia: "semanal",
      diasSemana: [1], // Segunda-feira
      termino: "2024-12-31"
    },
    afetaAgendaPublica: false, // Não aparece para clientes, só bloqueia internamente
    cor: "#94A3B8"
  })
];

// ======================
// FUNÇÕES DE MIGRAÇÃO E UTILITÁRIOS
// ======================

/**
 * Migra dados antigos (formato legacy) para o novo formato
 * @param dadosLegacy Dados no formato antigo
 * @returns Dados migrados para o novo formato
 */
export const migrarDadosLegacy = (dadosLegacy: any) => {
  try {
    // Migrar terapias: valor → valorCentavos
    if (Array.isArray(dadosLegacy.terapias)) {
      dadosLegacy.terapias = dadosLegacy.terapias.map((t: any) => ({
        ...t,
        valorCentavos: t.valorCentavos || (t.valor ? paraCentavos(t.valor) : 0),
        valor: undefined // Remover campo antigo
      }));
    }
    
    // Migrar pacotes: valorFinal → valorFinalCentavos
    if (Array.isArray(dadosLegacy.pacotes)) {
      dadosLegacy.pacotes = dadosLegacy.pacotes.map((p: any) => ({
        ...p,
        valorFinalCentavos: p.valorFinalCentavos || (p.valorFinal ? paraCentavos(p.valorFinal) : 0),
        valorFinal: undefined,
        itens: p.itens?.map((item: any) => ({
          ...item,
          valorUnitarioCentavos: item.valorUnitarioCentavos || (item.valorUnitario ? paraCentavos(item.valorUnitario) : 0),
          valorUnitario: undefined
        }))
      }));
    }
    
    // Migrar agendamentos: valorCobrado → valorCobradoCentavos
    if (Array.isArray(dadosLegacy.agendamentos)) {
      dadosLegacy.agendamentos = dadosLegacy.agendamentos.map((a: any) => ({
        ...a,
        valorCobradoCentavos: a.valorCobradoCentavos || (a.valorCobrado ? paraCentavos(a.valorCobrado) : 0),
        valorCobrado: undefined
      }));
    }
    
    // Migrar transações e despesas
    const migrarValorCentavos = (obj: any) => ({
      ...obj,
      valorCentavos: obj.valorCentavos || (obj.valor ? paraCentavos(obj.valor) : 0),
      valor: undefined
    });
    
    if (Array.isArray(dadosLegacy.transacoes)) {
      dadosLegacy.transacoes = dadosLegacy.transacoes.map(migrarValorCentavos);
    }
    
    if (Array.isArray(dadosLegacy.despesas)) {
      dadosLegacy.despesas = dadosLegacy.despesas.map(migrarValorCentavos);
    }
    
    console.log('✓ Migração de dados legacy concluída');
    return dadosLegacy;
  } catch (error) {
    console.error('✗ Erro na migração de dados:', error);
    return dadosLegacy;
  }
};

/**
 * Gera dados de teste aleatórios para desenvolvimento
 * @param options Configurações de geração
 */
export const gerarDadosTeste = (options: {
  clientes?: number;
  agendamentos?: number;
  pacotes?: number;
  dataInicio?: string;
  dataFim?: string;
} = {}) => {
  const {
    clientes = 5,
    agendamentos = 20,
    pacotes = 3,
    dataInicio = "2024-06-01",
    dataFim = "2024-06-30"
  } = options;

  const dados: {
    clientes: Cliente[];
    agendamentos: Agendamento[];
    pacotes: Pacote[];
  } = { clientes: [], agendamentos: [], pacotes: [] };

  // Gerar clientes de teste
  const nomes = ["Teste Silva", "Demo Santos", "Exemplo Oliveira", "Sample Costa", "Mock Ferreira"];
  for (let i = 0; i < clientes; i++) {
    dados.clientes.push(createCliente({
      id: `test_cliente_${i}`,
      nome: `${nomes[i % nomes.length]} ${i + 1}`,
      telefone: `+55 (11) 9${String(90000 + i).padStart(5, '0')}-${String(1000 + i).padStart(4, '0')}`,
      tags: ['teste'],
      stats: { totalAgendamentos: 0, totalGasto: 0 }
    }));
  }

  // Gerar pacotes de teste
  for (let i = 0; i < pacotes; i++) {
    const clienteId = dados.clientes[i % clientes].id;
    const terapia = INITIAL_TERAPIAS[i % INITIAL_TERAPIAS.length];
    
    dados.pacotes.push(createPacote({
      id: `test_pacote_${i}`,
      clienteId,
      mesReferencia: "2024-06",
      tipoPacote: "Pacote Teste",
      valorFinalCentavos: paraCentavos(terapia.valorCentavos * 4 * 0.9), // 10% desconto
      status: "Ativo",
      itens: [{
        id: `item_test_${i}`,
        terapiaId: terapia.id,
        quantidadeTotal: 4,
        quantidadeRestante: 4,
        valorUnitarioCentavos: terapia.valorCentavos
      }],
      tags: ['teste']
    }));
  }

  // Gerar agendamentos de teste
  const statusPool: StatusAtendimento[] = ['Agendado', 'Concluido', 'Disponivel', 'Cancelado'];
  for (let i = 0; i < agendamentos; i++) {
    const cliente = dados.clientes[i % clientes];
    const terapia = INITIAL_TERAPIAS[i % INITIAL_TERAPIAS.length];
    const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const hora = `${String(Math.floor(Math.random() * 10) + 9).padStart(2, '0')}:00`;
    
    dados.agendamentos.push(createAgendamento({
      id: `test_ag_${i}`,
      clienteId: cliente.id,
      terapiaId: terapia.id,
      data: `2024-06-${dia}`,
      hora,
      statusAtendimento: statusPool[i % statusPool.length],
      statusPagamento: Math.random() > 0.3 ? 'Pago' : 'Pendente',
      valorCobradoCentavos: terapia.valorCentavos,
      tags: ['teste']
    }));
  }

  return dados;
};

/**
 * Limpa todos os dados de teste (entidades com tag 'teste')
 */
export const limparDadosTeste = <T extends { tags?: string[] }>(entities: T[]): T[] => {
  return entities.filter(e => !e.tags?.includes('teste'));
};

// ======================
// EXPORTAÇÃO CONSOLIDADA
// ======================

export const INITIAL_DATA = {
  clientes: INITIAL_CLIENTES,
  terapias: INITIAL_TERAPIAS,
  pacotes: INITIAL_PACOTES,
  agendamentos: INITIAL_AGENDAMENTOS,
  transacoes: INITIAL_TRANSACOES,
  despesas: INITIAL_DESPESAS,
  bloqueios: INITIAL_BLOQUEIOS
} as const;

// Helper para obter dados iniciais com opção de incluir dados de teste
export const getInitialData = (includeTestData = false) => {
  if (!includeTestData) {
    return INITIAL_DATA;
  }
  
  const testData = gerarDadosTeste();
  return {
    clientes: [...INITIAL_CLIENTES, ...testData.clientes],
    terapias: INITIAL_TERAPIAS,
    pacotes: [...INITIAL_PACOTES, ...testData.pacotes],
    agendamentos: [...INITIAL_AGENDAMENTOS, ...testData.agendamentos],
    transacoes: INITIAL_TRANSACOES,
    despesas: INITIAL_DESPESAS,
    bloqueios: INITIAL_BLOQUEIOS
  };
};