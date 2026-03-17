import { Cliente, Terapia, Agendamento, Pacote, Transacao } from './types';

export const INITIAL_CLIENTES: Cliente[] = [
  {id: "1773408188456", nome: "Andreza", telefone: "+55 (16) 99963-7420", observacoes: "Andreza Gregório\nDN:\nAraraquara/SP"},
  {id: "1773408253096", nome: "Amanda", telefone: "+55 (14) 99822-9743", observacoes: "Amanda Leticia Bento Dias\nDN: 05/03/1994\nOurinhos/SP"},
  {id: "1773408420265", nome: "Ana Paula", telefone: "+44 7541648981", observacoes: "Ana Paula Alessandro\nDN 21/06/1969\nLondres/UK"},
  {id: "1773408497152", nome: "Ivone", telefone: "+55 (11) 99956-7127", observacoes: "Ivone Fernandes Alves\nDN 08/07/1948\nSantos/SP"},
  {id: "1773408612254", nome: "Márcia", telefone: "+55 (11) 98388-3879", observacoes: "Márcia Eloísa Silva Monteiro\nDN 24/11/1972\nGuararema/SP"},
  {id: "1773408796451", nome: "Rosemeire", telefone: "+55 (16) 99414-9085", observacoes: "Rosemeire Rodrigues dos Santos Lancelotti\nDN 16/01/1984\nSão Carlos/SP"},
  {id: "1773408936330", nome: "Anne", telefone: "+44 7752188938", observacoes: "Anne Caroline Lins Bezerra\nDN 24/07/\nLondres/UK"},
  {id: "1773408991874", nome: "Cindia", telefone: "+55 (16) 98250-2610", observacoes: "Cindia Lancelotti\nDN 26/10/1987\nSão Carlos/SP"},
  {id: "1773409057738", nome: "Maria Aparecida", telefone: "+55 (14) 99706-6353", observacoes: "Maria Aparecida da Silva\nDN 31/08/1979\nOurinhos/SP"},
  {id: "1773409119145", nome: "Isabel", telefone: "+55 (16) 99744-5647", observacoes: "Isabel Cristina Silva Nepomuceno\nDN 11/10/1969\nAraraquara/SP"}
];

export const INITIAL_TERAPIAS: Terapia[] = [
  {id: "1773410592031", nome: "Alinhamento chakras", valor: 70, duracao: 15},
  {id: "1773410607847", nome: "Cartomancia", valor: 120, duracao: 50},
  {id: "1773410624723", nome: "Biomagnetismo", valor: 60, duracao: 20},
  {id: "1773410782282", nome: "Ativação de gráficos", valor: 70, duracao: 5},
  {id: "1773411090916", nome: "Pesquisa radiestésica", valor: 20, duracao: 15},
  {id: "1773411230312", nome: "Limpeza/Banimento", valor: 80, duracao: 10},
  {id: "1773411287942", nome: "Chakras/Bio Pets", valor: 80, duracao: 20}
];

export const INITIAL_PACOTES: Pacote[] = [
  {
    id: "1773410662985",
    clienteId: "1773408936330",
    mesReferencia: "2026-03",
    tipoPacote: "Fixo",
    valorFinal: 135,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-02",
    formaPagamento: "Transferência",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773410649991", terapiaId: "1773410592031", quantidadeTotal: 2, quantidadeRestante: 0},
      {id: "1773410653479", terapiaId: "1773410607847", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773410684138",
    clienteId: "1773408420265",
    mesReferencia: "2026-03",
    tipoPacote: "Fixo",
    valorFinal: 120,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-02",
    formaPagamento: "Transferência",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773410680112", terapiaId: "1773410592031", quantidadeTotal: 2, quantidadeRestante: 0},
      {id: "1773410682937", terapiaId: "1773410607847", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773410735962",
    clienteId: "1773409119145",
    mesReferencia: "2026-03",
    tipoPacote: "Fixo",
    valorFinal: 110,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-13",
    formaPagamento: "PIX",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773410734496", terapiaId: "1773410607847", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773410833714",
    clienteId: "1773408796451",
    mesReferencia: "2026-03",
    tipoPacote: "Fixo",
    valorFinal: 120,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-13",
    formaPagamento: "PIX",
    bancoPagamento: "Itaú",
    itens: [
      {id: "1773410822907", terapiaId: "1773410607847", quantidadeTotal: 1, quantidadeRestante: 0},
      {id: "1773410825874", terapiaId: "1773410782282", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773410935779",
    clienteId: "1773408612254",
    mesReferencia: "2026-03",
    tipoPacote: "Avulso",
    valorFinal: 220,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-13",
    formaPagamento: "PIX",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773410920730", terapiaId: "1773410782282", quantidadeTotal: 1, quantidadeRestante: 0},
      {id: "1773410927674", terapiaId: "1773410592031", quantidadeTotal: 2, quantidadeRestante: 2},
      {id: "1773411100828", terapiaId: "1773411090916", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773411150451",
    clienteId: "1773408188456",
    mesReferencia: "2026-03",
    tipoPacote: "Fixo",
    valorFinal: 180,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-13",
    formaPagamento: "PIX",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773411140118", terapiaId: "1773410592031", quantidadeTotal: 2, quantidadeRestante: 0},
      {id: "1773411145331", terapiaId: "1773410624723", quantidadeTotal: 2, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773411175172",
    clienteId: "1773408253096",
    mesReferencia: "2026-03",
    tipoPacote: "Avulso",
    valorFinal: 90,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-12",
    formaPagamento: "PIX",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773411172068", terapiaId: "1773410607847", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773411355173",
    clienteId: "1773409057738",
    mesReferencia: "2026-03",
    tipoPacote: "Avulso",
    valorFinal: 350,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-04",
    formaPagamento: "Crédito",
    bancoPagamento: "InfinitePay",
    itens: [
      {id: "1773411301836", terapiaId: "1773410782282", quantidadeTotal: 1, quantidadeRestante: 0},
      {id: "1773411305980", terapiaId: "1773411230312", quantidadeTotal: 1, quantidadeRestante: 0},
      {id: "1773411331452", terapiaId: "1773411287942", quantidadeTotal: 2, quantidadeRestante: 0},
      {id: "1773411348846", terapiaId: "1773410592031", quantidadeTotal: 1, quantidadeRestante: 0}
    ]
  },
  {
    id: "1773415856360",
    clienteId: "1773408497152",
    mesReferencia: "2026-03",
    tipoPacote: "Fixo",
    valorFinal: 80,
    status: "Ativo",
    statusPagamento: "Pago",
    dataPagamento: "2026-03-13",
    formaPagamento: "Transferência",
    bancoPagamento: "Banco do Brasil",
    itens: [
      {id: "1773415853223", terapiaId: "1773410592031", quantidadeTotal: 2, quantidadeRestante: 2}
    ]
  }
];

export const INITIAL_AGENDAMENTOS: Agendamento[] = [
  {id: "1773411422110", clienteId: "1773408253096", pacoteId: "1773411175172", terapiaId: "1773410607847", data: "2026-03-12", hora: "21:30", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 120},
  {id: "1773411461373", clienteId: "1773409057738", pacoteId: "1773411355173", terapiaId: "1773410782282", data: "2026-03-04", hora: "18:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411471127", clienteId: "1773409057738", pacoteId: "1773411355173", terapiaId: "1773411230312", data: "2026-03-13", hora: "19:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 80},
  {id: "1773411485965", clienteId: "1773409057738", pacoteId: "1773411355173", terapiaId: "1773411287942", data: "2026-03-10", hora: "19:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 80},
  {id: "1773411497062", clienteId: "1773409057738", pacoteId: "1773411355173", terapiaId: "1773411287942", data: "2026-03-14", hora: "08:30", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 80},
  {id: "1773411509389", clienteId: "1773409057738", pacoteId: "1773411355173", terapiaId: "1773410592031", data: "2026-03-14", hora: "19:40", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411542080", clienteId: "1773408188456", pacoteId: "1773411150451", terapiaId: "1773410592031", data: "2026-03-03", hora: "20:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411558365", clienteId: "1773408188456", pacoteId: "1773411150451", terapiaId: "1773410624723", data: "2026-03-10", hora: "22:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 60},
  {id: "1773411568501", clienteId: "1773408188456", pacoteId: "1773411150451", terapiaId: "1773410592031", data: "2026-03-17", hora: "20:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411572757", clienteId: "1773408188456", pacoteId: "1773411150451", terapiaId: "1773410624723", data: "2026-03-24", hora: "20:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 60},
  {id: "1773411601989", clienteId: "1773408420265", pacoteId: "1773410684138", terapiaId: "1773410607847", data: "2026-03-03", hora: "20:30", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 120},
  {id: "1773411609349", clienteId: "1773408420265", pacoteId: "1773410684138", terapiaId: "1773410592031", data: "2026-03-14", hora: "08:40", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411621957", clienteId: "1773408420265", pacoteId: "1773410684138", terapiaId: "1773410592031", data: "2026-03-26", hora: "19:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411643301", clienteId: "1773408497152", pacoteId: "1773410700193", terapiaId: "1773410592031", data: "2026-03-14", hora: "08:50", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411648727", clienteId: "1773408497152", pacoteId: "1773410700193", terapiaId: "1773410592031", data: "2026-03-26", hora: "19:20", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411691717", clienteId: "1773408612254", pacoteId: "1773410935779", terapiaId: "1773410782282", data: "2026-03-06", hora: "20:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411766566", clienteId: "1773408612254", pacoteId: "1773410935779", terapiaId: "1773411090916", data: "2026-03-05", hora: "19:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 20},
  {id: "1773411787477", clienteId: "1773408796451", pacoteId: "1773410833714", terapiaId: "1773410607847", data: "2026-03-04", hora: "19:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 120},
  {id: "1773411803749", clienteId: "1773408796451", pacoteId: "1773410833714", terapiaId: "1773410782282", data: "2026-03-14", hora: "19:10", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411816165", clienteId: "1773408936330", pacoteId: "1773410662985", terapiaId: "1773410592031", data: "2026-03-14", hora: "09:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411824326", clienteId: "1773408936330", pacoteId: "1773410662985", terapiaId: "1773410592031", data: "2026-03-26", hora: "19:10", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 70},
  {id: "1773411835206", clienteId: "1773408936330", pacoteId: "1773410662985", terapiaId: "1773410607847", data: "2026-03-03", hora: "21:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 120},
  {id: "1773411861158", clienteId: "1773409119145", pacoteId: "1773410735962", terapiaId: "1773410607847", data: "2026-03-04", hora: "20:00", statusAtendimento: 'Agendado', statusPagamento: 'Pago', valorCobrado: 120}
];

export const INITIAL_TRANSACOES: Transacao[] = [
  {id: "1773412811052", descricao: "Entrada compra Analisador QRM-998 Bioressonância Magnética", valor: 540, data: "2026-03-12", tipo: 'Despesa', status: 'Pago'},
  {id: "1773412845589", descricao: "Parcela cartão Analisador QRM-998 Bioressonância Magnética", valor: 40, data: "2026-04-05", tipo: 'Despesa', status: 'Pago'},
  {id: "1773410663000", descricao: "Venda de pacote: 2026-03 (Fixo)", valor: 135, data: "2026-03-13", tipo: 'Receita', status: 'Pago'}
];
